import { AuthError, resolveAuth, type AuthContext } from "@/lib/auth";
import { walletIdForConsumer } from "@/lib/consumer";
import { apiErrorFromRequest } from "@/lib/api-error";

export type ResolvedConsumer = { consumerId: string; auth: AuthContext };

/**
 * Resolve the signed-in consumer (identity + wallet id) for a consumer API route, or a
 * ready-to-return auth error Response. Every consumer endpoint starts with this, so the auth
 * handling lives in one place. `consumerId` is the account id their usage and connector tokens
 * are keyed by.
 *
 * Kept out of `consumer.ts` on purpose: this pulls in `next/server` (via api-error), and
 * `consumer.ts` is imported by the plain-Node-tested runtime path (`consumer-turn.ts`), which
 * must stay free of `next/server`.
 */
export async function requireConsumer(req: Request): Promise<ResolvedConsumer | Response> {
  try {
    const auth = await resolveAuth(req);
    return { consumerId: walletIdForConsumer(auth), auth };
  } catch (e) {
    if (e instanceof AuthError) return apiErrorFromRequest(req, e.status, e.message);
    throw e;
  }
}
