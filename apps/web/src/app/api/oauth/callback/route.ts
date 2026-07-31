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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  const realmId = url.searchParams.get("realmId"); // QuickBooks

  const base = publicAppBase();

  if (err) {
    return NextResponse.redirect(
      `${base}/install?oauth=error&message=${encodeURIComponent(err)}`,
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(`${base}/install?oauth=error&message=missing_code`);
  }

  const payload = consumeState(state);
  if (!payload || !isOAuthConnector(payload.connectorId)) {
    return NextResponse.redirect(`${base}/install?oauth=error&message=invalid_state`);
  }

  try {
    const token = await exchangeCode({
      connectorId: payload.connectorId as OAuthConnectorId,
      code,
      statePayload: payload,
    });

    if (realmId) {
      token.meta.realmId = realmId;
      const { saveToken } = await import("@miai/connectors");
      await saveToken(token);
    }

    const rental = getWorkspaceAgent(payload.workspaceId, payload.agentId);
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

    upsertWorkspaceAgent(payload.workspaceId, payload.agentId, {
      agentId: payload.agentId,
      connectedConnectors: connected,
      bindings,
    });

    appendAudit({
      workspaceId: payload.workspaceId,
      agentId: payload.agentId,
      type: "oauth_connected",
      detail: {
        connectorId: payload.connectorId,
        meta: { ...token.meta, accessToken: undefined },
      },
    });

    const dest =
      payload.returnTo ??
      `/agents/${payload.agentId}?tab=actions&oauth=${payload.connectorId}`;
    return NextResponse.redirect(`${base}${dest.startsWith("/") ? dest : `/${dest}`}`);
  } catch (e) {
    const message = e instanceof Error ? e.message : "oauth_failed";
    return NextResponse.redirect(
      `${base}/agents/${payload.agentId}?tab=actions&oauth=error&message=${encodeURIComponent(message)}`,
    );
  }
}
