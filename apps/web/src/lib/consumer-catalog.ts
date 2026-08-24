import type { AgentPackage } from "@miai/agent-protocol";
import { consumerAgentIds, DEFAULT_CONSUMER_AGENT } from "@/lib/consumer";
import { getAgentPackage } from "@/lib/catalog";

export interface ConsumerAgentCard {
  id: string;
  name: string;
  summary: string;
  emoji: string;
  tools: number;
  isDefault: boolean;
}

const AGENT_EMOJI: Record<string, string> = {
  "personal-assistant": "🤖",
  "travel-planner": "✈️",
  "learning-tutor": "📚",
  "career-coach": "💼",
  "family-organizer": "🏠",
};

/** Load the consumer-facing agent catalogue from the catalog packages. */
export async function listConsumerAgents(): Promise<ConsumerAgentCard[]> {
  const ids = consumerAgentIds();
  const cards: ConsumerAgentCard[] = [];

  for (const id of ids) {
    const pkg: AgentPackage | null = await getAgentPackage(id);
    if (!pkg) continue;
    cards.push({
      id,
      name: pkg.manifest.name,
      summary: pkg.manifest.summary || "",
      emoji: AGENT_EMOJI[id] || "✨",
      tools: pkg.tools?.length ?? 0,
      isDefault: id === DEFAULT_CONSUMER_AGENT,
    });
  }

  return cards;
}