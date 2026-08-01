import { NextResponse } from "next/server";
import { buildAdminOverview } from "@/lib/insights";
import { isAuthContext, requireAuth } from "@/lib/request-auth";

export const dynamic = "force-dynamic";

/**
 * MyInstantAI / Move Digital operator view — full partner base visibility.
 * Auth is the same workspace gate for now; tighten with role checks when OIDC roles land.
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const overview = await buildAdminOverview();
  return NextResponse.json({
    ...overview,
    viewer: { userId: auth.userId, workspaceId: auth.workspaceId, mode: auth.mode },
  });
}
