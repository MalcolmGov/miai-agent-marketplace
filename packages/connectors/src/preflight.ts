/**
 * P0-6 — connector preflight. Determine, for an agent + workspace, whether the ACTION tools that
 * need an external connector actually have one configured, so surfaces can honestly BADGE / notify
 * "needs setup" instead of letting an agent look usable and then silently degrade.
 *
 * Presence-only, never a live probe: readiness is decided from the stored token / binding config,
 * using getToken (the same source executeLive reads) — NOT getValidAccessToken (refreshes/deletes =
 * network + side effects) and NOT verifyConnector (a live API probe). This means it can occasionally
 * OVER-report ready for an expired-no-refresh token; that is acceptable because the runtime (P0-5)
 * still fails such an action honestly at tool-time. Errs toward under-warning, never a false block.
 *
 * Scope: gates only `oauth` and `mcp` connectors. `api_key` (whatsapp/stripe/woocommerce) is
 * intentionally out of scope for v1 — those can be configured via env vars or token metadata that
 * can't be cheaply enumerated here, so gating them would produce false "needs setup" badges.
 */
import type { ConnectorId, ToolBinding } from "./types.js";
import { isOAuthConnector } from "./oauth/providers.js";
import { getToken, listConnected } from "./oauth/tokens.js";
import { isActionTool, isInAppAssistantTool } from "./live/execute.js";

export type ConnectorKind = "oauth" | "mcp";

export interface MissingConnector {
  connector: ConnectorId;
  kind: ConnectorKind;
  /** The action tools that need this connector. */
  tools: string[];
  reason: "no_token" | "demo_token" | "missing_config";
}

export interface ConnectorReadiness {
  ready: boolean;
  /** True when readiness was short-circuited because connectors are stubbed (sandbox/demo). */
  sandbox: boolean;
  /** Distinct gated connectors this agent's action tools require. */
  required: ConnectorId[];
  missing: MissingConnector[];
}

/** A placeholder access token used in demo data — treated as NOT connected (parity with executeLive). */
const DEMO_TOKEN = "demo";

/**
 * The connector kinds a preflight gate covers. Returns null for kinds that never gate here:
 * `webhook` (the default binding for any unmapped tool; degrades locally) and `api_key` (v1 scope).
 */
function gateKind(connector: ConnectorId): ConnectorKind | null {
  if (connector === "mcp") return "mcp";
  if (isOAuthConnector(connector)) return "oauth";
  return null;
}

interface Requirement {
  kind: ConnectorKind;
  tools: string[];
  config?: Record<string, string>;
}

/**
 * Pure, zero-I/O. Given an agent's tools and ALREADY-RESOLVED bindings, the distinct external
 * connectors its ACTION tools require. A tool needs a connection only if it is an action tool (the
 * exact rule the runtime uses at execute-time), is NOT an in-app assistant tool (reminders / tasks /
 * memory degrade locally), and its bound connector is a gated kind. A tool with no binding defaults
 * to `webhook`, which is never gated.
 */
export function requiredConnectorMap(
  tools: { name: string }[],
  bindings: ToolBinding[],
): Map<ConnectorId, Requirement> {
  const byConnector = new Map<ConnectorId, Requirement>();
  for (const t of tools) {
    const name = t.name;
    if (!isActionTool(name) || isInAppAssistantTool(name)) continue;
    const binding = bindings.find((b) => b.tool === name);
    const connector = (binding?.connector ?? "webhook") as ConnectorId;
    const kind = gateKind(connector);
    if (!kind) continue;
    const cur = byConnector.get(connector) ?? { kind, tools: [], config: binding?.config };
    cur.tools.push(name);
    if (!cur.config && binding?.config) cur.config = binding.config;
    byConnector.set(connector, cur);
  }
  return byConnector;
}

/** The distinct gated connectors an agent's action tools require (pure, zero-I/O). */
export function requiredExternalConnectors(
  tools: { name: string }[],
  bindings: ToolBinding[],
): ConnectorId[] {
  return [...requiredConnectorMap(tools, bindings).keys()];
}

/**
 * Whether every gated connector an agent's action tools require is configured for this workspace.
 * Sandbox-inert (returns ready before any read when connectors are stubbed). Does ONE mem-only
 * presence read (listConnected) and only reads a token for connectors that actually have one — never
 * a DB round-trip for an unconnected connector (which is exactly the set the gate targets).
 */
export async function computeConnectorReadiness(
  workspaceId: string,
  tools: { name: string }[],
  bindings: ToolBinding[],
  opts?: { mode?: "sandbox" | "live" },
): Promise<ConnectorReadiness> {
  // Sandbox short-circuit FIRST — mirrors executeConnector (index.ts): connectors are stubbed for
  // the demo, so the gate must be inert. No token reads, nothing missing.
  if (opts?.mode === "sandbox" || process.env.SANDBOX_MODE === "1") {
    return { ready: true, sandbox: true, required: [], missing: [] };
  }

  const need = requiredConnectorMap(tools, bindings);
  const required = [...need.keys()];
  if (required.length === 0) {
    return { ready: true, sandbox: false, required, missing: [] };
  }

  // One mem-only presence read (hydrate loads the whole table once, process-cached) — so an
  // unconnected connector costs nothing, rather than a Postgres SELECT-returning-null per turn.
  const connected = new Set(await listConnected(workspaceId));
  const missing: MissingConnector[] = [];

  for (const [connector, info] of need) {
    const config = info.config ?? {};
    if (info.kind === "mcp") {
      // Configured via a stored endpoint or a binding-supplied endpoint.
      if (config.endpoint) continue;
      if (connected.has(connector)) {
        const tok = await getToken(workspaceId, connector); // mem hit (already hydrated)
        if (tok?.meta?.endpoint) continue;
      }
      missing.push({ connector, kind: "mcp", tools: info.tools, reason: "missing_config" });
      continue;
    }

    // oauth — a binding-supplied token counts (parity with executeLive's config.access_token path).
    if (config.access_token && config.access_token !== DEMO_TOKEN) continue;
    if (connected.has(connector)) {
      const tok = await getToken(workspaceId, connector); // mem hit
      if (tok?.accessToken && tok.accessToken !== DEMO_TOKEN) continue;
      missing.push({
        connector,
        kind: "oauth",
        tools: info.tools,
        reason: tok?.accessToken === DEMO_TOKEN ? "demo_token" : "no_token",
      });
      continue;
    }
    missing.push({ connector, kind: "oauth", tools: info.tools, reason: "no_token" });
  }

  return { ready: missing.length === 0, sandbox: false, required, missing };
}
