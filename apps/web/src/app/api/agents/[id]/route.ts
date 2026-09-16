import { NextResponse } from "next/server";
import { RENT_USD, marketplaceCategory } from "@miai/agent-protocol";
import { getPreset } from "@miai/presets";
import { listConnectors } from "@miai/connectors";
import { getAgentPackage } from "@/lib/catalog";
import {
  appendAudit,
  deleteWorkspaceAgent,
  getWorkspaceAgent,
  setEmbedRevoked,
} from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireRole } from "@/lib/security";
import { redactAgentPackage } from "@/lib/agent-ip";
import { deleteKnowledgeForAgent } from "@/lib/knowledge";
import { apiErrorFromRequest, apiOk } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** PATCH — enable/disable an agent without deleting it. Disabling revokes the embed key
 *  (every widget/app request is rejected) while keeping the record, settings and history. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "admin");
  if (forbidden) return forbidden;

  const { id } = await ctx.params;
  let body: { embedRevoked?: boolean };
  try {
    body = (await req.json()) as { embedRevoked?: boolean };
  } catch {
    return apiErrorFromRequest(req, 400, "Invalid JSON body");
  }
  if (typeof body.embedRevoked !== "boolean") {
    return apiErrorFromRequest(req, 400, "embedRevoked (boolean) is required");
  }

  const updated = await setEmbedRevoked(auth.workspaceId, id, body.embedRevoked);
  if (!updated) return apiErrorFromRequest(req, 404, "Agent not rented in this workspace");

  await appendAudit({
    workspaceId: auth.workspaceId,
    agentId: id,
    type: body.embedRevoked ? "agent_disabled" : "agent_enabled",
    detail: { userId: auth.userId },
  });
  return apiOk({ agentId: id, embedRevoked: body.embedRevoked });
}

/**
 * DELETE — permanently remove a rented agent from the workspace: its record, its embed key and the
 * knowledge sources the tenant uploaded for it. Chat history and audit events are intentionally
 * kept (an audit trail is not something a workspace owner should be able to erase from here).
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "admin");
  if (forbidden) return forbidden;

  const { id } = await ctx.params;
  const existed = await deleteWorkspaceAgent(auth.workspaceId, id);
  if (!existed) return apiErrorFromRequest(req, 404, "Agent not rented in this workspace");

  // Delete the agent's ingested knowledge too, otherwise the uploads linger as orphans and would
  // silently re-attach if the same agent is rented again.
  const knowledgeSources = await deleteKnowledgeForAgent(auth.workspaceId, id).catch(() => 0);

  await appendAudit({
    workspaceId: auth.workspaceId,
    agentId: id,
    type: "agent_deleted",
    detail: { userId: auth.userId, knowledgeSources },
  });
  return apiOk({ agentId: id, deleted: true, knowledgeSources });
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;

  const { id } = await ctx.params;
  const pkg = await getAgentPackage(id);
  if (!pkg) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const q = new URL(req.url).searchParams.get("workspaceId");
  const workspaceId = auth.mode === "oidc" ? auth.workspaceId : (q ?? auth.workspaceId);
  const preset = getPreset(id);
  const rental = await getWorkspaceAgent(workspaceId, id);
  return NextResponse.json({
    // Crown-jewel IP is never sent to a client — the studio uses manifest/tools/knowledge,
    // and the agent runs server-side with the full package. Locks down prod and sandbox alike.
    package: redactAgentPackage(pkg),
    marketplaceCategory: marketplaceCategory(pkg.manifest),
    rentUsd: RENT_USD[pkg.manifest.tier] ?? 349,
    preset: preset ?? null,
    pilot: false,
    connectors: listConnectors().map((c) => ({
      id: c.id,
      name: c.name,
      phase: c.phase,
      description: c.description,
      recommended: c.recommended,
      auth: c.auth,
    })),
    rental: rental ?? null,
    workspaceId,
  });
}
