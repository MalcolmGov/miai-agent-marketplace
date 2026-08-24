import { NextResponse } from "next/server";
import { createWalletAdapter, usdForPackage } from "@miai/wallet-adapter";
import { appendAudit } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireRole } from "@/lib/security";
import { mockRailsAllowed } from "@/lib/security-flags";
import { parseJsonBody, walletTopUpBodySchema } from "@/lib/api-schemas";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "readonly");
  if (forbidden) return forbidden;
  const q = new URL(req.url).searchParams.get("workspaceId");
  const workspaceId = auth.mode === "oidc" ? auth.workspaceId : (q ?? auth.workspaceId);
  const bal = await createWalletAdapter().getBalance(workspaceId);
  return NextResponse.json(bal);
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "admin");
  if (forbidden) return forbidden;

  // This endpoint credits tokens WITHOUT taking payment — a mock rail. Real money
  // must go through Paystack (/api/payments/paystack/init → signature-verified
  // webhook credits the wallet). So block the free credit anywhere real rails run.
  if (!mockRailsAllowed()) {
    return NextResponse.json(
      {
        error:
          "Direct top-up is disabled on live rails. Start a Paystack checkout at /api/payments/paystack/init.",
      },
      { status: 403 },
    );
  }

  const parsed = await parseJsonBody(req, walletTopUpBodySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const workspaceId =
    auth.mode === "oidc" ? auth.workspaceId : (body.workspaceId ?? auth.workspaceId);
  const wallet = createWalletAdapter();
  const usd = body.usdAmount ?? usdForPackage(body.packageId);
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
