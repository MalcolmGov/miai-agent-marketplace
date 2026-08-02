import { NextResponse } from "next/server";
import { saveToken, type ConnectorId } from "@miai/connectors";
import { getPreset } from "@miai/presets";
import { appendAudit, getWorkspaceAgent, upsertWorkspaceAgent } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireRole } from "@/lib/security";

/** Store API-key / webhook / MCP credentials (non-OAuth connectors). */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "admin");
  if (forbidden) return forbidden;

  const body = (await req.json()) as {
    agentId: string;
    connectorId: ConnectorId;
    workspaceId?: string;
    config: Record<string, string>;
    /** Optionally rebind these tools to this connector (e.g. MCP / webhook proofs). */
    remapTools?: string[];
  };
  const workspaceId =
    auth.mode === "oidc" ? auth.workspaceId : (body.workspaceId ?? auth.workspaceId);
  const rental = await getWorkspaceAgent(workspaceId, body.agentId);
  if (!rental) return NextResponse.json({ error: "Rent the agent first" }, { status: 400 });

  const meta = { ...body.config };
  // Don't seal remap list into token meta
  delete (meta as { remapTools?: string }).remapTools;

  // Persist secrets in token store (sealed) — not returned to client
  await saveToken({
    connectorId: body.connectorId,
    workspaceId,
    accessToken: body.config.api_key || body.config.token || body.config.secret || "configured",
    meta,
    updatedAt: new Date().toISOString(),
  });

  const connected = Array.from(new Set([...rental.connectedConnectors, body.connectorId]));
  const preset = getPreset(body.agentId);
  // Prefer live rental bindings so reconnects don't wipe custom remaps
  const base = (rental.bindings?.length ? rental.bindings : preset?.bindings) ?? [];
  const remap = new Set(body.remapTools ?? []);
  const safeConfig = {
    ...meta,
    api_key: body.config.api_key ? "••••" : undefined,
    token: body.config.token ? "••••" : undefined,
    consumer_secret: body.config.consumer_secret ? "••••" : undefined,
    secret: body.config.secret ? "••••" : undefined,
  } as Record<string, string>;

  let bindings = base.map((b) => {
    if (remap.has(b.tool) || b.connector === body.connectorId) {
      return {
        ...b,
        connector: remap.has(b.tool) ? body.connectorId : b.connector,
        config: { ...b.config, ...safeConfig },
      };
    }
    return b;
  });

  // Add remapped tools that weren't in the binding list yet
  for (const tool of remap) {
    if (!bindings.some((b) => b.tool === tool)) {
      bindings = [...bindings, { tool, connector: body.connectorId, config: safeConfig }];
    }
  }

  const next = await upsertWorkspaceAgent(workspaceId, body.agentId, {
    agentId: body.agentId,
    connectedConnectors: connected,
    bindings,
  });

  await appendAudit({
    workspaceId,
    agentId: body.agentId,
    type: "credentials_saved",
    detail: { connectorId: body.connectorId },
  });

  return NextResponse.json({ ok: true, rental: next });
}
