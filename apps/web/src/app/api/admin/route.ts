import { NextResponse } from "next/server";
import { buildAdminOverview } from "@/lib/insights";
import { isAuthContext, requireAuth } from "@/lib/request-auth";

export const dynamic = "force-dynamic";

/**
 * MyInstantAI / Move Digital operator view — live marketplace aggregation.
 * Pass ?narrative=1 for pitch-deck scale figures (not the default).
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const narrative = new URL(req.url).searchParams.get("narrative") === "1";
  const overview = await buildAdminOverview({ narrative });
  return NextResponse.json({
    ...overview,
    viewer: { userId: auth.userId, workspaceId: auth.workspaceId, mode: auth.mode },
  });
}
