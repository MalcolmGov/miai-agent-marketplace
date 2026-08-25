import type { AuthContext } from "@/lib/auth";
import { getPersonalAgent } from "@/lib/consumer-catalog";
import { isSandbox } from "@/lib/sandbox";

/**
 * Consumer line — the individual-facing side of the platform.
 *
 * The B2B marketplace runs an agent on behalf of a business *tenant* (workspace) that rents it.
 * The consumer line runs an agent on behalf of a single *person*, drawing on that person's own
 * prepaid balance. Everything else (runtime, wallet adapter, catalog, session memory) is reused;
 * this module is just the two consumer-specific seams: which agents an individual may run, and
 * which wallet their usage debits.
 */

/** The flagship consumer agent, used when the caller doesn't name one. */
export const DEFAULT_CONSUMER_AGENT = "personal-assistant";

/**
 * Agents an individual is allowed to run on the consumer chat surface. This is an allowlist on
 * purpose: a consumer must not be able to invoke an arbitrary tenant/B2B agent id just by passing
 * it in the request body. Grows as the consumer catalogue (app-store) does.
 */
const CONSUMER_AGENTS = new Set<string>([DEFAULT_CONSUMER_AGENT]);

/**
 * Runtime allowlist for the consumer line. On production, the flagship assistant plus any *certified*
 * personal agent runs; in-certification specialists stay browse-only. In the SANDBOX (SANDBOX_MODE=1)
 * every catalogued specialist runs, so a partner's team can evaluate all of them. Either way the
 * security boundary holds: getPersonalAgent only resolves consumer-catalogue ids, so a business/tenant
 * agent id is never runnable here. Access is additionally gated by the person's prepaid balance, which
 * the wallet enforces.
 */
export async function isRunnableConsumerAgent(agentId: string): Promise<boolean> {
  if (CONSUMER_AGENTS.has(agentId)) return true;
  const entry = await getPersonalAgent(agentId);
  if (!entry) return false;
  return entry.certified === true || isSandbox();
}

export function consumerAgentIds(): string[] {
  return [...CONSUMER_AGENTS];
}

/**
 * The wallet id a consumer's usage debits.
 *
 * A consumer's prepaid balance lives in MyInstantAI's wallet, keyed by their account id — which,
 * under OIDC, is the verified token subject (`auth.userId`). We reuse the same wallet adapter as
 * the B2B side; only the id differs (a person, not a workspace).
 *
 * This is the ONE place to change if MyInstantAI namespaces consumer wallet ids differently (e.g.
 * a `usr_` prefix, or a separate ledger reached via a second adapter). The rest of the consumer
 * path treats the return value as an opaque wallet id and never assumes it equals a workspace id.
 */
export function walletIdForConsumer(auth: Pick<AuthContext, "userId">): string {
  return auth.userId;
}
