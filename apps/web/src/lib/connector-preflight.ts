/**
 * P0-6 — apps/web wrapper around @miai/connectors' connector preflight.
 *
 * Keeps the preset dependency in apps/web (the connectors package must not import @miai/presets —
 * that would be circular). Resolves an agent's tool→connector bindings with the SAME precedence the
 * rent + runtime paths use, computes workspace readiness, and produces the two consumer shapes:
 * a `systemAppend` line that keeps the model honest about unconnected connectors, and a compact
 * `connectorNotice` for an up-front UI banner + "Connect X" CTA.
 */
import { getPreset, defaultBindingsForTools } from "@miai/presets";
import {
  CONNECTORS,
  computeConnectorReadiness,
  requiredExternalConnectors,
  type ConnectorId,
  type ConnectorReadiness,
  type ToolBinding,
} from "@miai/connectors";

interface PkgLike {
  manifest: { id: string };
  tools: { name: string }[];
}

const CONNECTOR_NAME = new Map<string, string>(CONNECTORS.map((c) => [c.id, c.name]));

/** Human label for a connector id (falls back to the raw id). */
export function connectorLabel(id: string): string {
  return CONNECTOR_NAME.get(id) ?? id;
}

/** Resolve an agent's bindings with the runtime/rent precedence: explicit → preset → tool defaults. */
export function resolvePkgBindings(pkg: PkgLike, override?: ToolBinding[]): ToolBinding[] {
  if (override && override.length) return override;
  const preset = getPreset(pkg.manifest.id);
  return preset?.bindings ?? defaultBindingsForTools(pkg.tools.map((t) => t.name));
}

/** The gated connectors an agent requires, workspace-independent (for the static catalogue badge). */
export function agentRequiredConnectors(pkg: PkgLike, override?: ToolBinding[]): ConnectorId[] {
  return requiredExternalConnectors(pkg.tools, resolvePkgBindings(pkg, override));
}

export interface ConnectorNotice {
  ready: boolean;
  missing: { connector: ConnectorId; name: string; tools: string[] }[];
}

export interface AgentReadiness {
  readiness: ConnectorReadiness;
  /** System-prompt line keeping the model honest about unconnected connectors (empty when ready). */
  systemAppend: string;
  /** Compact payload for a UI banner + "Connect X" CTA (null when ready or sandbox). */
  connectorNotice: ConnectorNotice | null;
}

const READY: AgentReadiness = {
  readiness: { ready: true, sandbox: false, required: [], missing: [] },
  systemAppend: "",
  connectorNotice: null,
};

/**
 * Compute an agent's connector readiness for a workspace and the consumer shapes. Sandbox-inert
 * (the underlying helper short-circuits on SANDBOX_MODE / mode:'sandbox' before any token read).
 */
export async function agentReadiness(
  workspaceId: string,
  pkg: PkgLike,
  override?: ToolBinding[],
  mode?: "sandbox" | "live",
): Promise<AgentReadiness> {
  const bindings = resolvePkgBindings(pkg, override);
  const readiness = await computeConnectorReadiness(workspaceId, pkg.tools, bindings, { mode });
  if (readiness.ready || readiness.sandbox) return { ...READY, readiness };

  const missing = readiness.missing.map((m) => ({
    connector: m.connector,
    name: connectorLabel(m.connector),
    tools: m.tools,
  }));
  const list = missing.map((m) => m.name).join(", ");
  const systemAppend =
    `\n\n## Connector status\n` +
    `These connectors are NOT connected for this workspace yet: ${list}. ` +
    `Do not claim any action that needs them has succeeded — no bookings, orders, tickets, payments, ` +
    `or messages "sent". If the user asks for such an action, say it needs connecting first and offer ` +
    `to connect it (in Actions) or hand off to a human.`;

  return { readiness, systemAppend, connectorNotice: { ready: false, missing } };
}
