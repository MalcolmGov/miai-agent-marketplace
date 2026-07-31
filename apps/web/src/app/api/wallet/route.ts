import { NextResponse } from "next/server";
import { createWalletAdapter, type TopUpRequest } from "@miai/wallet-adapter";
import { appendAudit } from "@/lib/store";
import { WORKSPACE_ID } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const workspaceId = new URL(req.url).searchParams.get("workspaceId") ?? WORKSPACE_ID;
  const bal = await createWalletAdapter().getBalance(workspaceId);
  return NextResponse.json(bal);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    workspaceId?: string;
    packageId: TopUpRequest["packageId"];
    usdAmount?: number;
  };
  const workspaceId = body.workspaceId ?? WORKSPACE_ID;
  const wallet = createWalletAdapter();
  const usd =
    body.usdAmount ??
    ({ "10": 10, "20": 20, "100": 100, "200": 200 } as const)[body.packageId];
  const bal = await wallet.topUp({
    workspaceId,
    packageId: body.packageId,
    usdAmount: usd,
  });
  appendAudit({
    workspaceId,
    type: "wallet_topup",
    detail: { packageId: body.packageId, tokens: bal.tokens, usd },
  });
  return NextResponse.json(bal);
}
