import { NextResponse } from "next/server";
import { createWalletAdapter, type TopUpRequest } from "@miai/wallet-adapter";
import { appendAudit } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const q = new URL(req.url).searchParams.get("workspaceId");
  const workspaceId = auth.mode === "oidc" ? auth.workspaceId : (q ?? auth.workspaceId);
  const bal = await createWalletAdapter().getBalance(workspaceId);
  return NextResponse.json(bal);
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;

  const body = (await req.json()) as {
    workspaceId?: string;
    packageId: TopUpRequest["packageId"];
    usdAmount?: number;
  };
  const workspaceId =
    auth.mode === "oidc" ? auth.workspaceId : (body.workspaceId ?? auth.workspaceId);
  const wallet = createWalletAdapter();
  const usd =
    body.usdAmount ??
    ({ "10": 10, "20": 20, "100": 100, "200": 200 } as const)[body.packageId];
  const bal = await wallet.topUp({
    workspaceId,
    packageId: body.packageId,
    usdAmount: usd,
  });
  await appendAudit({
    workspaceId,
    type: "wallet_topup",
    detail: { packageId: body.packageId, tokens: bal.tokens, usd, userId: auth.userId },
  });
  return NextResponse.json(bal);
}
