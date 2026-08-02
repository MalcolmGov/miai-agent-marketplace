import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { appendAudit, type AuditEvent } from "@/lib/store";

export type TraceChannel = "studio" | "embed" | "app" | "ask" | "whatsapp" | "system";

export type TurnTranscript = {
  id: string;
  correlationId: string;
  at: string;
  workspaceId: string;
  agentId: string;
  channel: TraceChannel;
  sessionId: string;
  userId?: string;
  userMessage: string;
  assistantMessage: string;
  toolCalls: Array<{
    name: string;
    args?: Record<string, unknown>;
    error?: string;
    connector?: string;
    stubbed?: boolean;
    live?: boolean;
    resultPreview?: string;
  }>;
  tokensDebited: number;
  paused: boolean;
  model?: string;
  mode?: string;
  replyLanguage?: string;
};

const TURN_CAP = 20_000;

const g = globalThis as typeof globalThis & {
  __miaiTurns?: {
    rows: TurnTranscript[];
    hydrated?: boolean;
    hydrating?: Promise<void>;
  };
};

function storePath(): string {
  if (process.env.TURN_TRANSCRIPTS_PATH) return path.resolve(process.env.TURN_TRANSCRIPTS_PATH);
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR, "turn-transcripts.json");
  return path.resolve(process.cwd(), "../../data/turn-transcripts.json");
}

function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL?.trim() || undefined;
}

function mem() {
  if (!g.__miaiTurns) g.__miaiTurns = { rows: [], hydrated: false };
  return g.__miaiTurns;
}

export function newCorrelationId(): string {
  return `corr_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
}

export function correlationFromRequest(req: Request, bodyCorr?: string): string {
  const header =
    req.headers.get("x-correlation-id") ||
    req.headers.get("x-request-id") ||
    req.headers.get("x-miai-correlation-id");
  if (header?.trim()) return header.trim().slice(0, 128);
  if (bodyCorr?.trim()) return bodyCorr.trim().slice(0, 128);
  return newCorrelationId();
}

async function hydrate(): Promise<void> {
  const s = mem();
  if (s.hydrated) return;
  if (s.hydrating) return s.hydrating;
  s.hydrating = (async () => {
    try {
      if (databaseUrl()) {
        const rows = await hydrateFromPostgres();
        if (rows) {
          s.rows = rows;
          s.hydrated = true;
          s.hydrating = undefined;
          return;
        }
      }
      const raw = await fs.readFile(storePath(), "utf8");
      const data = JSON.parse(raw) as TurnTranscript[];
      s.rows = Array.isArray(data) ? data : [];
    } catch {
      s.rows = [];
    }
    s.hydrated = true;
    s.hydrating = undefined;
  })();
  return s.hydrating;
}

async function hydrateFromPostgres(): Promise<TurnTranscript[] | null> {
  const url = databaseUrl();
  if (!url) return null;
  try {
    const pgMod = await import("pg");
    const Client = pgMod.default?.Client ?? pgMod.Client;
    const client = new Client({
      connectionString: url,
      ssl: /localhost|127\.0\.0\.1/.test(url)
        ? false
        : {
            rejectUnauthorized:
              process.env.PG_SSL_REJECT_UNAUTHORIZED === "1" ||
              Boolean(process.env.PGSSLROOTCERT) ||
              Boolean(process.env.NODE_EXTRA_CA_CERTS),
          },
    });
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS miai_turns (
        id TEXT PRIMARY KEY,
        at TIMESTAMPTZ NOT NULL,
        correlation_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        session_id TEXT NOT NULL,
        user_id TEXT,
        payload JSONB NOT NULL
      );
      CREATE INDEX IF NOT EXISTS miai_turns_ws_at ON miai_turns (workspace_id, at DESC);
      CREATE INDEX IF NOT EXISTS miai_turns_corr ON miai_turns (correlation_id);
    `);
    const res = await client.query<{ payload: TurnTranscript }>(
      "SELECT payload FROM miai_turns ORDER BY at DESC LIMIT $1",
      [TURN_CAP],
    );
    await client.end();
    return res.rows.map((r) => r.payload);
  } catch (err) {
    console.error("[traceability] postgres hydrate failed", err);
    return null;
  }
}

async function persist(): Promise<void> {
  const rows = mem().rows.slice(0, TURN_CAP);
  const file = storePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(rows, null, 2), "utf8");

  const url = databaseUrl();
  if (!url) return;
  try {
    const pgMod = await import("pg");
    const Client = pgMod.default?.Client ?? pgMod.Client;
    const client = new Client({
      connectionString: url,
      ssl: /localhost|127\.0\.0\.1/.test(url)
        ? false
        : {
            rejectUnauthorized:
              process.env.PG_SSL_REJECT_UNAUTHORIZED === "1" ||
              Boolean(process.env.PGSSLROOTCERT) ||
              Boolean(process.env.NODE_EXTRA_CA_CERTS),
          },
    });
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS miai_turns (
        id TEXT PRIMARY KEY,
        at TIMESTAMPTZ NOT NULL,
        correlation_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        session_id TEXT NOT NULL,
        user_id TEXT,
        payload JSONB NOT NULL
      );
    `);
    // Upsert newest batch only (full rewrite is expensive; keep last TURN_CAP via delete+insert of missing)
    for (const row of rows.slice(0, 200)) {
      await client.query(
        `INSERT INTO miai_turns (id, at, correlation_id, workspace_id, agent_id, channel, session_id, user_id, payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
         ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
        [
          row.id,
          row.at,
          row.correlationId,
          row.workspaceId,
          row.agentId,
          row.channel,
          row.sessionId,
          row.userId ?? null,
          JSON.stringify(row),
        ],
      );
    }
    await client.end();
  } catch (err) {
    console.error("[traceability] postgres persist failed", err);
  }
}

export async function appendTurnTranscript(
  input: Omit<TurnTranscript, "id" | "at"> & { at?: string },
): Promise<TurnTranscript> {
  await hydrate();
  const row: TurnTranscript = {
    id: `turn_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`,
    at: input.at ?? new Date().toISOString(),
    correlationId: input.correlationId,
    workspaceId: input.workspaceId,
    agentId: input.agentId,
    channel: input.channel,
    sessionId: input.sessionId,
    userId: input.userId,
    userMessage: input.userMessage.slice(0, 8000),
    assistantMessage: input.assistantMessage.slice(0, 12000),
    toolCalls: input.toolCalls.slice(0, 40).map((t) => ({
      name: t.name,
      args: t.args,
      error: t.error,
    })),
    tokensDebited: input.tokensDebited,
    paused: input.paused,
    model: input.model,
    mode: input.mode,
    replyLanguage: input.replyLanguage,
  };
  mem().rows.unshift(row);
  if (mem().rows.length > TURN_CAP) mem().rows.length = TURN_CAP;
  await persist();
  return row;
}

export async function listTurnTranscripts(opts: {
  workspaceId?: string;
  agentId?: string;
  correlationId?: string;
  sessionId?: string;
  channel?: string;
  limit?: number;
}): Promise<TurnTranscript[]> {
  await hydrate();
  let rows = [...mem().rows];
  if (opts.workspaceId) rows = rows.filter((r) => r.workspaceId === opts.workspaceId);
  if (opts.agentId) rows = rows.filter((r) => r.agentId === opts.agentId);
  if (opts.correlationId) rows = rows.filter((r) => r.correlationId === opts.correlationId);
  if (opts.sessionId) rows = rows.filter((r) => r.sessionId === opts.sessionId);
  if (opts.channel) rows = rows.filter((r) => r.channel === opts.channel);
  return rows.slice(0, Math.min(500, Math.max(1, opts.limit ?? 50)));
}

export async function getTraceByCorrelation(
  correlationId: string,
  workspaceId?: string,
): Promise<{ turns: TurnTranscript[]; audit: AuditEvent[] }> {
  const { listAudit } = await import("@/lib/store");
  const turns = await listTurnTranscripts({
    correlationId,
    workspaceId,
    limit: 100,
  });
  const audit = (await listAudit(2000)).filter((e) => {
    if (workspaceId && e.workspaceId !== workspaceId) return false;
    const corr = e.correlationId ?? (e.detail?.correlationId as string | undefined);
    return corr === correlationId;
  });
  return { turns, audit };
}

/** Record a chat turn: audit event + full transcript for history/trace. */
export async function recordChatTurn(input: {
  correlationId: string;
  workspaceId: string;
  agentId: string;
  channel: TraceChannel;
  sessionId: string;
  userId?: string;
  userMessage: string;
  assistantMessage: string;
  toolCalls?: Array<{
    name: string;
    args?: Record<string, unknown>;
    result?: unknown;
    connector?: string;
    stubbed?: boolean;
    live?: boolean;
  }>;
  tokensDebited: number;
  paused: boolean;
  model?: string;
  mode?: string;
  replyLanguage?: string;
  auditType?: string;
  extraDetail?: Record<string, unknown>;
}): Promise<{ audit: AuditEvent; turn: TurnTranscript }> {
  const tools = (input.toolCalls ?? []).map((t) => {
    const data = t.result && typeof t.result === "object" ? (t.result as Record<string, unknown>) : null;
    const err =
      data && "error" in data ? String(data.error ?? "") : undefined;
    const stubbed =
      typeof t.stubbed === "boolean"
        ? t.stubbed
        : Boolean(data?.source === "sandbox_stub" || data?._note || data?.stubbed);
    const live =
      typeof t.live === "boolean" ? t.live : Boolean(data?.live === true && !stubbed);
    return {
      name: t.name,
      args: t.args,
      error: err || undefined,
      connector: t.connector ?? (typeof data?.provider === "string" ? data.provider : undefined),
      stubbed,
      live,
      resultPreview: data ? JSON.stringify(data).slice(0, 240) : undefined,
    };
  });

  const liveTools = tools.filter((t) => t.live).map((t) => t.name);
  const stubTools = tools.filter((t) => t.stubbed).map((t) => t.name);

  const audit = await appendAudit({
    workspaceId: input.workspaceId,
    agentId: input.agentId,
    type: input.auditType ?? (input.paused ? "paused_no_tokens" : `${input.channel}_turn`),
    correlationId: input.correlationId,
    userId: input.userId,
    sessionId: input.sessionId,
    channel: input.channel,
    detail: {
      correlationId: input.correlationId,
      sessionId: input.sessionId,
      userId: input.userId,
      channel: input.channel,
      tokensDebited: input.tokensDebited,
      paused: input.paused,
      tools: tools.map((t) => t.name),
      toolErrors: tools.filter((t) => t.error).map((t) => t.name),
      liveTools,
      stubTools,
      model: input.model,
      mode: input.mode,
      replyLanguage: input.replyLanguage,
      userPreview: input.userMessage.slice(0, 160),
      assistantPreview: input.assistantMessage.slice(0, 160),
      ...input.extraDetail,
    },
  });

  for (const t of tools) {
    if (t.error) {
      await appendAudit({
        workspaceId: input.workspaceId,
        agentId: input.agentId,
        type: "tool_error",
        correlationId: input.correlationId,
        userId: input.userId,
        sessionId: input.sessionId,
        channel: input.channel,
        detail: {
          correlationId: input.correlationId,
          tool: t.name,
          error: t.error,
          args: t.args,
        },
      });
    }
  }

  const turn = await appendTurnTranscript({
    correlationId: input.correlationId,
    workspaceId: input.workspaceId,
    agentId: input.agentId,
    channel: input.channel,
    sessionId: input.sessionId,
    userId: input.userId,
    userMessage: input.userMessage,
    assistantMessage: input.assistantMessage,
    toolCalls: tools,
    tokensDebited: input.tokensDebited,
    paused: input.paused,
    model: input.model,
    mode: input.mode,
    replyLanguage: input.replyLanguage,
  });

  return { audit, turn };
}
