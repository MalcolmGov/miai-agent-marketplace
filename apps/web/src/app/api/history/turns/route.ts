import { NextResponse } from "next/server";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireOperator, requireRole } from "@/lib/security";
import { listTurnTranscripts } from "@/lib/traceability";

export const dynamic = "force-dynamic";

/** Conversation turn transcripts for History / traceability. */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "readonly");
  if (forbidden) return forbidden;

  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "50") || 50));
  const agentId = url.searchParams.get("agentId") ?? undefined;
  const channel = url.searchParams.get("channel") ?? undefined;
  const sessionId = url.searchParams.get("sessionId") ?? undefined;
  const correlationId = url.searchParams.get("correlationId") ?? undefined;
  const allWorkspaces = url.searchParams.get("all") === "1";

  let workspaceId = auth.workspaceId;
  if (allWorkspaces) {
    const opForbidden = requireOperator(auth);
    if (opForbidden) return opForbidden;
    workspaceId = url.searchParams.get("workspaceId") ?? "";
  }

  const turns = await listTurnTranscripts({
    workspaceId: workspaceId || undefined,
    agentId,
    channel,
    sessionId,
    correlationId,
    limit,
  });

  return NextResponse.json({
    workspaceId: workspaceId || null,
    count: turns.length,
    turns,
  });
}
