import { NextResponse } from "next/server";
import type { ToolBinding } from "@miai/connectors";
import { appendAudit, getWorkspaceAgent, upsertWorkspaceAgent } from "@/lib/store";
import { WORKSPACE_ID } from "@/lib/constants";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    agentId: string;
    workspaceId?: string;
    model?: string;
    knowledge?: string;
    bindings?: ToolBinding[];
    connectedConnectors?: string[];
    markRented?: boolean;
  };
  const workspaceId = body.workspaceId ?? WORKSPACE_ID;
  const existing = getWorkspaceAgent(workspaceId, body.agentId);
  if (!existing) {
    return NextResponse.json({ error: "Rent the agent first" }, { status: 400 });
  }

  const state =
    body.markRented || existing.state === "configuring"
      ? body.markRented
        ? "rented"
        : "configuring"
      : existing.state;

  const rental = upsertWorkspaceAgent(workspaceId, body.agentId, {
    agentId: body.agentId,
    model: body.model ?? existing.model,
    knowledge: body.knowledge ?? existing.knowledge,
    bindings: body.bindings ?? existing.bindings,
    connectedConnectors: body.connectedConnectors ?? existing.connectedConnectors,
    state: state as typeof existing.state,
  });

  appendAudit({
    workspaceId,
    agentId: body.agentId,
    type: "configure",
    detail: {
      model: rental.model,
      connectors: rental.connectedConnectors,
      state: rental.state,
    },
  });

  return NextResponse.json({ ok: true, rental });
}
