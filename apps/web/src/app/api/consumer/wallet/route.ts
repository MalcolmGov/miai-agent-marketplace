import { createWalletAdapter } from "@miai/wallet-adapter";
import { consumerAgentIds } from "@/lib/consumer";
import { requireConsumer } from "@/lib/consumer-auth";
import { apiErrorFromRequest, apiOk } from "@/lib/api-error";
import { walletTopUpBodySchema, formatZodError } from "@/lib/api-schemas";

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

/** Top up the consumer's prepaid balance. Same wallet adapter + package map as B2B, keyed by
 *  the consumer's own account id. In live mode this debits MyInstantAI's wallet top-up endpoint. */
export async function POST(req: Request) {
  const c = await requireConsumer(req);
  if (c instanceof Response) return c;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return apiErrorFromRequest(req, 400, "Invalid JSON body");
  }

  const parsed = walletTopUpBodySchema.safeParse(raw);
  if (!parsed.success) {
    return apiErrorFromRequest(req, 400, "Invalid request body", formatZodError(parsed.error));
  }

  const walletId = c.consumerId;
  const balance = await createWalletAdapter().topUp({
    workspaceId: walletId,
    packageId: parsed.data.packageId,
    usdAmount: parsed.data.usdAmount ?? 0,
  });

  return apiOk({
    tokens: balance.tokens,
    currency: balance.currencyLabel,
  });
}
