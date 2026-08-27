import { NextResponse } from "next/server";
import { buildAdminOverview } from "@/lib/insights";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireOperator } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * MyInstantAI / Moove Digital operator view — live marketplace aggregation.
 * Requires admin/operator role. Pass ?narrative=1 for pitch-deck scale figures only.
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireOperator(auth);
  if (forbidden) return forbidden;

  const narrative = new URL(req.url).searchParams.get("narrative") === "1";
  const overview = await buildAdminOverview({ narrative });
  return NextResponse.json({
    ...overview,
    viewer: { userId: auth.userId, workspaceId: auth.workspaceId, mode: auth.mode, roles: auth.roles },
  });
}
