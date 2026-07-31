import { NextResponse } from "next/server";
import { deleteKnowledgeSource } from "@/lib/knowledge";
import { appendAudit } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const agentId = url.searchParams.get("agentId");
  const workspaceId =
    auth.mode === "oidc"
      ? auth.workspaceId
      : (url.searchParams.get("workspaceId") ?? auth.workspaceId);
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

  const ok = await deleteKnowledgeSource(workspaceId, agentId, id);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await appendAudit({
    workspaceId,
    agentId,
    type: "knowledge_delete",
    detail: { sourceId: id },
  });

  return NextResponse.json({ ok: true });
}
