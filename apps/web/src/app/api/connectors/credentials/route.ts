import { NextResponse } from "next/server";
import { saveToken, type ConnectorId } from "@miai/connectors";
import { getPreset } from "@miai/presets";
import { WORKSPACE_ID } from "@/lib/constants";
import { appendAudit, getWorkspaceAgent, upsertWorkspaceAgent } from "@/lib/store";

/** Store API-key / webhook / MCP credentials (non-OAuth connectors). */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    agentId: string;
    connectorId: ConnectorId;
    workspaceId?: string;
    config: Record<string, string>;
  };
  const workspaceId = body.workspaceId ?? WORKSPACE_ID;
  const rental = getWorkspaceAgent(workspaceId, body.agentId);
  if (!rental) return NextResponse.json({ error: "Rent the agent first" }, { status: 400 });

  // Persist secrets in token store (sealed) — not returned to client
  await saveToken({
    connectorId: body.connectorId,
    workspaceId,
    accessToken: body.config.api_key || body.config.token || body.config.secret || "configured",
    meta: { ...body.config },
    updatedAt: new Date().toISOString(),
  });

  const connected = Array.from(new Set([...rental.connectedConnectors, body.connectorId]));
  const preset = getPreset(body.agentId);
  const bindings = (preset?.bindings ?? rental.bindings).map((b) =>
    b.connector === body.connectorId
      ? {
          ...b,
          config: {
            ...body.config,
            // strip secrets from binding blob kept in memory rental
            api_key: body.config.api_key ? "••••" : undefined,
            token: body.config.token ? "••••" : undefined,
            consumer_secret: body.config.consumer_secret ? "••••" : undefined,
            secret: body.config.secret ? "••••" : undefined,
          } as Record<string, string>,
        }
      : b,
  );

  // Also attach binding for tools that use this connector even if not in preset list
  const next = upsertWorkspaceAgent(workspaceId, body.agentId, {
    agentId: body.agentId,
    connectedConnectors: connected,
    bindings,
  });

  appendAudit({
    workspaceId,
    agentId: body.agentId,
    type: "credentials_saved",
    detail: { connectorId: body.connectorId },
  });

  return NextResponse.json({ ok: true, rental: next });
}
