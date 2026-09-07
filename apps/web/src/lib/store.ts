import { createHmac, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { AgentState, ChatMessage } from "@miai/runtime";
import type { ToolBinding } from "@miai/connectors";
import { getPool, pingPool, query } from "@/lib/pg";
import { ensureMigrations } from "@/lib/migrate";
import { timingSafeEqualString } from "@/lib/security-flags";

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

/**
 * Embed key: `mia_pk_<base64url(workspaceId::agentId)>_<hmac10>`. Deterministic when no
 * per-agent `salt` is set (legacy keys survive redeploys with no storage). Once a salt is
 * assigned (via rotateEmbedKey), the HMAC folds it in, so the previous key stops verifying —
 * that is what makes rotation/revocation possible without a global secret change.
 */
export function embedKeyFor(workspaceId: string, agentId: string, salt?: string): string {
  const id = Buffer.from(`${workspaceId}::${agentId}`, "utf8").toString("base64url");
  const macInput = salt ? `${id}.${salt}` : id;
  const mac = createHmac("sha256", embedSecret()).update(macInput).digest("hex").slice(0, 10);
  return `mia_pk_${id}_${mac}`;
}

export type RentTier = "standard" | "pro" | "enterprise";

export interface WorkspaceAgent {
  agentId: string;
  name?: string;
  summary?: string;
  category?: string;
  accentColor?: string;
  isCustom?: boolean;
  toolsList?: string[];
  systemPrompt?: string;
  state: AgentState;
  model: string;
  knowledge: string;
  tier: RentTier;
  publicKey: string;
  /** Per-agent embed-key salt; present once the key has been rotated. */
  embedSalt?: string;
  /** When true, every embed/app request using this agent's key is rejected. */
  embedRevoked?: boolean;
  /** When non-empty, embed/app requests must originate from one of these domains. */
  approvedDomains?: string[];
  bindings: ToolBinding[];
  connectedConnectors: string[];
  market?: string;
  tone?: string;
  escalationContact?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  mcpEndpoint?: string;
  mcpToken?: string;
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
    console.error("[store] postgres hydrate failed", err);
    throw err;
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
  // When Postgres is primary, rentals file fallback must not rewrite audit history.
  const payload: PersistShape = getPool()
    ? { workspaces: shape.workspaces, audit: [] }
    : shape;
  await fs.writeFile(file, JSON.stringify(payload, null, 2), "utf8");
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
  // Append-only posture: Postgres retains full audit history until ops archives per
  // docs/AUDIT_RETENTION.md. In-process memory is capped via AUDIT_CAP in appendAudit().
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
  })();
  try {
    await s.hydrating;
  } finally {
    // A transient database/migration failure must be retryable on the next readiness probe.
    s.hydrating = undefined;
  }
}

function ws(workspaceId: string): WorkspaceRecord {
  const s = store();
  if (!s.workspaces.has(workspaceId)) {
    s.workspaces.set(workspaceId, { agents: new Map(), embedKeys: new Map() });
  }
  return s.workspaces.get(workspaceId)!;
}

async function readAgentFromPostgres(
  workspaceId: string,
  agentId: string,
): Promise<WorkspaceAgent | undefined> {
  if (!getPool()) return undefined;
  try {
    await ensureMigrations();
    const res = await query<{ payload: WorkspaceAgent }>(
      "SELECT payload FROM miai_rentals WHERE workspace_id = $1 AND agent_id = $2",
      [workspaceId, agentId],
    );
    return res.rows[0]?.payload;
  } catch (err) {
    console.error("[store] postgres agent read failed", err);
    return undefined;
  }
}

async function readAgentsFromPostgres(workspaceId: string): Promise<WorkspaceAgent[] | null> {
  if (!getPool()) return null;
  try {
    await ensureMigrations();
    const res = await query<{ payload: WorkspaceAgent }>(
      "SELECT payload FROM miai_rentals WHERE workspace_id = $1 ORDER BY agent_id",
      [workspaceId],
    );
    return res.rows.map((r) => r.payload);
  } catch (err) {
    console.error("[store] postgres agents list failed", err);
    return null;
  }
}

async function readAuditFromPostgres(
  limit: number,
  opts?: { workspaceId?: string; type?: string; correlationId?: string; agentId?: string },
): Promise<AuditEvent[] | null> {
  if (!getPool()) return null;
  try {
    await ensureMigrations();
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (opts?.workspaceId) {
      params.push(opts.workspaceId);
      clauses.push(`workspace_id = $${params.length}`);
    }
    if (opts?.type) {
      params.push(opts.type);
      clauses.push(`type = $${params.length}`);
    }
    if (opts?.agentId) {
      params.push(opts.agentId);
      clauses.push(`agent_id = $${params.length}`);
    }
    if (opts?.correlationId) {
      params.push(opts.correlationId);
      clauses.push(`(detail->>'correlationId') = $${params.length}`);
    }
    params.push(limit);
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const res = await query<{
      id: string;
      at: Date | string;
      workspace_id: string;
      agent_id: string | null;
      type: string;
      detail: Record<string, unknown>;
    }>(
      `SELECT id, at, workspace_id, agent_id, type, detail FROM miai_audit ${where} ORDER BY at DESC LIMIT $${params.length}`,
      params,
    );
    return res.rows.map((r) => {
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
    });
  } catch (err) {
    console.error("[store] postgres audit read failed", err);
    return null;
  }
}

export async function getWorkspaceAgent(
  workspaceId: string,
  agentId: string,
): Promise<WorkspaceAgent | undefined> {
  // Postgres path: always read-through so multi-replica sees sibling writes.
  if (getPool()) {
    const fromPg = await readAgentFromPostgres(workspaceId, agentId);
    if (fromPg) {
      await ensureStoreHydrated();
      ws(workspaceId).agents.set(agentId, fromPg);
      if (fromPg.publicKey) ws(workspaceId).embedKeys.set(fromPg.publicKey, agentId);
      return fromPg;
    }
    // Fall through to memory/file for local demo keys before first persist.
  }
  await ensureStoreHydrated();
  return ws(workspaceId).agents.get(agentId);
}

export async function listWorkspaceAgents(workspaceId: string): Promise<WorkspaceAgent[]> {
  if (getPool()) {
    const fromPg = await readAgentsFromPostgres(workspaceId);
    if (fromPg) {
      await ensureStoreHydrated();
      const rec = ws(workspaceId);
      rec.agents.clear();
      rec.embedKeys.clear();
      for (const agent of fromPg) {
        rec.agents.set(agent.agentId, agent);
        if (agent.publicKey) rec.embedKeys.set(agent.publicKey, agent.agentId);
      }
      return fromPg;
    }
  }
  await ensureStoreHydrated();
  return [...ws(workspaceId).agents.values()];
}

export async function findCustomAgentById(agentId: string): Promise<WorkspaceAgent | null> {
  await ensureStoreHydrated();
  for (const s of store().workspaces.values()) {
    const a = s.agents.get(agentId);
    if (a) return a;
  }
  if (getPool()) {
    try {
      const res = await query<{ payload: WorkspaceAgent }>(
        "SELECT payload FROM miai_rentals WHERE agent_id = $1 LIMIT 1",
        [agentId],
      );
      if (res.rows[0]?.payload) return res.rows[0].payload;
    } catch (e) {
      console.error("[store] findCustomAgentById query failed", e);
    }
  }
  return null;
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

/** Parse `mia_pk_<id>_<mac10>` with string ops (no ambiguous/backtracking regex on attacker input). */
function parseEmbedKey(publicKey: string): { id: string; mac: string } | null {
  const prefix = "mia_pk_";
  if (!publicKey.startsWith(prefix)) return null;
  const rest = publicKey.slice(prefix.length);
  const us = rest.lastIndexOf("_");
  if (us <= 0) return null;
  const id = rest.slice(0, us);
  const mac = rest.slice(us + 1);
  if (!/^[a-f0-9]{10}$/.test(mac) || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
  return { id, mac };
}

function decodeEmbedId(id: string): { workspaceId: string; agentId: string } | null {
  const decoded = Buffer.from(id, "base64url").toString("utf8");
  const sep = decoded.indexOf("::");
  if (sep <= 0) return null;
  return { workspaceId: decoded.slice(0, sep), agentId: decoded.slice(sep + 2) };
}

export async function resolveEmbedKey(
  publicKey: string,
): Promise<{ workspaceId: string; agentId: string } | null> {
  // Demo keys are local-only — never accept in production.
  if (/_demo$/i.test(publicKey) && process.env.NODE_ENV === "production") {
    return null;
  }
  // Store-aware: a rotated agent verifies against its salt, and a revoked agent is rejected.
  await ensureStoreHydrated();
  const parsed = parseEmbedKey(publicKey);
  const decoded = parsed ? decodeEmbedId(parsed.id) : null;
  if (parsed && decoded) {
    const agent = store().workspaces.get(decoded.workspaceId)?.agents.get(decoded.agentId);
    if (agent?.embedRevoked) return null;
    const macInput = agent?.embedSalt ? `${parsed.id}.${agent.embedSalt}` : parsed.id;
    const expected = createHmac("sha256", embedSecret()).update(macInput).digest("hex").slice(0, 10);
    // A rotated agent (salt set) will not match the legacy unsalted key, which is the point.
    // Constant-time compare so the MAC can't be recovered byte-by-byte via response timing.
    if (timingSafeEqualString(parsed.mac, expected)) return decoded;
  }
  // Legacy fallback: explicitly stored keys (still honour revocation).
  for (const [workspaceId, rec] of store().workspaces) {
    const agentId = rec.embedKeys.get(publicKey);
    if (agentId) {
      if (rec.agents.get(agentId)?.embedRevoked) return null;
      return { workspaceId, agentId };
    }
  }
  return null;
}

/** Rotate an agent's embed key: assigns a fresh salt so the old key stops verifying. */
export async function rotateEmbedKey(
  workspaceId: string,
  agentId: string,
): Promise<WorkspaceAgent | null> {
  await ensureStoreHydrated();
  const rec = store().workspaces.get(workspaceId);
  const agent = rec?.agents.get(agentId);
  if (!rec || !agent) return null;
  rec.embedKeys.delete(agent.publicKey);
  const salt = randomBytes(12).toString("base64url");
  return upsertWorkspaceAgent(workspaceId, agentId, {
    embedSalt: salt,
    embedRevoked: false,
    publicKey: embedKeyFor(workspaceId, agentId, salt),
  });
}

/** Revoke (or un-revoke) an agent's embed key without changing it. */
export async function setEmbedRevoked(
  workspaceId: string,
  agentId: string,
  revoked: boolean,
): Promise<WorkspaceAgent | null> {
  await ensureStoreHydrated();
  if (!store().workspaces.get(workspaceId)?.agents.get(agentId)) return null;
  return upsertWorkspaceAgent(workspaceId, agentId, { embedRevoked: revoked });
}

/** Set the approved embed domains for an agent (empty = no restriction). */
export async function setEmbedApprovedDomains(
  workspaceId: string,
  agentId: string,
  domains: string[],
): Promise<WorkspaceAgent | null> {
  await ensureStoreHydrated();
  if (!store().workspaces.get(workspaceId)?.agents.get(agentId)) return null;
  return upsertWorkspaceAgent(workspaceId, agentId, {
    approvedDomains: normalizeDomains(domains),
  });
}

function normalizeDomains(domains: string[]): string[] {
  return domains
    .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0])
    .filter(Boolean);
}

function hostOf(u?: string | null): string | null {
  if (!u) return null;
  try {
    return new URL(u).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Server-side origin check for embed/app requests. Returns true when the request's Origin
 * (or Referer) host matches one of the approved domains. A missing/unparseable origin is
 * rejected — that is the point of the lock: a non-browser client that lifts a public key
 * cannot satisfy it. Supports exact hosts and `*.example.com` wildcards.
 */
export function originAllowed(
  origin: string | null | undefined,
  referer: string | null | undefined,
  approvedDomains: string[],
): boolean {
  const host = hostOf(origin) ?? hostOf(referer);
  if (!host) return false;
  return normalizeDomains(approvedDomains).some((pat) => {
    if (pat.startsWith("*.")) {
      const base = pat.slice(2);
      return host === base || host.endsWith(`.${base}`);
    }
    return host === pat;
  });
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
  if (getPool()) {
    const fromPg = await readAuditFromPostgres(limit, opts);
    if (fromPg) return fromPg;
  }
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

/** Remove all rented agents for a workspace (memory + Postgres or file fallback). */
export async function clearWorkspaceRentals(workspaceId: string): Promise<number> {
  await ensureStoreHydrated();
  const rec = store().workspaces.get(workspaceId);
  const count = rec?.agents.size ?? 0;
  store().workspaces.delete(workspaceId);

  if (getPool()) {
    try {
      await query("DELETE FROM miai_rentals WHERE workspace_id = $1", [workspaceId]);
    } catch (err) {
      console.error("[store] postgres rental delete failed, writing file fallback", err);
      await persist();
    }
  } else {
    await persist();
  }
  return count;
}

/**
 * DSAR erasure: redact audit detail for a workspace in BOTH the in-memory store and the
 * persisted Postgres `miai_audit` rows. The `detail` JSONB (and the denormalized
 * userId/sessionId/correlationId/channel fields) hold the personal data — tool_error args
 * can contain customer contact details harvested during handoff — so scrubbing it everywhere
 * is required for a right-to-erasure request. The append-only `type`/`agent_id`/`at` columns
 * are kept, so the audit trail still shows that activity occurred, minus the personal data.
 * Returns the number of rows redacted (Postgres row count when available).
 */
export async function redactWorkspaceAuditDetails(workspaceId: string): Promise<number> {
  await ensureStoreHydrated();
  const erasedAt = new Date().toISOString();
  let count = 0;
  for (const row of store().audit) {
    if (row.workspaceId !== workspaceId) continue;
    row.detail = { _erased: true, erasedAt, priorType: row.type };
    row.userId = undefined;
    row.sessionId = undefined;
    row.correlationId = undefined;
    row.channel = undefined;
    count++;
  }

  if (getPool()) {
    try {
      const res = await query(
        "UPDATE miai_audit SET detail = $1::jsonb WHERE workspace_id = $2",
        [JSON.stringify({ _erased: true, erasedAt }), workspaceId],
      );
      count = Math.max(count, res.rowCount ?? 0);
    } catch (err) {
      console.error("[store] postgres audit redaction failed", err);
    }
  }
  return count;
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
