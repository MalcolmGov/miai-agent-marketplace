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
    // Soft-create entitlement so Configure works even if Rent wasn't clicked first
    // (common after Railway redeploys wipe in-memory state).
    const { getAgentPackage } = await import("@/lib/catalog");
    const { getPreset, defaultBindingsForTools } = await import("@miai/presets");
    const pkg = await getAgentPackage(body.agentId);
    if (!pkg) return NextResponse.json({ error: "Unknown agent" }, { status: 404 });
    const preset = getPreset(body.agentId);
    upsertWorkspaceAgent(workspaceId, body.agentId, {
      agentId: body.agentId,
      state: "configuring",
      model: body.model ?? pkg.manifest.model.primary,
      knowledge: body.knowledge ?? pkg.knowledge,
      bindings: preset?.bindings ?? defaultBindingsForTools(pkg.tools.map((t) => t.name)),
      rentedAt: new Date().toISOString(),
    });
  }

  const current = getWorkspaceAgent(workspaceId, body.agentId)!;
  const state =
    body.markRented || current.state === "configuring"
      ? body.markRented
        ? "rented"
        : "configuring"
      : current.state;

  const rental = upsertWorkspaceAgent(workspaceId, body.agentId, {
    agentId: body.agentId,
    model: body.model ?? current.model,
    knowledge: body.knowledge ?? current.knowledge,
    bindings: body.bindings ?? current.bindings,
    connectedConnectors: body.connectedConnectors ?? current.connectedConnectors,
    state: state as typeof current.state,
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
