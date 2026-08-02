import { NextResponse } from "next/server";
import { deleteToken, isOAuthConnector } from "@miai/connectors";
import { appendAudit, getWorkspaceAgent, upsertWorkspaceAgent } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireRole } from "@/lib/security";
import { oauthDisconnectBodySchema, parseJsonBody } from "@/lib/api-schemas";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ connector: string }> },
) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "admin");
  if (forbidden) return forbidden;

  const { connector } = await ctx.params;
  const parsed = await parseJsonBody(req, oauthDisconnectBodySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const workspaceId =
    auth.mode === "oidc" ? auth.workspaceId : (body.workspaceId ?? auth.workspaceId);
  const agentId = body.agentId;

  if (isOAuthConnector(connector)) {
    await deleteToken(workspaceId, connector);
  }

  const rental = await getWorkspaceAgent(workspaceId, agentId);
  if (rental) {
    await upsertWorkspaceAgent(workspaceId, agentId, {
      agentId,
      connectedConnectors: rental.connectedConnectors.filter((c) => c !== connector),
      bindings: rental.bindings.map((b) =>
        b.connector === connector ? { ...b, config: {} } : b,
      ),
    });
  }

  await appendAudit({
    workspaceId,
    agentId,
    type: "oauth_disconnected",
    detail: { connectorId: connector },
  });

  return NextResponse.json({ ok: true });
}
