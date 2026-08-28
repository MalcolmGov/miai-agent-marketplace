import { AuthError, type AuthContext } from "@/lib/auth";
import { readConsumerSession } from "@/lib/consumer-session";
import { WORKSPACE_ID, DEMO_CONSUMER_ID } from "@/lib/constants";

/**
 * Consumer identity resolution — kept free of `next/server` so it can be unit-tested and imported
 * by the runtime path. requireConsumer (in consumer-auth.ts) wraps this to turn AuthError into an
 * HTTP Response.
 */

/**
 * The brand/tenant namespace for a consumer's MEMORY (key `${tenantId}::${consumerId}`). It is
 * CLIENT-SUPPLIED (x-workspace-id header / ?workspaceId query) and trusted with NO membership check.
 * That is safe ONLY because it scopes just the memory namespace PREFIX: the wallet re-keys off the
 * auth-pinned consumerId and knowledge off the auth-pinned walletId, so a foreign workspaceId reaches
 * only a different namespace of the SAME person's own memory — never another person's data.
 * INVARIANT: any NEW resource keyed off this value ALONE (without the consumerId dimension) becomes a
 * client-controlled cross-tenant read — always compound-key it with the authenticated identity.
 */
function consumerBrand(req: Request): string {
  const url = new URL(req.url);
  return req.headers.get("x-workspace-id") || url.searchParams.get("workspaceId") || WORKSPACE_ID;
}

/**
 * Resolve the consumer's identity for a consumer API route.
 * - mock mode: a FIXED shared demo identity (DEMO_CONSUMER_ID) — never client-controlled.
 * - oidc mode: the person is identified by their signed session cookie (Sign in with Google) —
 *   `userId` = the verified subject (Google `sub`), tenant = the brand. No session ⇒ 401, so a
 *   signed-out person is prompted to sign in rather than sharing the demo memory bucket.
 *
 * The consumer line is Bearer-gate-public (see public-paths); this IS the enforcement for it, so
 * it must be fail-closed on identity in BOTH modes. In mock mode we deliberately do NOT call the
 * generic resolveAuth: that reads `?userId` / `x-user-id`, which on this public surface would let
 * any anonymous caller impersonate another consumer's wallet + memory (both keyed on this id).
 * Only the brand namespace (consumerBrand) varies in mock mode; the person is pinned.
 */
export async function resolveConsumerAuth(req: Request): Promise<AuthContext> {
  if (process.env.MIAI_AUTH_MODE !== "oidc") {
    return {
      mode: "mock",
      workspaceId: consumerBrand(req),
      userId: DEMO_CONSUMER_ID,
      roles: [],
    };
  }
  const session = await readConsumerSession(req);
  if (!session) {
    throw new AuthError(401, "Sign in required");
  }
  return {
    mode: "oidc",
    workspaceId: consumerBrand(req),
    userId: session.sub,
    roles: [],
  };
}
