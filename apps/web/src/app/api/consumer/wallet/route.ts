import { createWalletAdapter } from "@miai/wallet-adapter";
import { consumerAgentIds } from "@/lib/consumer";
import { requireConsumer } from "@/lib/consumer-auth";
import { apiOk } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** The signed-in consumer's prepaid balance, read from MyInstantAI's wallet via the shared
 *  adapter. No workspace/tenant here — the wallet is keyed by the consumer's own account. */
export async function GET(req: Request) {
  const c = await requireConsumer(req);
  if (c instanceof Response) return c;

  const walletId = c.consumerId;
  const balance = await createWalletAdapter().getBalance(walletId);

  return apiOk({
    tokens: balance.tokens,
    currency: balance.currencyLabel,
    lowBalance: balance.tokens <= 0,
    agents: consumerAgentIds(),
  });
}
