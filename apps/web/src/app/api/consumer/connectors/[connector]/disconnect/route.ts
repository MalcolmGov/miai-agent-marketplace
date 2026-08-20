import { deleteToken } from "@miai/connectors";
import { requireConsumer } from "@/lib/consumer-auth";
import { isConsumerConnector } from "@/lib/consumer-connectors";
import { apiErrorFromRequest, apiOk } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** Unlink a connector for the signed-in consumer — removes their stored token for it. */
export async function POST(req: Request, ctx: { params: Promise<{ connector: string }> }) {
  const c = await requireConsumer(req);
  if (c instanceof Response) return c;
  const consumerId = c.consumerId;

  const { connector } = await ctx.params;
  if (!isConsumerConnector(connector)) {
    return apiErrorFromRequest(req, 400, "Not a connector available on the consumer line");
  }

  await deleteToken(consumerId, connector);
  return apiOk({ disconnected: connector });
}
