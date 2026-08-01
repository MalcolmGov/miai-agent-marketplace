import { NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  isOAuthConnector,
  type OAuthConnectorId,
} from "@miai/connectors";
import { getWorkspaceAgent, upsertWorkspaceAgent } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireRole } from "@/lib/security";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ connector: string }> },
) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "agent");
  if (forbidden) return forbidden;

  const { connector } = await ctx.params;
  if (!isOAuthConnector(connector)) {
    return NextResponse.json({ error: "Not an OAuth connector" }, { status: 400 });
  }

  const url = new URL(req.url);
  const agentId = url.searchParams.get("agentId");
  const workspaceId =
    auth.mode === "oidc"
      ? auth.workspaceId
      : (url.searchParams.get("workspaceId") ?? auth.workspaceId);
  const shop = url.searchParams.get("shop") ?? undefined;
  const subdomain = url.searchParams.get("subdomain") ?? undefined;
  const emailProvider =
    (url.searchParams.get("emailProvider") as "google" | "microsoft" | null) ?? "google";
  const returnTo =
    url.searchParams.get("returnTo") ?? `/agents/${agentId ?? ""}?tab=actions`;

  if (!agentId) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 });
  }

  // Ensure rental exists so callback can mark connected
  if (!await getWorkspaceAgent(workspaceId, agentId)) {
    await upsertWorkspaceAgent(workspaceId, agentId, { agentId, state: "configuring" });
  }

  const result = buildAuthorizeUrl(connector as OAuthConnectorId, {
    workspaceId,
    agentId,
    returnTo,
    shop,
    subdomain,
    emailProvider,
  });

  if (!result.configured) {
    return NextResponse.json(
      {
        error: "OAuth app credentials missing",
        missingEnv: result.missingEnv,
        hint: "Copy apps/web/.env.example → .env.local and fill client id/secret for this provider.",
      },
      { status: 503 },
    );
  }

  // JSON mode for UI fetch, redirect mode for direct navigation
  if (url.searchParams.get("format") === "json") {
    return NextResponse.json({ url: result.url, state: result.state });
  }

  return NextResponse.redirect(result.url);
}
