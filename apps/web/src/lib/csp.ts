/**
 * Per-request CSP builder (nonce + strict-dynamic for scripts).
 *
 * style-src keeps 'unsafe-inline' for next/font + Tailwind (B+ deferred — removing it
 * without a full style-nonce pass breaks the App Router shell). Security win is script-src.
 */

export function buildContentSecurityPolicy(nonce: string): string {
  const scriptSrc = [`'self'`, `'nonce-${nonce}'`, `'strict-dynamic'`];
  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "worker-src 'self' blob:",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/** True when script-src no longer allows unsafe-inline (acceptance gate). */
export function scriptSrcAllowsUnsafeInline(csp: string): boolean {
  const script = csp
    .split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith("script-src "));
  return Boolean(script?.includes("'unsafe-inline'"));
}
