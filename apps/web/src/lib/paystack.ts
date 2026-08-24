import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Paystack payment client — one-time token top-ups.
 *
 * Ported from the Zara/aria billing integration (billing/paystack.py) to keep the
 * two products' payment conventions identical: HMAC-SHA512 webhook signatures,
 * `amount` in the currency's minor unit (cents), and `wtu_`-namespaced references
 * so the wallet top-up flow is idempotent by reference.
 *
 * There is deliberately NO subscription/plan support here — MVP is prepaid tokens
 * only (see docs: no rental, no recurring billing).
 */

const BASE_URL = "https://api.paystack.co";

function env(name: string): string {
  return process.env[name] ?? "";
}

export function secretKey(): string {
  return env("PAYSTACK_SECRET_KEY");
}

export function publicKey(): string {
  return env("PAYSTACK_PUBLIC_KEY");
}

/** True once a live secret key is present. Routes 503 when this is false. */
export function isConfigured(): boolean {
  return Boolean(secretKey());
}

/**
 * Settlement currency Paystack bills in. Packages are labelled in USD; this is what
 * the merchant account actually charges. Overridable per-market (ZAR/NGN/GHS/KES).
 */
export function currency(): string {
  return (env("PAYSTACK_CURRENCY") || "USD").toUpperCase();
}

/** USD (major unit) → the currency's minor unit (× 100), which is what Paystack expects. */
export function toMinorUnits(usdAmount: number): number {
  return Math.round(usdAmount * 100);
}

function headers(): Record<string, string> {
  return {
    authorization: `Bearer ${secretKey()}`,
    "content-type": "application/json",
  };
}

async function paystackFetch(path: string, init: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { ...headers(), ...(init.headers ?? {}) },
      signal: controller.signal,
    });
    const body = (await res.json().catch(() => ({}))) as {
      status?: boolean;
      message?: string;
      data?: unknown;
    };
    if (!res.ok || !body.status) {
      throw new Error(`Paystack ${path} failed: ${body.message ?? res.status}`);
    }
    return body.data;
  } finally {
    clearTimeout(timer);
  }
}

export interface InitializeResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

/**
 * Create a Paystack transaction (hosted checkout).
 * `amountMinor` is in the currency's smallest unit (cents). Returns the
 * authorization_url the browser is redirected to.
 */
export async function initializeTransaction(args: {
  email: string;
  amountMinor: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<InitializeResult> {
  if (!isConfigured()) throw new Error("PAYSTACK_SECRET_KEY is not set");
  const data = (await paystackFetch("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: args.email,
      amount: args.amountMinor,
      currency: currency(),
      reference: args.reference,
      callback_url: args.callbackUrl,
      metadata: args.metadata ?? {},
    }),
  })) as InitializeResult;
  return data;
}

export interface VerifiedTransaction {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  metadata: Record<string, unknown>;
}

/** Verify a transaction by reference (source of truth for the return-URL fallback). */
export async function verifyTransaction(reference: string): Promise<VerifiedTransaction> {
  const data = (await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
  })) as VerifiedTransaction;
  return data;
}

/**
 * Verify a Paystack webhook: HMAC-SHA512 of the raw body with the secret key,
 * compared to the `x-paystack-signature` header. Timing-safe.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const key = secretKey();
  if (!key || !signature) return false;
  const expected = createHmac("sha512", key).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
