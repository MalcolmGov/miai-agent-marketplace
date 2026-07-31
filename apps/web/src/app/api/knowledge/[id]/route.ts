import { NextResponse } from "next/server";
import { deleteKnowledgeSource } from "@/lib/knowledge";
import { appendAudit } from "@/lib/store";
import { WORKSPACE_ID } from "@/lib/constants";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const agentId = url.searchParams.get("agentId");
  const workspaceId = url.searchParams.get("workspaceId") ?? WORKSPACE_ID;
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

  const ok = await deleteKnowledgeSource(workspaceId, agentId, id);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });

  appendAudit({
    workspaceId,
    agentId,
    type: "knowledge_delete",
    detail: { sourceId: id },
  });

  return NextResponse.json({ ok: true });
}
