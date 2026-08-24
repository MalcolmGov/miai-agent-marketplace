import { promises as fs } from "node:fs";
import path from "node:path";
import { getPool, query } from "@/lib/pg";
import { ensureMigrations } from "@/lib/migrate";

/**
 * Telegram ↔ consumer account binding store.
 *
 * A consumer who signs in on the web app (OIDC `consumerId`, e.g. `usr_123`) wants to reach the
 * SAME assistant — same wallet, memory, reminders — from Telegram. The deep-link flow
 * (`/start setup_<consumerId>`) binds a Telegram `chat_id` to that consumer id, so inbound
 * Telegram messages debit the consumer's own wallet instead of auto-provisioning an isolated
 * `telegram:<chat_id>` identity.
 *
 * Postgres when DATABASE_URL is set, else a JSON file fallback (same convention as the other
 * consumer stores). Bindings are keyed by chat_id; a chat maps to at most one consumer.
 */

export type TelegramBinding = {
  chatId: string;
  consumerId: string;
  boundAt: string;
};

type BindingFile = Record<string, TelegramBinding>;

const g = globalThis as typeof globalThis & {
  __miaiTgBindings?: Map<string, TelegramBinding>;
  __miaiTgBindingsHydrated?: boolean;
};

function storePath(): string {
  return process.env.TELEGRAM_BINDINGS_STORE_PATH
    ? path.resolve(process.env.TELEGRAM_BINDINGS_STORE_PATH)
    : path.resolve(process.cwd(), "../../data/telegram-bindings.json");
}

async function bindingsMem(): Promise<Map<string, TelegramBinding>> {
  if (g.__miaiTgBindings && g.__miaiTgBindingsHydrated) return g.__miaiTgBindings;
  const map = g.__miaiTgBindings ?? new Map<string, TelegramBinding>();
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    for (const [k, v] of Object.entries(JSON.parse(raw) as BindingFile)) map.set(k, v);
  } catch {
    /* no file yet */
  }
  g.__miaiTgBindings = map;
  g.__miaiTgBindingsHydrated = true;
  return map;
}

async function writeBindings(map: Map<string, TelegramBinding>): Promise<void> {
  const obj: BindingFile = {};
  for (const [k, v] of map) obj[k] = v;
  await fs.writeFile(storePath(), JSON.stringify(obj, null, 2), "utf8");
}

/** Bind a Telegram chat_id to a consumer account (upsert). */
export async function bindTelegramConsumer(
  chatId: number | string,
  consumerId: string,
  now: Date = new Date(),
): Promise<void> {
  const chat = String(chatId);
  if (!chat || !consumerId) return;

  if (getPool()) {
    await ensureMigrations();
    await query(
      `INSERT INTO miai_consumer_telegram (chat_id, consumer_id, bound_at)
       VALUES ($1,$2,NOW())
       ON CONFLICT (chat_id) DO UPDATE SET consumer_id = EXCLUDED.consumer_id, bound_at = NOW()`,
      [chat, consumerId],
    );
    return;
  }

  const map = await bindingsMem();
  map.set(chat, { chatId: chat, consumerId, boundAt: now.toISOString() });
  await writeBindings(map);
}

/** Resolve the consumer account a Telegram chat is bound to, or null if unbound. */
export async function consumerIdForChat(chatId: number | string): Promise<string | null> {
  const chat = String(chatId);
  if (!chat) return null;

  if (getPool()) {
    await ensureMigrations();
    const res = await query<{ consumer_id: string }>(
      `SELECT consumer_id FROM miai_consumer_telegram WHERE chat_id = $1`,
      [chat],
    );
    return res.rows[0]?.consumer_id ?? null;
  }

  const map = await bindingsMem();
  return map.get(chat)?.consumerId ?? null;
}

/** Unbind a Telegram chat (used when a consumer disconnects the channel). */
export async function unbindTelegramConsumer(chatId: number | string): Promise<void> {
  const chat = String(chatId);
  if (!chat) return;

  if (getPool()) {
    await ensureMigrations();
    await query(`DELETE FROM miai_consumer_telegram WHERE chat_id = $1`, [chat]);
    return;
  }

  const map = await bindingsMem();
  map.delete(chat);
  await writeBindings(map);
}
