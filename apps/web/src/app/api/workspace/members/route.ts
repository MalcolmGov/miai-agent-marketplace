import { NextResponse } from "next/server";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireRole, type WorkspaceRole } from "@/lib/security";
import { inviteMember, listMembers } from "@/lib/workspace-members";
import { appendAudit } from "@/lib/store";
import { parseJsonBody, workspaceMemberInviteBodySchema } from "@/lib/api-schemas";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "readonly");
  if (forbidden) return forbidden;

  const members = await listMembers(auth.workspaceId);
  return NextResponse.json({
    workspaceId: auth.workspaceId,
    count: members.length,
    members,
  });
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "admin");
  if (forbidden) return forbidden;

  const parsed = await parseJsonBody(req, workspaceMemberInviteBodySchema);
  if (!parsed.ok) return parsed.response;
  const email = parsed.data.email.trim();
  const role = (parsed.data.role ?? "agent") as WorkspaceRole;

  try {
    const member = await inviteMember({
      workspaceId: auth.workspaceId,
      email,
      role,
      invitedBy: auth.userId,
    });
    await appendAudit({
      workspaceId: auth.workspaceId,
      type: "workspace_invite",
      userId: auth.userId,
      channel: "system",
      detail: { email: member.email, role: member.role, userId: member.userId },
    });
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invite failed" },
      { status: 400 },
    );
  }
}
