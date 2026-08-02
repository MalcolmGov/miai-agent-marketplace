import { NextResponse } from "next/server";
import { addKnowledgeSource } from "@/lib/knowledge";
import { appendAudit } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireRole } from "@/lib/security";
import { knowledgePasteBodySchema, parseJsonBody } from "@/lib/api-schemas";

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "agent");
  if (forbidden) return forbidden;

  const parsed = await parseJsonBody(req, knowledgePasteBodySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const agentId = body.agentId;
  const content = body.content.trim();

  const workspaceId =
    auth.mode === "oidc" ? auth.workspaceId : (body.workspaceId ?? auth.workspaceId);
  const source = await addKnowledgeSource({
    workspaceId,
    agentId,
    type: "paste",
    title: (body.title ?? "Pasted FAQs").slice(0, 120),
    content: content.slice(0, 100_000),
    status: "ready",
  });

  await appendAudit({
    workspaceId,
    agentId,
    type: "knowledge_ingest",
    detail: { sourceId: source.id, kind: "paste", chars: source.chars },
  });

  return NextResponse.json({ ok: true, source });
}
