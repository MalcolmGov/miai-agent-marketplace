import { listTokenMeta } from "@miai/connectors";
import { requireConsumer } from "@/lib/consumer-auth";
import { consumerOAuthConnectors } from "@/lib/consumer-connectors";
import { apiOk } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** Which connectors the signed-in consumer has linked, and which their agents still need.
 *  Token material never leaves the store — this returns metadata only. */
export async function GET(req: Request) {
  const c = await requireConsumer(req);
  if (c instanceof Response) return c;

  const consumerId = c.consumerId;
  const needed = consumerOAuthConnectors();
  const meta = await listTokenMeta(consumerId);
  const byId = new Map(meta.map((m) => [m.connectorId, m]));

  const connectors = needed.map((connector) => {
    const m = byId.get(connector);
    return {
      connector,
      connected: byId.has(connector),
      // Last read-only verification: true = working, false = connected-but-broken (reconnect),
      // null = connected but never checked / no probe for this connector.
      working: m?.verified ?? null,
      verifiedAt: m?.verifiedAt ?? null,
      updatedAt: m?.updatedAt ?? null,
    };
  });

  return apiOk({
    connectors,
    allConnected: connectors.every((c) => c.connected),
  });
}
