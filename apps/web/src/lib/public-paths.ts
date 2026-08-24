/**
 * Single source of truth for API routes that are PUBLIC under OIDC (no MyInstantAI
 * Bearer token required). Imported by both `middleware.ts` (the edge pre-handler 401
 * gate) and `lib/auth.ts`, so the two lists can never drift — previously they did, and
 * the documented `/api/v1/embed/chat` contract 401'd under OIDC because middleware's
 * inline list omitted `/api/v1/`.
 *
 * Keep this module dependency-free so it stays safe to import into the edge runtime.
 *
 * "Public" means authenticated by a mechanism OTHER than the OIDC Bearer:
 *   - embed / app chat and their versioned aliases  → publishable `mia_pk_` keys
 *   - webhook / mcp sinks                            → their own shared secrets
 *   - oauth callback                                 → provider redirect (signed state)
 *   - health / catalog / openapi / consent / handoff → unauthenticated by design
 *
 * Everything else — including `/api/v1/rent`, `/api/ops`, `/api/admin` — still requires a
 * verified Bearer under OIDC.
 */

const PUBLIC_EXACT = new Set([
  "/api/health",
  "/api/catalog",
  "/api/consent",
  "/api/auth/handoff",
  "/api/v1/openapi",
  // Cron sweep for consumer daily briefs — authenticated by CRON_SECRET in the route, not OIDC.
  "/api/consumer/brief/run-due",
  // Paystack top-up webhook — authenticated by its HMAC-SHA512 signature, not OIDC.
  "/api/payments/paystack/webhook",
  // Paystack browser return — verifies the reference with Paystack and credits the
  // wallet named in the VERIFIED metadata, not the caller. (Its sibling
  // /api/payments/paystack/init stays behind the bearer gate.)
  "/api/payments/paystack/return",
]);

const PUBLIC_PREFIXES = [
  "/api/catalog/",
  "/api/oauth/callback",
  "/api/embed/",
  "/api/app/",
  "/api/v1/embed/",
  "/agents/v1/",
  "/api/webhook/sink",
  "/api/mcp",
];

/** True when `pathname` should skip the OIDC Bearer check. */
export function isPublicApiPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}
