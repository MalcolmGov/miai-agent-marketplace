import type { AgentPackage } from "@miai/agent-protocol";

/**
 * Sandbox mode — an isolated evaluation deployment for a partner's technical team.
 *
 * A sandbox is the real, running platform with the risk taken out:
 *  - mock auth + mock wallet (instant demo login, no real money) — see mockRailsAllowed()
 *  - live connectors are force-stubbed (no real sends/writes) — see @miai/connectors executeConnector
 *  - the model can be capped (see @miai/runtime createModelAdapter)
 *  - crown-jewel IP (system prompt, guardrails, eval sets) is redacted from client responses
 *
 * Toggle with SANDBOX_MODE=1 on an isolated deployment (separate DB + capped keys).
 */
export function isSandbox(): boolean {
  return process.env.SANDBOX_MODE === "1";
}

export const SANDBOX_REDACTED =
  "[Hidden in the sandbox evaluation environment — included in your production deployment.]";

/**
 * Strip the crown-jewel IP from an agent package before it is sent to a sandbox client,
 * so the platform can be used, tested and configured without the agent library being
 * bulk-scraped via the API. The full package is still used server-side to run the agent.
 */
export function redactAgentPackage(pkg: AgentPackage): AgentPackage {
  return {
    ...pkg,
    system_prompt: SANDBOX_REDACTED,
    guardrails: SANDBOX_REDACTED,
    evals: [],
  };
}
