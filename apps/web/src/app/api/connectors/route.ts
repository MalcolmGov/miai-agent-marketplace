import { NextResponse } from "next/server";
import { listConnectors, type ConnectorId } from "@miai/connectors";
import { getPreset } from "@miai/presets";
import { appendAudit, getWorkspaceAgent, upsertWorkspaceAgent } from "@/lib/store";
import { WORKSPACE_ID } from "@/lib/constants";

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get("phase");
  const p = phase === "1" || phase === "2" ? (Number(phase) as 1 | 2) : undefined;
  return NextResponse.json({ connectors: listConnectors(p) });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    agentId: string;
    connectorId: ConnectorId;
    workspaceId?: string;
    config?: Record<string, string>;
  };
  const workspaceId = body.workspaceId ?? WORKSPACE_ID;
  const rental = getWorkspaceAgent(workspaceId, body.agentId);
  if (!rental) return NextResponse.json({ error: "Rent first" }, { status: 400 });

  const connected = Array.from(new Set([...rental.connectedConnectors, body.connectorId]));
  const preset = getPreset(body.agentId);
  const bindings = (preset?.bindings ?? rental.bindings).map((b) =>
    b.connector === body.connectorId
      ? { ...b, config: { ...b.config, ...body.config, access_token: body.config?.access_token ?? "demo" } }
      : b,
  );

  const next = upsertWorkspaceAgent(workspaceId, body.agentId, {
    agentId: body.agentId,
    connectedConnectors: connected,
    bindings,
  });

  appendAudit({
    workspaceId,
    agentId: body.agentId,
    type: "connector_connect",
    detail: { connectorId: body.connectorId },
  });

  return NextResponse.json({ ok: true, rental: next });
}
