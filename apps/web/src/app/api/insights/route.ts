import { NextResponse } from "next/server";
import { createWalletAdapter } from "@miai/wallet-adapter";
import { buildInsights } from "@/lib/insights";
import { isAuthContext, requireAuth } from "@/lib/request-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const q = new URL(req.url).searchParams.get("workspaceId");
  const workspaceId = auth.mode === "oidc" ? auth.workspaceId : (q ?? auth.workspaceId);
  const wallet = await createWalletAdapter().getBalance(workspaceId);
  const insights = await buildInsights(workspaceId, wallet.tokens ?? 0);
  return NextResponse.json(insights);
}
