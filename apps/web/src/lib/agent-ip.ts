import type { AgentPackage } from "@miai/agent-protocol";
import { cleanKnowledgeBase } from "./knowledge-guidance";

/**
 * Agent IP protection.
 *
 * The crown jewels — the system prompt, guardrails and eval sets — are never needed by
 * any client (the studio configures knowledge/tools/model; the agent runs server-side with
 * the full package). So we strip them from every package that leaves the server for a
 * browser or API caller, on production and sandbox alike, so the library can't be
 * enumerated-and-scraped through the API.
 *
 * In addition, user-facing knowledge is sanitized to remove internal evaluation
 * grounding tokens (such as eval grounding blocks or test phrases).
 */
export const AGENT_IP_REDACTED = "[Restricted — not exposed through the API.]";

export function redactAgentPackage(pkg: AgentPackage): AgentPackage {
  return {
    ...pkg,
    knowledge: cleanKnowledgeBase(pkg.knowledge || ""),
    system_prompt: AGENT_IP_REDACTED,
    guardrails: AGENT_IP_REDACTED,
    evals: [],
  };
}
