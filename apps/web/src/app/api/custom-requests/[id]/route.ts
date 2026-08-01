import { NextResponse } from "next/server";
import { updateCustomRequest, type CustomRequestStatus } from "@/lib/custom-requests";
import { appendAudit } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireOperator } from "@/lib/security";

export const dynamic = "force-dynamic";

const STATUSES = new Set<CustomRequestStatus>([
  "new",
  "reviewing",
  "scoped",
  "done",
  "declined",
]);

/** Operator updates request status in the pipeline. */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireOperator(auth);
  if (forbidden) return forbidden;

  const { id } = await ctx.params;
  const body = (await req.json()) as { status?: CustomRequestStatus };
  if (!body.status || !STATUSES.has(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const row = await updateCustomRequest(id, { status: body.status });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await appendAudit({
    workspaceId: auth.workspaceId,
    type: "custom_request_status",
    detail: { id: row.id, status: row.status, userId: auth.userId },
  });

  return NextResponse.json({ ok: true, request: row });
}
