import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

/**
 * Consumer Telegram library — identity mapping, messaging, webhook verification,
 * and secure setup-nonce management for the Telegram consumer chatbot channel.
 *
 * A Telegram user messages the bot → their chat_id becomes their consumer identity.
 * No OIDC, no embed key — the Telegram user IS the identity. The same consumer
 * turn runner, wallet, memory, reminders, and daily brief all work identically.
 */

/** Namespace prefix so Telegram consumer ids never collide with OIDC userIds. */
export const TELEGRAM_CONSUMER_PREFIX = "telegram:";

/** The default tenant / workspace for Telegram consumers (same as the daily brief runner). */
export { WORKSPACE_ID as DEFAULT_TELEGRAM_TENANT } from "@/lib/constants";

/** The default agent a Telegram consumer talks to. */
export { DEFAULT_CONSUMER_AGENT as DEFAULT_TELEGRAM_AGENT } from "@/lib/consumer";

/** Derive a stable, namespaced consumer id from a Telegram chat id. */
export function consumerIdForTelegram(chatId: number | string): string {
  return `${TELEGRAM_CONSUMER_PREFIX}${chatId}`;
}

// ---- Setup nonce — secure deep-link binding (prevents account takeover) --------

const SETUP_SECRET = process.env.TELEGRAM_BOT_SECRET;
const SETUP_TTL_MS = 5 * 60 * 1000; // 5 minutes

const g = globalThis as typeof globalThis & {
  __miaiTgSetupNonces?: Map<string, { consumerId: string; expiresAt: number }>;
};

function getNonceStore(): Map<string, { consumerId: string; expiresAt: number }> {
  return g.__miaiTgSetupNonces ?? (g.__miaiTgSetupNonces = new Map());
}

/** Clean expired nonces from the store (called on every mint/consume). */
function pruneNonces(): void {
  const now = Date.now();
  const store = getNonceStore();
  for (const [k, v] of store) {
    if (v.expiresAt <= now) store.delete(k);
  }
}

/**
 * Mint a signed, single-use, short-TTL setup nonce for a consumer. The nonce
 * (not the raw consumerId) is embedded in the `/start setup_<nonce>` deep link,
 * preventing account takeover. Valid for SETUP_TTL_MS (5 min).
 */
export function mintSetupNonce(consumerId: string): string {
  if (!SETUP_SECRET) {
    // Fallback: when no secret is configured, generate a random token stored server-side.
    // This is less secure than signed nonces (loss of server state loses pending setups)
    // but prevents the raw-consumerId attack vector.
    const token = randomBytes(24).toString("hex");
    const store = getNonceStore();
    pruneNonces();
    store.set(token, { consumerId, expiresAt: Date.now() + SETUP_TTL_MS });
    return token;
  }
  // Signed format: <nonceHex>.<consumerId>.<timestamp> → base64.<hmac>
  const payload = `${randomBytes(16).toString("hex")}.${consumerId}.${Date.now()}`;
  const sig = createHmac("sha256", SETUP_SECRET).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

/**
 * Verify a setup nonce received as `/start setup_<token>` and return the
 * consumerId it was minted for, or null if invalid/expired.
 */
export function verifySetupNonce(token: string): string | null {
  if (!SETUP_SECRET) {
    // Server-stored fallback path
    const store = getNonceStore();
    const entry = store.get(token);
    if (!entry || Date.now() > entry.expiresAt) {
      store.delete(token);
      return null;
    }
    store.delete(token); // single-use
    return entry.consumerId;
  }

  // Signed path: decode, verify HMAC, check expiry
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    const raw = Buffer.from(parts[0], "base64url").toString("utf8");
    const sig = parts[1];
    const expected = createHmac("sha256", SETUP_SECRET).update(raw).digest("base64url");
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const fields = raw.split(".");
    const consumerId = fields[1];
    const ts = fields[2];
    if (!consumerId || !ts) return null;
    if (Date.now() - Number(ts) > SETUP_TTL_MS) return null;
    return consumerId;
  } catch {
    return null;
  }
}

// ---- Telegram Bot API helpers -------------------------------------------------

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
  date: number;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

/** The subset of the Telegram Bot API needed for the consumer webhook. */
const TG_API = "https://api.telegram.org";

async function tgApi(
  token: string,
  method: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const url = `${TG_API}/bot${token}/${method}`;
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Send a plain-text message to a Telegram chat. Returns true if the message was sent. */
export async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string,
): Promise<boolean> {
  try {
    const res = await tgApi(token, "sendMessage", {
      chat_id: chatId,
      text: text.slice(0, 4096), // Telegram message cap
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Show the "bot is typing…" indicator in a Telegram chat. */
export async function sendTelegramTyping(
  token: string,
  chatId: number,
): Promise<void> {
  try {
    await tgApi(token, "sendChatAction", {
      chat_id: chatId,
      action: "typing",
    });
  } catch {
    /* best-effort — typing indicator is cosmetic */
  }
}

/** Truncate and HTML-escape a string for Telegram (very basic — covers the common case). */
export function escapeTelegramHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Verify a Telegram webhook request using the mandatory secret token set with
 * setWebhook?secret_token=… . Telegram sends the raw secret_token verbatim in the
 * X-Telegram-Bot-Api-Secret-Token header — it does NOT HMAC the body.
 *
 * Fails closed: if TELEGRAM_BOT_SECRET is unset, every request is rejected.
 */
export function verifyTelegramWebhook(
  secret: string,
  headerValue: string,
): boolean {
  if (!secret || !headerValue) return false; // mandatory — fail closed
  try {
    const a = Buffer.from(headerValue);
    const b = Buffer.from(secret);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}