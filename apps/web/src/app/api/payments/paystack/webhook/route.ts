import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paystack";
import { applyTopupFromPaystack, isWalletReference } from "@/lib/topup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Paystack webhook — the source of truth for crediting a top-up.
 *
 * Paystack signs the raw body with HMAC-SHA512 using the secret key; we verify
 * that before trusting anything. On `charge.success` for a wallet reference we
 * credit the token ledger (idempotent by reference, so retries are safe).
 *
 * Public route (no OIDC bearer) — see lib/public-paths.ts. Authentication is the
 * signature, exactly like the /api/webhook/sink connector sink.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 400 });
  }

  let event: { event?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  if (event.event === "charge.success") {
    const data = (event.data ?? {}) as {
      reference?: string;
      status?: string;
      amount?: number;
      currency?: string;
      metadata?: Record<string, unknown> | null;
    };
    // Route on our server-issued reference only; applyTopupFromPaystack re-checks and binds the
    // credited package to the amount actually paid.
    if (isWalletReference(String(data.reference || ""))) {
      try {
        const result = await applyTopupFromPaystack(data);
        return NextResponse.json({ ok: true, routed: "wallet_topup", credited: result?.credited ?? false });
      } catch {
        // Return 500 so Paystack retries — crediting is idempotent, so a retry is safe.
        return NextResponse.json({ ok: false, routed: "wallet_topup_error" }, { status: 500 });
      }
    }
  }

  // Any other event is acknowledged (200) so Paystack stops retrying it.
  return NextResponse.json({ ok: true });
}
