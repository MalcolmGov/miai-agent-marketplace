import { apiOk } from "@/lib/api-error";
import { listConsumerAgents } from "@/lib/consumer-catalog";

export const dynamic = "force-dynamic";

/**
 * GET /api/consumer/agents
 *
 * Returns the consumer-facing agent catalogue (the vetted agents an individual may run).
 * Server-side only — the catalogue loader reads agent packages from disk (`fs`), which can't
 * run in a client component, so the UI fetches this route instead.
 */
export async function GET() {
  const agents = await listConsumerAgents();
  return apiOk({ agents });
}
