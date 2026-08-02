/**
 * Outbound webhook authenticity — HMAC-SHA256 over `${timestamp}.${body}`.
 * Header: x-miai-signature: v1=<hex>
 * Header: x-miai-timestamp: <unix ms>
 *
 * Legacy: raw shared secret in x-miai-signature is still accepted by verify()
 * for one release while sinks migrate.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_SKEW_MS = 5 * 60 * 1000;

export function timingSafeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function signWebhookPayload(secret: string, timestampMs: string, body: string): string {
  const mac = createHmac("sha256", secret).update(`${timestampMs}.${body}`).digest("hex");
  return `v1=${mac}`;
}

export function verifyWebhookSignature(opts: {
  secret: string;
  signature: string;
  timestamp: string | null;
  body: string;
  /** Allow raw shared-secret compare (pre-HMAC clients). Default true. */
  allowLegacyRawSecret?: boolean;
}): boolean {
  const { secret, signature, timestamp, body } = opts;
  if (!secret || !signature) return false;

  if (signature.startsWith("v1=")) {
    if (!timestamp) return false;
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_SKEW_MS) return false;
    const expected = signWebhookPayload(secret, timestamp, body);
    return timingSafeEqualString(signature, expected);
  }

  if (opts.allowLegacyRawSecret === false) return false;
  return timingSafeEqualString(signature, secret);
}
