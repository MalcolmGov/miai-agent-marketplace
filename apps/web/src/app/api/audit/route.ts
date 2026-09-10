import { NextResponse } from "next/server";
import { listAudit } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireOperator, requireRole } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * Workspace-scoped audit trail. Always filtered to the caller's workspace —
 * never returns cross-tenant events (including mock mode), unless operator + all=1.
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "readonly");
  if (forbidden) return forbidden;

  const url = new URL(req.url);
  // `|| 50` catches a non-numeric limit (?limit=all → NaN) and 0, both of which would otherwise
  // collapse the query to an empty result instead of the intended default. Mirrors history/turns.
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? "50") || 50));
  const type = url.searchParams.get("type") ?? undefined;
  const agentId = url.searchParams.get("agentId") ?? undefined;
  const correlationId = url.searchParams.get("correlationId") ?? undefined;
  const allWorkspaces = url.searchParams.get("all") === "1";

  let workspaceId: string | undefined = auth.workspaceId;
  if (allWorkspaces) {
    const opForbidden = requireOperator(auth);
    if (opForbidden) return opForbidden;
    workspaceId = url.searchParams.get("workspaceId") ?? undefined;
  }

  const events = await listAudit(limit, {
    workspaceId,
    type,
    agentId,
    correlationId,
  });

  return NextResponse.json({
    workspaceId: workspaceId ?? null,
    count: events.length,
    events,
  });
}
