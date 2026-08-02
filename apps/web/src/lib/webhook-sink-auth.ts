/**
 * Webhook sink auth helpers (kept out of the route module so unit tests
 * don't need to load `next/server`).
 */

/** When `1`, reject legacy raw-secret signatures (HMAC v1 + timestamp required). */
export function webhookSinkHmacOnly(): boolean {
  return process.env.WEBHOOK_SINK_HMAC_ONLY === "1";
}

export function webhookSinkAllowLegacyRawSecret(): boolean {
  return !webhookSinkHmacOnly();
}
