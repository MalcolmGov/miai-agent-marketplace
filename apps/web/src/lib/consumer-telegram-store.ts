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
};

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
