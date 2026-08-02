import {
  buildAuthorizeUrl,
  isOAuthConnector,
  type OAuthConnectorId,
} from "@miai/connectors";
import { getWorkspaceAgent, upsertWorkspaceAgent } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { rateLimit, requireRole } from "@/lib/security";
import { apiErrorFromRequest, apiOk } from "@/lib/api-error";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ connector: string }> },
) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "agent");
  if (forbidden) return forbidden;

  const limited = await rateLimit(`oauth-start:${auth.workspaceId}:${auth.userId}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return apiErrorFromRequest(
      req,
      429,
      "Too many OAuth starts — retry shortly",
      undefined,
      { "retry-after": String(limited.retryAfterSec) },
    );
  }

  const { connector } = await ctx.params;
  if (!isOAuthConnector(connector)) {
    return apiErrorFromRequest(req, 400, "Not an OAuth connector");
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
    return apiErrorFromRequest(req, 400, "agentId required");
  }

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
    return apiErrorFromRequest(req, 503, "OAuth app credentials missing", {
      missingEnv: result.missingEnv,
      hint: "Copy apps/web/.env.example → .env.local and fill client id/secret for this provider.",
    });
  }

  if (url.searchParams.get("format") === "json") {
    return apiOk({ url: result.url, state: result.state });
  }

  return Response.redirect(result.url);
}
