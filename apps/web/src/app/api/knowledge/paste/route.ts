import { NextResponse } from "next/server";
import { addKnowledgeSource } from "@/lib/knowledge";
import { appendAudit } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;

  const body = (await req.json()) as {
    agentId?: string;
    workspaceId?: string;
    title?: string;
    content?: string;
  };
  const agentId = body.agentId;
  const content = (body.content ?? "").trim();
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });
  if (content.length < 10) {
    return NextResponse.json({ error: "Paste at least a short FAQ or policy note" }, { status: 400 });
  }

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
