import { NextResponse } from "next/server";
import { usdForPackage } from "@miai/wallet-adapter";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireRole } from "@/lib/security";
import { walletIdForConsumer } from "@/lib/consumer";
import { parseJsonBody, paystackInitBodySchema } from "@/lib/api-schemas";
import {
  currency,
  initializeTransaction,
  isConfigured,
  toMinorUnits,
} from "@/lib/paystack";
import { newTopupReference, type TopUpMetadata } from "@/lib/topup";
import { isSandbox } from "@/lib/sandbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Start a Paystack hosted checkout for a one-time prepaid token top-up.
 * Returns { authorization_url } — the client redirects the browser there. The
 * wallet is only credited later, by the signature-verified webhook (or the
 * return-URL verifier), never by this call.
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;

  // Sandbox: no real-money checkout. Use the free mock-credit rail (/api/wallet) instead.
  if (isSandbox()) {
    return NextResponse.json(
      { error: "Payments are disabled in the sandbox — use the free demo credit." },
      { status: 503 },
    );
  }

  const parsed = await parseJsonBody(req, paystackInitBodySchema);
  if (!parsed.ok) return parsed.response;
  const { packageId, scope = "workspace" } = parsed.data;

  // Workspace top-ups are a billing action → admin only, matching /api/wallet.
  // Consumers top up their own prepaid balance, so any signed-in consumer may.
  if (scope === "workspace") {
    const forbidden = requireRole(auth, "admin");
    if (forbidden) return forbidden;
  }

  if (!isConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured yet. Set PAYSTACK_SECRET_KEY to enable checkout." },
      { status: 503 },
    );
  }

  const walletId = scope === "consumer" ? walletIdForConsumer(auth) : auth.workspaceId;
  const email =
    (typeof auth.raw?.email === "string" && auth.raw.email) || `${auth.userId}@miai.local`;
  const usd = usdForPackage(packageId);
  const reference = newTopupReference();

  const origin = process.env.APP_BASE_URL || new URL(req.url).origin;
  const callbackUrl = `${origin.replace(/\/$/, "")}/api/payments/paystack/return?reference=${reference}`;

  const metadata: TopUpMetadata = {
    purpose: "wallet_topup",
    walletId,
    packageId,
    scope,
    userId: auth.userId,
  };

  try {
    const data = await initializeTransaction({
      email,
      amountMinor: toMinorUnits(usd),
      reference,
      callbackUrl,
      metadata,
    });
    return NextResponse.json({
      authorizationUrl: data.authorization_url,
      reference,
      packageId,
      usd,
      currency: currency(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment initialisation failed" },
      { status: 502 },
    );
  }
}
