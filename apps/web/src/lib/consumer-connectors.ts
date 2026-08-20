import { isOAuthConnector, type OAuthConnectorId } from "@miai/connectors";
import { getPreset } from "@miai/presets";
import { consumerAgentIds } from "@/lib/consumer";

/**
 * Which OAuth connectors a consumer needs to link for their consumer agents to run live
 * (rather than returning "complete Connect" stubs). Derived from the consumer agents' presets,
 * so it stays correct as the consumer catalogue grows — e.g. the personal assistant binds inbox
 * tools to `email` and calendar tools to `google_calendar`.
 *
 * Non-OAuth connectors (webhook) are internal and never surfaced to the consumer.
 */
export function consumerOAuthConnectors(): OAuthConnectorId[] {
  const set = new Set<OAuthConnectorId>();
  for (const agentId of consumerAgentIds()) {
    const preset = getPreset(agentId);
    for (const b of preset?.bindings ?? []) {
      if (isOAuthConnector(b.connector)) set.add(b.connector as OAuthConnectorId);
    }
  }
  return [...set];
}

/**
 * A consumer may only connect a connector that one of their agents actually uses — never an
 * arbitrary connector id passed in the URL.
 */
export function isConsumerConnector(connector: string): connector is OAuthConnectorId {
  return (
    isOAuthConnector(connector) &&
    consumerOAuthConnectors().includes(connector as OAuthConnectorId)
  );
}
