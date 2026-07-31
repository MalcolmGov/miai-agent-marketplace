import { NextResponse } from "next/server";
import { addKnowledgeSource } from "@/lib/knowledge";
import { appendAudit } from "@/lib/store";
import { WORKSPACE_ID } from "@/lib/constants";

export async function POST(req: Request) {
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

  const workspaceId = body.workspaceId ?? WORKSPACE_ID;
  const source = await addKnowledgeSource({
    workspaceId,
    agentId,
    type: "paste",
    title: (body.title ?? "Pasted FAQs").slice(0, 120),
    content: content.slice(0, 100_000),
    status: "ready",
  });

  appendAudit({
    workspaceId,
    agentId,
    type: "knowledge_ingest",
    detail: { sourceId: source.id, kind: "paste", chars: source.chars },
  });

  return NextResponse.json({ ok: true, source });
}
