import { NextResponse } from "next/server";
import { listAudit } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireRole } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * Workspace-scoped audit trail. Always filtered to the caller's workspace —
 * never returns cross-tenant events (including mock mode).
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "readonly");
  if (forbidden) return forbidden;

  const limit = Math.min(200, Math.max(1, Number(new URL(req.url).searchParams.get("limit") ?? "50")));
  const events = (await listAudit(limit * 4))
    .filter((e) => e.workspaceId === auth.workspaceId)
    .slice(0, limit);

  return NextResponse.json({
    workspaceId: auth.workspaceId,
    events,
  });
}
