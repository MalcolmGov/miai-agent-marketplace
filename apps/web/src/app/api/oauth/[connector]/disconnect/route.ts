import { NextResponse } from "next/server";
import { deleteToken, isOAuthConnector } from "@miai/connectors";
import { WORKSPACE_ID } from "@/lib/constants";
import { appendAudit, getWorkspaceAgent, upsertWorkspaceAgent } from "@/lib/store";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ connector: string }> },
) {
  const { connector } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    agentId?: string;
    workspaceId?: string;
  };
  const workspaceId = body.workspaceId ?? WORKSPACE_ID;
  const agentId = body.agentId;
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

  if (isOAuthConnector(connector)) {
    await deleteToken(workspaceId, connector);
  }

  const rental = getWorkspaceAgent(workspaceId, agentId);
  if (rental) {
    upsertWorkspaceAgent(workspaceId, agentId, {
      agentId,
      connectedConnectors: rental.connectedConnectors.filter((c) => c !== connector),
      bindings: rental.bindings.map((b) =>
        b.connector === connector ? { ...b, config: {} } : b,
      ),
    });
  }

  appendAudit({
    workspaceId,
    agentId,
    type: "oauth_disconnected",
    detail: { connectorId: connector },
  });

  return NextResponse.json({ ok: true });
}
