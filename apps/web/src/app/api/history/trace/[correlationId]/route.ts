import { NextResponse } from "next/server";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireRole } from "@/lib/security";
import { getTraceByCorrelation } from "@/lib/traceability";

export const dynamic = "force-dynamic";

/** Full trace for one correlation id — turns + linked audit events. */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ correlationId: string }> },
) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "readonly");
  if (forbidden) return forbidden;

  const { correlationId } = await ctx.params;
  if (!correlationId?.trim()) {
    return NextResponse.json({ error: "correlationId required" }, { status: 400 });
  }

  const trace = await getTraceByCorrelation(correlationId.trim(), auth.workspaceId);
  return NextResponse.json({
    correlationId: correlationId.trim(),
    workspaceId: auth.workspaceId,
    ...trace,
  });
}
