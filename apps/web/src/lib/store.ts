import { createHmac } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { AgentState, ChatMessage } from "@miai/runtime";
import type { ToolBinding } from "@miai/connectors";
import { getPool, pingPool, query } from "@/lib/pg";
import { ensureMigrations } from "@/lib/migrate";

/** Secret for deriving embed keys. Falls back to OAUTH_TOKEN_SECRET so no extra
 *  config is needed; set EMBED_KEY_SECRET separately if you ever rotate the OAuth
 *  secret without wanting to invalidate installed website snippets. */
function embedSecret(): string {
  const s = process.env.EMBED_KEY_SECRET ?? process.env.OAUTH_TOKEN_SECRET ?? "dev-only-change-me";
  if (
    process.env.NODE_ENV === "production" &&
    (s === "dev-only-change-me" || s === "replace-with-long-random-string" || s.length < 16)
  ) {
    throw new Error("EMBED_KEY_SECRET / OAUTH_TOKEN_SECRET missing or weak in production");
  }
  return s;
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
  /** End-to-end request/trace id shared across audit + turn transcripts. */
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  channel?: string;
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

/** Keep enough audit history for operator metering + compliance trail. */
const AUDIT_CAP = 20_000;

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

async function hydrateFromFile(): Promise<PersistShape | null> {
  try {
    const raw = await fs.readFile(rentalStorePath(), "utf8");
    return JSON.parse(raw) as PersistShape;
  } catch {
    return null;
  }
}

async function hydrateFromPostgres(): Promise<PersistShape | null> {
  if (!getPool()) return null;
  try {
    await ensureMigrations();
    const rentals = await query<{ workspace_id: string; agent_id: string; payload: WorkspaceAgent }>(
      "SELECT workspace_id, agent_id, payload FROM miai_rentals",
    );
    const audit = await query<{
      id: string;
      at: Date | string;
      workspace_id: string;
      agent_id: string | null;
      type: string;
      detail: Record<string, unknown>;
    }>("SELECT id, at, workspace_id, agent_id, type, detail FROM miai_audit ORDER BY at DESC LIMIT 5000");

    const shape: PersistShape = {
      workspaces: {},
      audit: audit.rows.map((r) => {
        const detail = r.detail ?? {};
        return {
          id: r.id,
          at: r.at instanceof Date ? r.at.toISOString() : String(r.at),
          workspaceId: r.workspace_id,
          agentId: r.agent_id ?? undefined,
          type: r.type,
          detail,
          correlationId:
            typeof detail.correlationId === "string" ? detail.correlationId : undefined,
          userId: typeof detail.userId === "string" ? detail.userId : undefined,
          sessionId: typeof detail.sessionId === "string" ? detail.sessionId : undefined,
          channel: typeof detail.channel === "string" ? detail.channel : undefined,
        };
      }),
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

async function persistToFile(): Promise<void> {
  const shape = toShape();
  const file = rentalStorePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(shape, null, 2), "utf8");
}

async function upsertRentalRow(
  workspaceId: string,
  agentId: string,
  payload: WorkspaceAgent,
): Promise<void> {
  await query(
    `INSERT INTO miai_rentals (workspace_id, agent_id, payload, updated_at)
     VALUES ($1, $2, $3::jsonb, NOW())
     ON CONFLICT (workspace_id, agent_id)
     DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    [workspaceId, agentId, JSON.stringify(payload)],
  );
}

async function insertAuditRow(row: AuditEvent): Promise<void> {
  await query(
    `INSERT INTO miai_audit (id, at, workspace_id, agent_id, type, detail)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [row.id, row.at, row.workspaceId, row.agentId ?? null, row.type, JSON.stringify(row.detail ?? {})],
  );
  // Nested subquery required so Postgres allows DELETE against the same table.
  await query(
    `DELETE FROM miai_audit
     WHERE id NOT IN (
       SELECT id FROM (
         SELECT id FROM miai_audit ORDER BY at DESC LIMIT $1
       ) keep
     )`,
    [AUDIT_CAP],
  );
}

/** File fallback only — Postgres writes are row-level in upsert/append handlers. */
async function persist(): Promise<void> {
  await persistToFile();
}

/** Lightweight readiness probe for /api/health — does not hydrate rentals. */
export async function pingStore(): Promise<{
  backend: "postgres" | "file";
  ok: boolean;
  error?: string;
}> {
  if (getPool()) {
    const ping = await pingPool();
    return {
      backend: "postgres",
      ok: ping.ok,
      error: ping.error,
    };
  }
  try {
    const file = rentalStorePath();
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.access(path.dirname(file));
    return { backend: "file", ok: true };
  } catch (err) {
    return {
      backend: "file",
      ok: false,
      error: err instanceof Error ? err.message : "file store not writable",
    };
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

  if (getPool()) {
    try {
      await upsertRentalRow(workspaceId, agentId, next);
    } catch (err) {
      console.error("[store] postgres upsert failed, writing file fallback", err);
      await persist();
    }
  } else {
    await persist();
  }
  return next;
}

export function resolveEmbedKey(publicKey: string): { workspaceId: string; agentId: string } | null {
  // Demo keys are local-only — never accept in production.
  if (/_demo$/i.test(publicKey) && process.env.NODE_ENV === "production") {
    return null;
  }
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
  const detail = {
    ...(event.detail ?? {}),
    ...(event.correlationId ? { correlationId: event.correlationId } : {}),
    ...(event.userId ? { userId: event.userId } : {}),
    ...(event.sessionId ? { sessionId: event.sessionId } : {}),
    ...(event.channel ? { channel: event.channel } : {}),
  };
  const row: AuditEvent = {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    workspaceId: event.workspaceId,
    agentId: event.agentId,
    type: event.type,
    detail,
    correlationId: event.correlationId ?? (detail.correlationId as string | undefined),
    userId: event.userId ?? (detail.userId as string | undefined),
    sessionId: event.sessionId ?? (detail.sessionId as string | undefined),
    channel: event.channel ?? (detail.channel as string | undefined),
  };
  const s = store();
  s.audit.unshift(row);
  if (s.audit.length > AUDIT_CAP) s.audit.length = AUDIT_CAP;

  if (getPool()) {
    try {
      await insertAuditRow(row);
    } catch (err) {
      console.error("[store] postgres audit insert failed, writing file fallback", err);
      await persist();
    }
  } else {
    await persist();
  }

  try {
    const { trackAudit } = await import("@/lib/telemetry");
    trackAudit(row);
  } catch {
    // telemetry must never break audit persistence
  }
  return row;
}

export async function listAudit(
  limit = 50,
  opts?: { workspaceId?: string; type?: string; correlationId?: string; agentId?: string },
): Promise<AuditEvent[]> {
  await ensureStoreHydrated();
  let rows = store().audit;
  if (opts?.workspaceId) rows = rows.filter((a) => a.workspaceId === opts.workspaceId);
  if (opts?.type) rows = rows.filter((a) => a.type === opts.type);
  if (opts?.agentId) rows = rows.filter((a) => a.agentId === opts.agentId);
  if (opts?.correlationId) {
    rows = rows.filter(
      (a) =>
        a.correlationId === opts.correlationId ||
        a.detail?.correlationId === opts.correlationId,
    );
  }
  return rows.slice(0, limit);
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
