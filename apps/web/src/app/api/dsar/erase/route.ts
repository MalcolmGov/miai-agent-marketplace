import { NextResponse } from "next/server";
import { eraseWorkspaceData } from "@/lib/dsar-erase";
import { appendAudit } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireRole } from "@/lib/security";
import { dsarEraseBodySchema, parseJsonBody } from "@/lib/api-schemas";

export const dynamic = "force-dynamic";

/**
 * Admin-managed DSAR erasure for the caller's workspace.
 * Owner or admin only. Requires explicit { confirm: true }.
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "admin");
  if (forbidden) return forbidden;

  const parsed = await parseJsonBody(req, dsarEraseBodySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Destructive erasure requires { confirm: true } in the request body" },
      { status: 400 },
    );
  }

  const workspaceId = auth.workspaceId;

  await appendAudit({
    workspaceId,
    type: "dsar_erasure_requested",
    detail: { userId: auth.userId },
  });

  const { deleted } = await eraseWorkspaceData(workspaceId);

  await appendAudit({
    workspaceId,
    type: "dsar_erasure_completed",
    detail: { userId: auth.userId, deleted },
  });

  return NextResponse.json({
    ok: true,
    workspaceId,
    deleted,
    notice:
      "Operational data erased. Audit trail retained with tombstone events; prior audit detail redacted in memory only.",
  });
}
