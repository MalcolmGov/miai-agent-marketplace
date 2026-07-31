import { NextResponse } from "next/server";
import { createWalletAdapter } from "@miai/wallet-adapter";
import { opsSummary, listAudit } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const q = new URL(req.url).searchParams.get("workspaceId");
  const workspaceId = auth.mode === "oidc" ? auth.workspaceId : (q ?? auth.workspaceId);
  const wallet = await createWalletAdapter().getBalance(workspaceId);
  const recent = (await listAudit(20)).filter((e) => e.workspaceId === workspaceId);
  return NextResponse.json({
    workspaceId,
    wallet,
    summary: await opsSummary(workspaceId),
    recent,
  });
}
