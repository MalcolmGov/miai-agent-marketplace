import { NextResponse } from "next/server";
import { createWalletAdapter } from "@miai/wallet-adapter";
import { opsSummary, listAudit } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireRole, isOperator } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  // Live Ops exposes this workspace's wallet balance and audit trail — gate it like the
  // other sensitive surfaces (readonly/agent members and unauthenticated callers get 403).
  // Under a correctly configured OIDC deployment this closes the cross-tenant read that
  // was possible via `?workspaceId=` with no role requirement.
  const gate = requireRole(auth, "admin");
  if (gate) return gate;
  // In OIDC mode the workspace is always the verified token's. In mock mode a different
  // workspace may only be inspected by a platform operator; everyone else is pinned to
  // their own, so a workspace admin cannot read another tenant by passing ?workspaceId=.
  let workspaceId = auth.workspaceId;
  const requested = new URL(req.url).searchParams.get("workspaceId");
  if (auth.mode !== "oidc" && requested && isOperator(auth)) {
    workspaceId = requested;
  }
  const wallet = await createWalletAdapter().getBalance(workspaceId);
  // Scope at the query, not after: fetching the global newest-20 and post-filtering by workspace
  // returned [] whenever other tenants produced the 20 most-recent events (i.e. almost always in a
  // busy multi-tenant deployment). listAudit filters by workspaceId in both the pg and memory paths.
  const recent = await listAudit(20, { workspaceId });
  return NextResponse.json({
    workspaceId,
    wallet,
    summary: await opsSummary(workspaceId),
    recent,
  });
}
