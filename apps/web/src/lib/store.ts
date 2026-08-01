import { createHmac } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { AgentState, ChatMessage } from "@miai/runtime";
import type { ToolBinding } from "@miai/connectors";

/** Secret for deriving embed keys. Falls back to OAUTH_TOKEN_SECRET so no extra
 *  config is needed; set EMBED_KEY_SECRET separately if you ever rotate the OAuth
 *  secret without wanting to invalidate installed website snippets. */
function embedSecret(): string {
  return process.env.EMBED_KEY_SECRET ?? process.env.OAUTH_TOKEN_SECRET ?? "dev-only-change-me";
}

/** Deterministic, stateless embed key: survives redeploys, needs no storage. */
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
  embedKeys: Map<string, string>;
}

interface PersistShape {
  workspaces: Record<
    string,
    {
      agents: Record<string, WorkspaceAgent>;
      embedKeys: Record<string, string>;
    }
  >;
  audit: AuditEvent[];
}

/** Keep enough audit history for operator metering (tokens, top-ups, rentals). */
const AUDIT_CAP = 5000;

const g = globalThis as typeof globalThis & {
  __miaiStore?: {
    workspaces: Map<string, WorkspaceRecord>;
    audit: AuditEvent[];
    hydrated?: boolean;
    hydrating?: Promise<void>;
  };
};

function store() {
  if (!g.__miaiStore) {
    g.__miaiStore = { workspaces: new Map(), audit: [], hydrated: false };
  }
  return g.__miaiStore;
}

function rentalStorePath(): string {
  if (process.env.RENTAL_STORE_PATH) return path.resolve(process.env.RENTAL_STORE_PATH);
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR, "rentals.json");
  return path.resolve(process.cwd(), "../../data/rentals.json");
}

function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.MIAI_DATABASE_URL;
}

async function hydrateFromFile(): Promise<PersistShape | null> {
  try {
    const raw = await fs.readFile(rentalStorePath(), "utf8");
    return JSON.parse(raw) as PersistShape;
  } catch {
    return null;
  }
}

async function hydrateFromPostgres(): Promise<PersistShape | null> {
  const url = databaseUrl();
  if (!url) return null;
  try {
    const pgMod = await import("pg");
    const Client = pgMod.default?.Client ?? pgMod.Client;
    const client = new Client({ connectionString: url, ssl: sslFor(url) });
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS miai_rentals (
        workspace_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (workspace_id, agent_id)
      );
      CREATE TABLE IF NOT EXISTS miai_audit (
        id TEXT PRIMARY KEY,
        at TIMESTAMPTZ NOT NULL,
        workspace_id TEXT NOT NULL,
        agent_id TEXT,
        type TEXT NOT NULL,
        detail JSONB NOT NULL DEFAULT '{}'::jsonb
      );
    `);
    const rentals = await client.query<{ workspace_id: string; agent_id: string; payload: WorkspaceAgent }>(
      "SELECT workspace_id, agent_id, payload FROM miai_rentals",
    );
    const audit = await client.query<{
      id: string;
      at: Date | string;
      workspace_id: string;
      agent_id: string | null;
      type: string;
      detail: Record<string, unknown>;
    }>("SELECT id, at, workspace_id, agent_id, type, detail FROM miai_audit ORDER BY at DESC LIMIT 5000");
    await client.end();

    const shape: PersistShape = {
      workspaces: {},
      audit: audit.rows.map((r) => ({
        id: r.id,
        at: r.at instanceof Date ? r.at.toISOString() : String(r.at),
        workspaceId: r.workspace_id,
        agentId: r.agent_id ?? undefined,
        type: r.type,
        detail: r.detail ?? {},
      })),
    };
    for (const row of rentals.rows) {
      if (!shape.workspaces[row.workspace_id]) {
        shape.workspaces[row.workspace_id] = { agents: {}, embedKeys: {} };
      }
      const agent = row.payload;
      shape.workspaces[row.workspace_id].agents[row.agent_id] = agent;
      if (agent.publicKey) {
        shape.workspaces[row.workspace_id].embedKeys[agent.publicKey] = row.agent_id;
      }
    }
    return shape;
  } catch (err) {
    console.error("[store] postgres hydrate failed, falling back to file/memory", err);
    return null;
  }
}

function sslFor(url: string): boolean | { rejectUnauthorized: boolean } {
  if (/localhost|127\.0\.0\.1/.test(url)) return false;
  return { rejectUnauthorized: false };
}

function applyShape(data: PersistShape) {
  const s = store();
  s.workspaces.clear();
  for (const [workspaceId, rec] of Object.entries(data.workspaces || {})) {
    const agents = new Map<string, WorkspaceAgent>(Object.entries(rec.agents || {}));
    const embedKeys = new Map<string, string>(Object.entries(rec.embedKeys || {}));
    s.workspaces.set(workspaceId, { agents, embedKeys });
  }
  s.audit = Array.isArray(data.audit) ? data.audit : [];
}

function toShape(): PersistShape {
  const s = store();
  const workspaces: PersistShape["workspaces"] = {};
  for (const [workspaceId, rec] of s.workspaces) {
    workspaces[workspaceId] = {
      agents: Object.fromEntries(rec.agents),
      embedKeys: Object.fromEntries(rec.embedKeys),
    };
  }
  return { workspaces, audit: s.audit.slice(0, AUDIT_CAP) };
}

async function persistToFile(shape: PersistShape): Promise<void> {
  const file = rentalStorePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(shape, null, 2), "utf8");
}

async function persistToPostgres(shape: PersistShape): Promise<void> {
  const url = databaseUrl();
  if (!url) return;
  const pgMod = await import("pg");
  const Client = pgMod.default?.Client ?? pgMod.Client;
  const client = new Client({ connectionString: url, ssl: sslFor(url) });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM miai_rentals");
    for (const [workspaceId, rec] of Object.entries(shape.workspaces)) {
      for (const [agentId, payload] of Object.entries(rec.agents)) {
        await client.query(
          `INSERT INTO miai_rentals (workspace_id, agent_id, payload, updated_at)
           VALUES ($1, $2, $3::jsonb, NOW())
           ON CONFLICT (workspace_id, agent_id)
           DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
          [workspaceId, agentId, JSON.stringify(payload)],
        );
      }
    }
    // Keep last 500 audit rows
    await client.query("DELETE FROM miai_audit");
    for (const row of shape.audit.slice(0, 500)) {
      await client.query(
        `INSERT INTO miai_audit (id, at, workspace_id, agent_id, type, detail)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.at, row.workspaceId, row.agentId ?? null, row.type, JSON.stringify(row.detail ?? {})],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

export async function ensureStoreHydrated(): Promise<void> {
  const s = store();
  if (s.hydrated) return;
  if (s.hydrating) return s.hydrating;
  s.hydrating = (async () => {
    const fromPg = await hydrateFromPostgres();
    if (fromPg) {
      applyShape(fromPg);
    } else {
      const fromFile = await hydrateFromFile();
      if (fromFile) applyShape(fromFile);
    }
    s.hydrated = true;
    s.hydrating = undefined;
  })();
  return s.hydrating;
}

async function persist(): Promise<void> {
  const shape = toShape();
  if (databaseUrl()) {
    try {
      await persistToPostgres(shape);
      return;
    } catch (err) {
      console.error("[store] postgres persist failed, writing file fallback", err);
    }
  }
  await persistToFile(shape);
}

function ws(workspaceId: string): WorkspaceRecord {
  const s = store();
  if (!s.workspaces.has(workspaceId)) {
    s.workspaces.set(workspaceId, { agents: new Map(), embedKeys: new Map() });
  }
  return s.workspaces.get(workspaceId)!;
}

export async function getWorkspaceAgent(
  workspaceId: string,
  agentId: string,
): Promise<WorkspaceAgent | undefined> {
  await ensureStoreHydrated();
  return ws(workspaceId).agents.get(agentId);
}

export async function listWorkspaceAgents(workspaceId: string): Promise<WorkspaceAgent[]> {
  await ensureStoreHydrated();
  return [...ws(workspaceId).agents.values()];
}

export async function listAllWorkspaces(): Promise<
  Array<{ workspaceId: string; agents: WorkspaceAgent[] }>
> {
  await ensureStoreHydrated();
  return [...store().workspaces.entries()].map(([workspaceId, rec]) => ({
    workspaceId,
    agents: [...rec.agents.values()],
  }));
}

export async function upsertWorkspaceAgent(
  workspaceId: string,
  agentId: string,
  patch: Partial<Omit<WorkspaceAgent, "agentId">> & { agentId?: string },
): Promise<WorkspaceAgent> {
  await ensureStoreHydrated();
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
  await persist();
  return next;
}

export function resolveEmbedKey(publicKey: string): { workspaceId: string; agentId: string } | null {
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
  for (const [workspaceId, rec] of store().workspaces) {
    const agentId = rec.embedKeys.get(publicKey);
    if (agentId) return { workspaceId, agentId };
  }
  return null;
}

export async function appendAudit(event: Omit<AuditEvent, "id" | "at">): Promise<AuditEvent> {
  await ensureStoreHydrated();
  const row: AuditEvent = {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    ...event,
  };
  const s = store();
  s.audit.unshift(row);
  if (s.audit.length > AUDIT_CAP) s.audit.length = AUDIT_CAP;
  await persist();
  try {
    const { trackAudit } = await import("@/lib/telemetry");
    trackAudit(row);
  } catch {
    // telemetry must never break audit persistence
  }
  return row;
}

export async function listAudit(limit = 50): Promise<AuditEvent[]> {
  await ensureStoreHydrated();
  return store().audit.slice(0, limit);
}

export async function opsSummary(workspaceId: string) {
  const agents = await listWorkspaceAgents(workspaceId);
  await ensureStoreHydrated();
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
