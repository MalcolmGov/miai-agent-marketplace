import { promises as fs } from "node:fs";
import path from "node:path";
import { getPool, query } from "@/lib/pg";
import { ensureMigrations } from "@/lib/migrate";

/**
 * Telegram account bindings — maps a Telegram chat_id to the (tenant, consumer)
 * identity of a signed-in web consumer, so a linked Telegram chat shares the same
 * memory, wallet and reminders as the web app. Written when the "/start setup_<nonce>"
 * deep link is verified; read on every inbound Telegram message. Postgres when
 * DATABASE_URL is set, else a JSON file fallback (same pattern as the other consumer
 * stores). An unbound chat has no row and stays a standalone telegram:<chat_id> identity.
 */

export type TelegramBinding = { tenantId: string; consumerId: string };

const g = globalThis as typeof globalThis & {
  __miaiTgBindings?: Map<string, TelegramBinding>;
  __miaiTgBindingsHydrated?: boolean;
};

function storePath(): string {
  return process.env.CONSUMER_TELEGRAM_STORE_PATH
    ? path.resolve(process.env.CONSUMER_TELEGRAM_STORE_PATH)
    : path.resolve(process.cwd(), "../../data/telegram-bindings.json");
}

async function bindingsMem(): Promise<Map<string, TelegramBinding>> {
  if (g.__miaiTgBindings && g.__miaiTgBindingsHydrated) return g.__miaiTgBindings;
  const map = g.__miaiTgBindings ?? new Map<string, TelegramBinding>();
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, TelegramBinding>)) map.set(k, v);
  } catch {
    /* no file yet */
  }
  g.__miaiTgBindings = map;
  g.__miaiTgBindingsHydrated = true;
  return map;
}

async function writeBindings(map: Map<string, TelegramBinding>): Promise<void> {
  const obj: Record<string, TelegramBinding> = {};
  for (const [k, v] of map) obj[k] = v;
  await fs.writeFile(storePath(), JSON.stringify(obj, null, 2), "utf8");
}

/** Bind a Telegram chat to a consumer's (tenant, consumer) identity. Idempotent upsert. */
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

  const map = await bindingsMem();
  map.set(key, b);
  await writeBindings(map);
}

/** The consumer a Telegram chat is bound to, or null if it is unbound (standalone). */
export async function getBoundConsumer(chatId: number | string): Promise<TelegramBinding | null> {
  const key = String(chatId);

  if (getPool()) {
    await ensureMigrations();
    const res = await query<{ tenant_id: string; consumer_id: string }>(
      `SELECT tenant_id, consumer_id FROM miai_telegram_binding WHERE chat_id = $1`,
      [key],
    );
    const row = res.rows[0];
    return row ? { tenantId: row.tenant_id, consumerId: row.consumer_id } : null;
  }

  const map = await bindingsMem();
  return map.get(key) ?? null;
}
