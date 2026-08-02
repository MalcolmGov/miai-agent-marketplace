import { NextResponse } from "next/server";
import { createWalletAdapter } from "@miai/wallet-adapter";
import { listTokenMeta } from "@miai/connectors";
import { listKnowledgeSources } from "@/lib/knowledge";
import { listAudit, listWorkspaceAgents } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireRole } from "@/lib/security";
import { listTurnTranscripts } from "@/lib/traceability";

export const dynamic = "force-dynamic";

/**
 * DSAR / data-subject export for the caller's workspace.
 * Owner or admin only. Never includes OAuth access/refresh tokens.
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "admin");
  if (forbidden) return forbidden;

  const workspaceId = auth.workspaceId;
  const agents = await listWorkspaceAgents(workspaceId);
  const audit = await listAudit(5000, { workspaceId });
  const turns = await listTurnTranscripts({ workspaceId, limit: 500 });
  const connectors = await listTokenMeta(workspaceId);
  const wallet = await createWalletAdapter().getBalance(workspaceId);

  const knowledge = [];
  for (const a of agents) {
    const sources = await listKnowledgeSources(workspaceId, a.agentId);
    for (const s of sources) {
      knowledge.push({
        id: s.id,
        agentId: s.agentId,
        type: s.type,
        title: s.title,
        url: s.url,
        filename: s.filename,
        chars: s.chars,
        status: s.status,
        createdAt: s.createdAt,
        // Content included for DSAR completeness; partners should treat as confidential
        contentPreview: s.content.slice(0, 4000),
        contentChars: s.content.length,
      });
    }
  }

  const payload = {
    exportType: "dsar_workspace_export",
    exportedAt: new Date().toISOString(),
    requestedBy: { userId: auth.userId, roles: auth.roles },
    workspaceId,
    notice:
      "This export is for legitimate access/portability requests. OAuth secrets are omitted. Destructive erasure is available to owners/admins via POST /api/dsar/erase (confirm required); audit tombstones are retained.",
    wallet: { tokens: wallet.tokens },
    agents: agents.map((a) => ({
      agentId: a.agentId,
      state: a.state,
      tier: a.tier,
      model: a.model,
      rentedAt: a.rentedAt,
      connectedConnectors: a.connectedConnectors,
      messageCount: a.messages.length,
      // Last few turns only — full chat history may be large
      recentMessages: a.messages.slice(-40).map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content.slice(0, 2000) : "",
      })),
    })),
    connectors,
    knowledge,
    audit: audit.map((e) => ({
      id: e.id,
      at: e.at,
      type: e.type,
      agentId: e.agentId,
      correlationId: e.correlationId,
      sessionId: e.sessionId,
      channel: e.channel,
      userId: e.userId,
      detail: redactAuditDetail(e.detail),
    })),
    conversationTurns: turns.map((t) => ({
      id: t.id,
      at: t.at,
      correlationId: t.correlationId,
      agentId: t.agentId,
      channel: t.channel,
      sessionId: t.sessionId,
      userMessage: t.userMessage.slice(0, 4000),
      assistantMessage: t.assistantMessage.slice(0, 4000),
      tools: t.toolCalls.map((x) => x.name),
      tokensDebited: t.tokensDebited,
    })),
  };

  await import("@/lib/store").then(({ appendAudit }) =>
    appendAudit({
      workspaceId,
      type: "dsar_export",
      detail: { userId: auth.userId, agentCount: agents.length, auditCount: audit.length },
    }),
  );

  const body = JSON.stringify(payload, null, 2);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="miai-dsar-${workspaceId}-${Date.now()}.json"`,
      "cache-control": "no-store",
    },
  });
}

function redactAuditDetail(detail: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...detail };
  for (const key of Object.keys(out)) {
    if (/token|secret|password|authorization|api[_-]?key/i.test(key)) {
      out[key] = "[redacted]";
    }
  }
  return out;
}
