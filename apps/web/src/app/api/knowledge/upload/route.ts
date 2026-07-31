import { NextResponse } from "next/server";
import { addKnowledgeSource } from "@/lib/knowledge";
import { fileToText } from "@/lib/ingest";
import { appendAudit } from "@/lib/store";
import { WORKSPACE_ID } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData();
  const agentId = String(form.get("agentId") ?? "");
  const workspaceId = String(form.get("workspaceId") ?? WORKSPACE_ID);
  const file = form.get("file");

  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Max file size is 4MB for staging" }, { status: 400 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const text = fileToText(file.name, file.type, buf).trim();
    if (text.length < 20) {
      return NextResponse.json({ error: "File had almost no extractable text" }, { status: 400 });
    }

    const source = await addKnowledgeSource({
      workspaceId,
      agentId,
      type: "file",
      title: file.name,
      filename: file.name,
      mime: file.type || undefined,
      content: text.slice(0, 100_000),
      status: "ready",
    });

    appendAudit({
      workspaceId,
      agentId,
      type: "knowledge_ingest",
      detail: { sourceId: source.id, kind: "file", filename: file.name, chars: source.chars },
    });

    return NextResponse.json({ ok: true, source: { ...source, content: undefined, preview: text.slice(0, 240) } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 400 },
    );
  }
}
