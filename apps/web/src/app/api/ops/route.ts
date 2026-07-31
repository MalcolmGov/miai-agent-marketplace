import { NextResponse } from "next/server";
import { createWalletAdapter } from "@miai/wallet-adapter";
import { opsSummary, listAudit } from "@/lib/store";
import { WORKSPACE_ID } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const workspaceId = new URL(req.url).searchParams.get("workspaceId") ?? WORKSPACE_ID;
  const wallet = await createWalletAdapter().getBalance(workspaceId);
  return NextResponse.json({
    workspaceId,
    wallet,
    summary: opsSummary(workspaceId),
    recent: listAudit(20).filter((e) => e.workspaceId === workspaceId),
  });
}
