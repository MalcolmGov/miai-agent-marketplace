import { NextResponse } from "next/server";
import {
  consumeState,
  exchangeCode,
  isOAuthConnector,
  type OAuthConnectorId,
} from "@miai/connectors";
import { getPreset } from "@miai/presets";
import { appendAudit, getWorkspaceAgent, upsertWorkspaceAgent } from "@/lib/store";
import { publicAppBase } from "@miai/connectors";
import { trackDependency, trackEvent, trackException } from "@/lib/telemetry";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  const realmId = url.searchParams.get("realmId"); // QuickBooks

  const base = publicAppBase();

  if (err) {
    trackEvent("miai.oauth.callback", { success: false, error: err });
    return NextResponse.redirect(
      `${base}/install?oauth=error&message=${encodeURIComponent(err)}`,
    );
  }
  if (!code || !state) {
    trackEvent("miai.oauth.callback", { success: false, error: "missing_code" });
    return NextResponse.redirect(`${base}/install?oauth=error&message=missing_code`);
  }

  const payload = consumeState(state);
  if (!payload || !isOAuthConnector(payload.connectorId)) {
    trackEvent("miai.oauth.callback", { success: false, error: "invalid_state" });
    return NextResponse.redirect(`${base}/install?oauth=error&message=invalid_state`);
  }

  // Single-use: the signed state is stateless (HMAC + TTL), so record its nonce and reject a replay.
  // Done BEFORE exchangeCode, so a replayed callback never reaches the provider — the auth code is
  // spent at most once. Closes the ~15-minute state-replay/reuse window.
  const { consumeOAuthStateNonce } = await import("@/lib/oauth-state-store");
  if (!(await consumeOAuthStateNonce(payload.nonce, payload.exp))) {
    trackEvent("miai.oauth.callback", { success: false, error: "state_replay" });
    return NextResponse.redirect(`${base}/install?oauth=error&message=invalid_state`);
  }

  const exchangeStarted = Date.now();
  try {
    const token = await exchangeCode({
      connectorId: payload.connectorId as OAuthConnectorId,
      code,
      statePayload: payload,
    });
    trackDependency({
      name: "oauth.exchangeCode",
      type: "HTTP",
      target: payload.connectorId,
      durationMs: Date.now() - exchangeStarted,
      success: true,
      resultCode: 200,
      properties: { agentId: payload.agentId },
    });

    if (realmId) {
      token.meta.realmId = realmId;
      const { saveToken } = await import("@miai/connectors");
      await saveToken(token);
    }

    const rental = await getWorkspaceAgent(payload.workspaceId, payload.agentId);
    const connected = Array.from(
      new Set([...(rental?.connectedConnectors ?? []), payload.connectorId]),
    );
    const preset = getPreset(payload.agentId);
    const bindings = (preset?.bindings ?? rental?.bindings ?? []).map((b) =>
      b.connector === payload.connectorId
        ? {
            ...b,
            config: {
              ...b.config,
              // Pointer only — real secret stays in oauth token store, never LLM context
              oauth: "connected",
              shop: token.meta.shop ?? "",
              subdomain: token.meta.subdomain ?? "",
            },
          }
        : b,
    );

    await upsertWorkspaceAgent(payload.workspaceId, payload.agentId, {
      agentId: payload.agentId,
      connectedConnectors: connected,
      bindings,
    });

    await appendAudit({
      workspaceId: payload.workspaceId,
      agentId: payload.agentId,
      type: "oauth_connected",
      detail: {
        connectorId: payload.connectorId,
        meta: { ...token.meta, accessToken: undefined },
      },
    });

    trackEvent("miai.oauth.callback", {
      success: true,
      connectorId: payload.connectorId,
      agentId: payload.agentId,
    });

    // Verify the connection actually works (read-only probe) and record it, so the user sees a
    // "working / reconnect" status instead of a false green. Best-effort — a probe failure must
    // never fail the OAuth connect itself.
    let verify = "unknown";
    try {
      const { verifyConnector } = await import("@miai/connectors");
      const probe = await verifyConnector(payload.workspaceId, payload.connectorId);
      verify = probe.error === "probe_not_supported" ? "unsupported" : probe.ok ? "ok" : "failed";
    } catch {
      /* verification is best-effort */
    }

    const dest =
      payload.returnTo ??
      `/agents/${payload.agentId}?tab=actions&oauth=${payload.connectorId}`;
    const destUrl = new URL(dest.startsWith("/") ? `${base}${dest}` : `${base}/${dest}`);
    destUrl.searchParams.set("oauth", payload.connectorId);
    destUrl.searchParams.set("verify", verify);
    return NextResponse.redirect(destUrl.toString());
  } catch (e) {
    trackDependency({
      name: "oauth.exchangeCode",
      type: "HTTP",
      target: payload.connectorId,
      durationMs: Date.now() - exchangeStarted,
      success: false,
      resultCode: 500,
      properties: { agentId: payload.agentId },
    });
    trackException(e, {
      route: "api/oauth/callback",
      connectorId: payload.connectorId,
      agentId: payload.agentId,
    });
    const message = e instanceof Error ? e.message : "oauth_failed";
    return NextResponse.redirect(
      `${base}/agents/${payload.agentId}?tab=actions&oauth=error&message=${encodeURIComponent(message)}`,
    );
  }
}
