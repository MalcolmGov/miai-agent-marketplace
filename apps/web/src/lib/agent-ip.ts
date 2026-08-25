import type { AgentPackage } from "@miai/agent-protocol";

/**
 * Agent IP protection.
 *
 * The crown jewels — the system prompt, guardrails and eval sets — are never needed by
 * any client (the studio configures knowledge/tools/model; the agent runs server-side with
 * the full package). So we strip them from every package that leaves the server for a
 * browser or API caller, on production and sandbox alike, so the library can't be
 * enumerated-and-scraped through the API.
 */
export const AGENT_IP_REDACTED = "[Restricted — not exposed through the API.]";

export function redactAgentPackage(pkg: AgentPackage): AgentPackage {
  return {
    ...pkg,
    system_prompt: AGENT_IP_REDACTED,
    guardrails: AGENT_IP_REDACTED,
    evals: [],
  };
}
