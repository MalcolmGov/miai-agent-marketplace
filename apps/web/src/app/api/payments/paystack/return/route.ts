import { NextResponse } from "next/server";
import { verifyTransaction } from "@/lib/paystack";
import { applyTopupFromPaystack, isWalletReference } from "@/lib/topup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where Paystack sends the browser back after checkout. The webhook is the real
 * source of truth for crediting, but it can land after the user returns — so we
 * verify the transaction here and credit as a fallback. Crediting is idempotent by
 * reference, so the webhook + this both firing is safe.
 *
 * Public route (no bearer) — the credit goes to the wallet named in the VERIFIED
 * Paystack metadata, never to whoever opened this URL. On success we redirect into
 * the app with a flag the UI can surface.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const reference = url.searchParams.get("reference") ?? "";
  const origin = process.env.APP_BASE_URL || url.origin;
  const base = origin.replace(/\/$/, "");

  if (!reference || !isWalletReference(reference)) {
    return NextResponse.redirect(`${base}/?topup=invalid`);
  }

  try {
    const data = await verifyTransaction(reference);
    if (String(data.status).toLowerCase() !== "success") {
      return NextResponse.redirect(`${base}/?topup=pending`);
    }
    await applyTopupFromPaystack(data);
    const scope = String((data.metadata as Record<string, unknown> | undefined)?.scope ?? "");
    // Consumer top-ups belong in the consumer app; workspace top-ups in the dashboard.
    const dest = scope === "consumer" ? "/me" : "/";
    return NextResponse.redirect(`${base}${dest}?topup=success`);
  } catch {
    // Payment may still be settling; the webhook will credit. Tell the user it's coming.
    return NextResponse.redirect(`${base}/?topup=processing`);
  }
}
