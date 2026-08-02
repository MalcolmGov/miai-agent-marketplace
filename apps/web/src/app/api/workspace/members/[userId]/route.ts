import { NextResponse } from "next/server";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireRole } from "@/lib/security";
import { removeMember, updateMemberRole } from "@/lib/workspace-members";
import { appendAudit } from "@/lib/store";
import { parseJsonBody, workspaceMemberRoleBodySchema } from "@/lib/api-schemas";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "admin");
  if (forbidden) return forbidden;

  const { userId } = await ctx.params;
  const parsed = await parseJsonBody(req, workspaceMemberRoleBodySchema);
  if (!parsed.ok) return parsed.response;
  const role = parsed.data.role;

  try {
    const member = await updateMemberRole({
      workspaceId: auth.workspaceId,
      userId: decodeURIComponent(userId),
      role,
    });
    await appendAudit({
      workspaceId: auth.workspaceId,
      type: "workspace_role_change",
      userId: auth.userId,
      channel: "system",
      detail: { targetUserId: member.userId, role: member.role },
    });
    return NextResponse.json({ member });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  const auth = await requireAuth(_req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "admin");
  if (forbidden) return forbidden;

  const { userId } = await ctx.params;
  const target = decodeURIComponent(userId);

  try {
    await removeMember({ workspaceId: auth.workspaceId, userId: target });
    await appendAudit({
      workspaceId: auth.workspaceId,
      type: "workspace_member_remove",
      userId: auth.userId,
      channel: "system",
      detail: { targetUserId: target },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Remove failed" },
      { status: 400 },
    );
  }
}
