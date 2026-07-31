import { createHmac } from "node:crypto";
import type { AgentState, ChatMessage } from "@miai/runtime";
import type { ToolBinding } from "@miai/connectors";

/** Secret for deriving embed keys. Falls back to OAUTH_TOKEN_SECRET so no extra
 *  config is needed; set EMBED_KEY_SECRET separately if you ever rotate the OAuth
 *  secret without wanting to invalidate installed website snippets. */
function embedSecret(): string {
  return process.env.EMBED_KEY_SECRET ?? process.env.OAUTH_TOKEN_SECRET ?? "dev-only-change-me";
}

/** Deterministic, stateless embed key: survives redeploys, needs no storage, and
 *  is verifiable by recomputation. A customer's installed snippet keeps working
 *  forever — the in-memory registry is only a legacy fallback. */
export function embedKeyFor(workspaceId: string, agentId: string): string {
  const id = Buffer.from(`${workspaceId}::${agentId}`, "utf8").toString("base64url");
  const mac = createHmac("sha256", embedSecret()).update(id).digest("hex").slice(0, 10);
  return `mia_pk_${id}_${mac}`;
}

export type RentTier = "standard" | "pro" | "enterprise";

export interface WorkspaceAgent {
  agentId: string;
  state: AgentState;
  model: string;
  knowledge: string;
  tier: RentTier;
  publicKey: string;
  bindings: ToolBinding[];
  connectedConnectors: string[];
  messages: ChatMessage[];
  rentedAt?: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  workspaceId: string;
  agentId?: string;
  type: string;
  detail: Record<string, unknown>;
}

interface WorkspaceRecord {
  agents: Map<string, WorkspaceAgent>;
  embedKeys: Map<string, string>; // publicKey -> agentId
}

const g = globalThis as typeof globalThis & {
  __miaiStore?: {
    workspaces: Map<string, WorkspaceRecord>;
    audit: AuditEvent[];
  };
};

function store() {
  if (!g.__miaiStore) {
    g.__miaiStore = { workspaces: new Map(), audit: [] };
  }
  return g.__miaiStore;
}

function ws(workspaceId: string): WorkspaceRecord {
  const s = store();
  if (!s.workspaces.has(workspaceId)) {
    s.workspaces.set(workspaceId, { agents: new Map(), embedKeys: new Map() });
  }
  return s.workspaces.get(workspaceId)!;
}

export function getWorkspaceAgent(workspaceId: string, agentId: string): WorkspaceAgent | undefined {
  return ws(workspaceId).agents.get(agentId);
}

export function listWorkspaceAgents(workspaceId: string): WorkspaceAgent[] {
  return [...ws(workspaceId).agents.values()];
}

export function upsertWorkspaceAgent(
  workspaceId: string,
  agentId: string,
  patch: Partial<Omit<WorkspaceAgent, "agentId">> & { agentId?: string },
): WorkspaceAgent {
  const current = ws(workspaceId).agents.get(agentId);
  const { agentId: _ignored, ...rest } = patch;
  void _ignored;
  const next: WorkspaceAgent = {
    state: "selected",
    model: "claude-sonnet",
    knowledge: "",
    tier: "standard",
    publicKey: current?.publicKey ?? embedKeyFor(workspaceId, agentId),
    bindings: [],
    connectedConnectors: [],
    messages: [],
    ...current,
    ...rest,
    agentId,
  };
  ws(workspaceId).agents.set(agentId, next);
  ws(workspaceId).embedKeys.set(next.publicKey, agentId);
  return next;
}

export function resolveEmbedKey(publicKey: string): { workspaceId: string; agentId: string } | null {
  // Deterministic keys: decode + verify by recomputing the MAC. No storage involved.
  const m = /^mia_pk_([A-Za-z0-9_-]+)_([a-f0-9]{10})$/.exec(publicKey);
  if (m) {
    const [, id, mac] = m;
    const expected = createHmac("sha256", embedSecret()).update(id).digest("hex").slice(0, 10);
    if (mac === expected) {
      const decoded = Buffer.from(id, "base64url").toString("utf8");
      const sep = decoded.indexOf("::");
      if (sep > 0) {
        return { workspaceId: decoded.slice(0, sep), agentId: decoded.slice(sep + 2) };
      }
    }
  }
  // Legacy fallback: keys minted by older builds live in the in-memory registry.
  for (const [workspaceId, rec] of store().workspaces) {
    const agentId = rec.embedKeys.get(publicKey);
    if (agentId) return { workspaceId, agentId };
  }
  return null;
}

export function appendAudit(event: Omit<AuditEvent, "id" | "at">): AuditEvent {
  const row: AuditEvent = {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    ...event,
  };
  const s = store();
  s.audit.unshift(row);
  if (s.audit.length > 500) s.audit.length = 500;
  return row;
}

export function listAudit(limit = 50): AuditEvent[] {
  return store().audit.slice(0, limit);
}

export function opsSummary(workspaceId: string) {
  const agents = listWorkspaceAgents(workspaceId);
  const audit = store().audit.filter((a) => a.workspaceId === workspaceId);
  const turns = audit.filter((a) => a.type === "agent_turn").length;
  const toolFails = audit.filter((a) => a.type === "tool_error").length;
  return {
    rented: agents.filter((a) => ["rented", "live", "paused_no_tokens"].includes(a.state)).length,
    live: agents.filter((a) => a.state === "live").length,
    paused: agents.filter((a) => a.state === "paused_no_tokens").length,
    turns,
    toolFails,
    agents: agents.map((a) => ({
      agentId: a.agentId,
      state: a.state,
      model: a.model,
      connectors: a.connectedConnectors,
    })),
  };
}
