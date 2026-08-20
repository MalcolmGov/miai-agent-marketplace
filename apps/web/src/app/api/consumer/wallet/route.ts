import { createWalletAdapter } from "@miai/wallet-adapter";
import { resolveAuth, AuthError } from "@/lib/auth";
import { walletIdForConsumer, consumerAgentIds } from "@/lib/consumer";
import { apiErrorFromRequest, apiOk } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** The signed-in consumer's prepaid balance, read from MyInstantAI's wallet via the shared
 *  adapter. No workspace/tenant here — the wallet is keyed by the consumer's own account. */
export async function GET(req: Request) {
  let auth;
  try {
    auth = await resolveAuth(req);
  } catch (e) {
    if (e instanceof AuthError) return apiErrorFromRequest(req, e.status, e.message);
    throw e;
  }

  const walletId = walletIdForConsumer(auth);
  const balance = await createWalletAdapter().getBalance(walletId);

  return apiOk({
    tokens: balance.tokens,
    currency: balance.currencyLabel,
    lowBalance: balance.tokens <= 0,
    agents: consumerAgentIds(),
  });
}
