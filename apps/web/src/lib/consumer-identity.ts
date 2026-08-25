import { AuthError, resolveAuth, type AuthContext } from "@/lib/auth";
import { readConsumerSession } from "@/lib/consumer-session";
import { WORKSPACE_ID } from "@/lib/constants";

/**
 * Consumer identity resolution — kept free of `next/server` so it can be unit-tested and imported
 * by the runtime path. requireConsumer (in consumer-auth.ts) wraps this to turn AuthError into an
 * HTTP Response.
 */

/** The brand/tenant a consumer's memory + wallet are scoped to (the person is scoped within it). */
function consumerBrand(req: Request): string {
  const url = new URL(req.url);
  return req.headers.get("x-workspace-id") || url.searchParams.get("workspaceId") || WORKSPACE_ID;
}

/**
 * Resolve the consumer's identity for a consumer API route.
 * - mock mode: the shared demo identity (frictionless sandbox), via resolveAuth.
 * - oidc mode: the person is identified by their signed session cookie (Sign in with Google) —
 *   `userId` = the verified subject (Google `sub`), tenant = the brand. No session ⇒ 401, so a
 *   signed-out person is prompted to sign in rather than sharing the demo memory bucket.
 *
 * The consumer line is Bearer-gate-public (see public-paths); this IS the enforcement for it.
 */
export async function resolveConsumerAuth(req: Request): Promise<AuthContext> {
  if (process.env.MIAI_AUTH_MODE !== "oidc") {
    return resolveAuth(req);
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
