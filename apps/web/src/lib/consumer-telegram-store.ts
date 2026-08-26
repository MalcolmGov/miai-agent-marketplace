import { promises as fs } from "node:fs";
import path from "node:path";
import { getPool, query } from "@/lib/pg";
import { ensureMigrations } from "@/lib/migrate";

/**
 * Per-chat Telegram state for the consumer channel. Two independent facts, both keyed by
 * the Telegram chat_id:
 *   - identity binding (tenantId, consumerId) — set by the "/start setup_<nonce>" deep link
 *     so a linked chat shares the web consumer's memory / wallet. Unbound chats have neither
 *     and stay a standalone telegram:<chat_id> identity.
 *   - active agent (agentId) — which consumer agent the chat is talking to, switched via the
 *     /agents menu. Null means the default personal-assistant.
 * Postgres when DATABASE_URL is set, else a JSON file fallback (same pattern as the other
 * consumer stores).
 */

export type TelegramBinding = { tenantId: string; consumerId: string };
type ChatState = { tenantId?: string; consumerId?: string; agentId?: string };

const g = globalThis as typeof globalThis & {
  __miaiTgState?: Map<string, ChatState>;
  __miaiTgStateHydrated?: boolean;
  __miaiTgConsumedNonce?: Map<string, number>;
};

function nonceMem(): Map<string, number> {
  return g.__miaiTgConsumedNonce ?? (g.__miaiTgConsumedNonce = new Map());
}

/**
 * Record a setup nonce as consumed and report whether this is its FIRST use. Returns true on first
 * use (proceed with the bind), false if it was already consumed (a replay — reject). Postgres-backed
 * so it holds across replicas, with an in-process fallback for the file-store deployment.
 *
 * This is the single-use enforcement the signed, stateless `/start setup_<nonce>` deep link cannot
 * provide on its own — closing the replay → Telegram account-takeover window.
 */
export async function consumeSetupNonce(nonceId: string, expiresAt: number): Promise<boolean> {
  if (!nonceId) return false;
  const now = Date.now();
  if (getPool()) {
    await ensureMigrations();
    await query(`DELETE FROM miai_telegram_setup_nonce WHERE expires_at < $1`, [now]);
    const res = await query<{ nonce_id: string }>(
      `INSERT INTO miai_telegram_setup_nonce (nonce_id, expires_at) VALUES ($1, $2)
       ON CONFLICT (nonce_id) DO NOTHING RETURNING nonce_id`,
      [nonceId, expiresAt],
    );
    return res.rows.length > 0; // a returned row means we inserted → first use
  }
  const seen = nonceMem();
  for (const [k, exp] of seen) if (exp < now) seen.delete(k);
  if (seen.has(nonceId)) return false;
  seen.set(nonceId, expiresAt);
  return true;
}

function storePath(): string {
  return process.env.CONSUMER_TELEGRAM_STORE_PATH
    ? path.resolve(process.env.CONSUMER_TELEGRAM_STORE_PATH)
    : path.resolve(process.cwd(), "../../data/telegram-bindings.json");
}

async function stateMem(): Promise<Map<string, ChatState>> {
  if (g.__miaiTgState && g.__miaiTgStateHydrated) return g.__miaiTgState;
  const map = g.__miaiTgState ?? new Map<string, ChatState>();
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, ChatState>)) map.set(k, v);
  } catch {
    /* no file yet */
  }
  g.__miaiTgState = map;
  g.__miaiTgStateHydrated = true;
  return map;
}

async function writeState(map: Map<string, ChatState>): Promise<void> {
  const obj: Record<string, ChatState> = {};
  for (const [k, v] of map) obj[k] = v;
  await fs.writeFile(storePath(), JSON.stringify(obj, null, 2), "utf8");
}

async function getState(chatId: number | string): Promise<ChatState | null> {
  const key = String(chatId);
  if (getPool()) {
    await ensureMigrations();
    const res = await query<{ tenant_id: string | null; consumer_id: string | null; agent_id: string | null }>(
      `SELECT tenant_id, consumer_id, agent_id FROM miai_telegram_binding WHERE chat_id = $1`,
      [key],
    );
    const r = res.rows[0];
    return r
      ? { tenantId: r.tenant_id ?? undefined, consumerId: r.consumer_id ?? undefined, agentId: r.agent_id ?? undefined }
      : null;
  }
  const map = await stateMem();
  return map.get(key) ?? null;
}

/** Bind a Telegram chat to a consumer's (tenant, consumer) identity. Preserves any active agent. */
export async function bindTelegram(chatId: number | string, b: TelegramBinding): Promise<void> {
  const key = String(chatId);
  if (!b.tenantId || !b.consumerId) return;

  if (getPool()) {
    await ensureMigrations();
    await query(
      `INSERT INTO miai_telegram_binding (chat_id, tenant_id, consumer_id)
       VALUES ($1,$2,$3)
       ON CONFLICT (chat_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, consumer_id = EXCLUDED.consumer_id`,
      [key, b.tenantId, b.consumerId],
    );
    return;
  }

  const map = await stateMem();
  map.set(key, { ...(map.get(key) ?? {}), tenantId: b.tenantId, consumerId: b.consumerId });
  await writeState(map);
}

/** The consumer a Telegram chat is bound to, or null if it is unbound (standalone). */
export async function getBoundConsumer(chatId: number | string): Promise<TelegramBinding | null> {
  const s = await getState(chatId);
  return s?.tenantId && s?.consumerId ? { tenantId: s.tenantId, consumerId: s.consumerId } : null;
}

/** Set which consumer agent this chat is talking to. Preserves any identity binding. */
export async function setActiveAgent(chatId: number | string, agentId: string): Promise<void> {
  const key = String(chatId);
  if (!agentId) return;

  if (getPool()) {
    await ensureMigrations();
    await query(
      `INSERT INTO miai_telegram_binding (chat_id, agent_id)
       VALUES ($1,$2)
       ON CONFLICT (chat_id) DO UPDATE SET agent_id = EXCLUDED.agent_id`,
      [key, agentId],
    );
    return;
  }

  const map = await stateMem();
  map.set(key, { ...(map.get(key) ?? {}), agentId });
  await writeState(map);
}

/** The agent this chat is currently talking to, or null (→ caller falls back to the default). */
export async function getActiveAgent(chatId: number | string): Promise<string | null> {
  const s = await getState(chatId);
  return s?.agentId ?? null;
}

/** True if any Telegram chat is currently linked to this consumer's identity. */
export async function isConsumerLinked(tenantId: string, consumerId: string): Promise<boolean> {
  if (!tenantId || !consumerId) return false;
  if (getPool()) {
    await ensureMigrations();
    const res = await query(
      `SELECT 1 FROM miai_telegram_binding WHERE tenant_id = $1 AND consumer_id = $2 LIMIT 1`,
      [tenantId, consumerId],
    );
    return res.rows.length > 0;
  }
  const map = await stateMem();
  for (const v of map.values()) {
    if (v.tenantId === tenantId && v.consumerId === consumerId) return true;
  }
  return false;
}

/**
 * Disconnect Telegram for a consumer: drop the identity binding from every chat linked to them, so
 * those chats revert to a standalone telegram:<chat_id> identity. Keeps each chat's active-agent
 * choice. Returns how many chats were unlinked (0 if none).
 */
export async function unbindTelegramForConsumer(tenantId: string, consumerId: string): Promise<number> {
  if (!tenantId || !consumerId) return 0;
  if (getPool()) {
    await ensureMigrations();
    const res = await query<{ chat_id: string }>(
      `UPDATE miai_telegram_binding SET tenant_id = NULL, consumer_id = NULL
       WHERE tenant_id = $1 AND consumer_id = $2 RETURNING chat_id`,
      [tenantId, consumerId],
    );
    return res.rows.length;
  }
  const map = await stateMem();
  let n = 0;
  for (const [k, v] of map) {
    if (v.tenantId === tenantId && v.consumerId === consumerId) {
      if (v.agentId) map.set(k, { agentId: v.agentId });
      else map.delete(k);
      n++;
    }
  }
  if (n) await writeState(map);
  return n;
}
