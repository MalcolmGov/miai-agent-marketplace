/**
 * Sandbox mode — an isolated evaluation deployment for a partner's technical team.
 *
 * A sandbox is the real, running platform with the risk taken out:
 *  - mock auth + mock wallet (instant demo login, no real money) — see mockRailsAllowed()
 *  - live connectors are force-stubbed (no real sends/writes) — see @miai/connectors executeConnector
 *  - the model can be capped (see @miai/runtime createModelAdapter)
 *
 * Agent IP (system prompt / guardrails / evals) is redacted from API responses everywhere,
 * not just in sandbox — see lib/agent-ip.ts.
 *
 * Toggle with SANDBOX_MODE=1 on an isolated deployment (separate DB + capped keys).
 */
export function isSandbox(): boolean {
  return process.env.SANDBOX_MODE === "1";
}
