import type { AgentState, ChatMessage } from "@miai/runtime";
import type { ToolBinding } from "@miai/connectors";

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
    publicKey: current?.publicKey ?? `mia_pk_${agentId.replace(/[^a-z0-9]/gi, "").slice(0, 12)}_${Math.random().toString(36).slice(2, 8)}`,
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
