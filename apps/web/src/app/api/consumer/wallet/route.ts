import { createWalletAdapter } from "@miai/wallet-adapter";
import { consumerAgentIds } from "@/lib/consumer";
import { requireConsumer } from "@/lib/consumer-auth";
import { apiOk, correlationFromHeaders } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** The signed-in consumer's prepaid balance, read from MyInstantAI's wallet via the shared
 *  adapter. No workspace/tenant here — the wallet is keyed by the consumer's own account. */
export async function GET(req: Request) {
  const c = await requireConsumer(req);
  if (c instanceof Response) return c;

  const walletId = c.consumerId;
  // The wallet gateway can be briefly unreachable (5xx / network). This is a read-only balance
  // readout, so degrade gracefully — report the balance as unavailable rather than 500-ing the page
  // (the money-path TURN fails open separately in the runtime). The client already treats a
  // non-numeric `tokens` as "no balance shown", and the agents list is wallet-independent so it
  // stays useful during the blip.
  try {
    const balance = await createWalletAdapter().getBalance(walletId);
    return apiOk({
      tokens: balance.tokens,
      currency: balance.currencyLabel,
      lowBalance: balance.tokens <= 0,
      agents: consumerAgentIds(),
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "miai.wallet_read_failed",
        correlationId: correlationFromHeaders(req.headers),
        message: err instanceof Error ? err.message : String(err),
      }),
    );
    return apiOk({
      tokens: null,
      currency: null,
      lowBalance: false,
      agents: consumerAgentIds(),
      unavailable: true,
    });
  }
}
