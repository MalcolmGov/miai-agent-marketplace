import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Consumer Telegram library — identity mapping, messaging, and webhook verification
 * for the Telegram consumer chatbot channel.
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
 * Verify a Telegram webhook payload using the optional secret token set with
 * setWebhook?secret_token=… . When env TELEGRAM_BOT_SECRET is set, every inbound
 * update carries a X-Telegram-Bot-Api-Secret-Token header we must verify here.
 */
export function verifyTelegramWebhook(
  secret: string,
  body: string,
  headerValue: string,
): boolean {
  if (!secret) return true; // no secret configured → allow all
  try {
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(headerValue, "hex"),
    );
  } catch {
    return false;
  }
}