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
/** Setup-nonce validity window. Short on purpose — it caps the deep-link replay window; single-use
 *  (see consumeSetupNonce in the store) is the real defence, this just narrows the exposure. */
export const SETUP_TTL_MS = 2 * 60 * 1000; // 2 minutes (was 5)

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
  // Signed format: base64url(JSON [nonceHex, consumerId, timestamp]).<hmac>. A JSON array is used
  // instead of a "."-joined string because consumerId can itself contain "." (e.g. a dotted brand
  // like "acme.co"), which corrupted the field split — mis-binding the identity and turning the
  // timestamp into NaN so the TTL was never enforced. base64url never contains ".", so the single
  // "." separating payload from signature is unambiguous. (Mirrors connectors/flow.ts state tokens.)
  const payload = JSON.stringify([randomBytes(16).toString("hex"), consumerId, Date.now()]);
  const sig = createHmac("sha256", SETUP_SECRET).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

/**
 * Verify a setup nonce received as `/start setup_<token>`. Returns the consumerId it was minted for
 * and the nonce's unique id, or null if invalid/expired.
 *
 * IMPORTANT: the signed path is stateless (HMAC + TTL), so verification alone does NOT prevent
 * replay within the TTL. The caller MUST enforce single-use via `consumeSetupNonce(nonceId)` before
 * acting on the result — otherwise a leaked deep link binds an attacker's chat to the victim.
 */
export function verifySetupNonce(token: string): { consumerId: string; nonceId: string } | null {
  if (!SETUP_SECRET) {
    // Server-stored fallback path (in-process; single-use via delete-on-read).
    const store = getNonceStore();
    const entry = store.get(token);
    if (!entry || Date.now() > entry.expiresAt) {
      store.delete(token);
      return null;
    }
    store.delete(token);
    return { consumerId: entry.consumerId, nonceId: token };
  }

  // Signed path: decode, verify HMAC, check expiry. Single-use is enforced by the caller.
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    const raw = Buffer.from(parts[0], "base64url").toString("utf8");
    const sig = parts[1];
    const expected = createHmac("sha256", SETUP_SECRET).update(raw).digest("base64url");
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== 3) return null;
    const [nonceId, consumerId, ts] = parsed as [unknown, unknown, unknown];
    if (!nonceId || !consumerId || typeof ts !== "number") return null;
    if (Date.now() - ts > SETUP_TTL_MS) return null;
    return { consumerId: String(consumerId), nonceId: String(nonceId) };
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

/**
 * Convert a Markdown assistant reply into the small HTML subset Telegram's
 * `parse_mode:"HTML"` supports (`<b> <i> <code> <pre> <a>`). Telegram has no
 * headings or lists, so `## H` becomes bold and `- item` becomes `• item`.
 *
 * HTML-special chars are escaped FIRST, so the model's text can never inject a
 * tag, and only balanced pairs are emitted — the output never has an unclosed
 * tag (the common cause of a Telegram 400). Model output is Markdown, so
 * without this the raw `##`/`**` render literally in the chat.
 */
export function mdToTelegramHtml(md: string): string {
  let s = (md ?? "").replace(/\r\n/g, "\n");
  // 1) Escape HTML specials before we insert any tags of our own.
  s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Every rule below uses a greedy negated character class rather than a lazy
  // quantifier, so none can backtrack across its delimiter — the whole pass is
  // linear in input length (no ReDoS on a crafted message).
  // 2) Fenced code blocks ```lang\n…``` → <pre>. The tempered token
  //    `(?:[^`]|`(?!``))*` matches any non-backtick, or a backtick that doesn't
  //    open the closing fence — linear, and it tolerates single backticks inside.
  s = s.replace(/```[^\n]*\n?((?:[^`]|`(?!``))*)```/g, (_m, code: string) => `<pre>${code.replace(/\n+$/, "")}</pre>`);
  // 3) Inline code `x` → <code>
  s = s.replace(/`([^`\n]+)`/g, (_m, c: string) => `<code>${c}</code>`);
  // 4) Links [text](http…) → <a>
  s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, t: string, u: string) => `<a href="${u}">${t}</a>`);
  // 5) Headings (# … ######) → bold (Telegram has no headings). Greedy capture,
  //    trailing #'s/spaces trimmed in code so there's no lazy quantifier.
  s = s.replace(/^ {0,3}#{1,6}[ \t]+(.+)$/gm, (_m, h: string) => `<b>${h.replace(/[ \t]*#*[ \t]*$/, "")}</b>`);
  // 6) Bold **x** / __x__ (before single-char italic so ** is consumed first).
  s = s.replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>");
  s = s.replace(/__([^_\n]+)__/g, "<b>$1</b>");
  // 7) Bullets "- " / "* " / "+ " at line start → "• "
  s = s.replace(/^ {0,3}[-*+][ \t]+/gm, "• ");
  // 8) Italic *x* / _x_ (single marker, not touching a word char on the far side).
  s = s.replace(/(^|[^\w*])\*(?!\s)([^*\n]+)\*(?!\w)/g, "$1<i>$2</i>");
  s = s.replace(/(^|[^\w])_(?!\s)([^_\n]+)_(?!\w)/g, "$1<i>$2</i>");
  // 9) Tidy excess blank lines.
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Send a message to a Telegram chat as HTML. Returns true if it was sent.
 * If the HTML is rejected (e.g. malformed tags → HTTP 400), it retries once as
 * plain text with the tags stripped, so a formatting slip never drops the reply.
 * Callers pass already-HTML text (menus) or run model Markdown through
 * `mdToTelegramHtml` first.
 */
export async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string,
): Promise<boolean> {
  const body = text.slice(0, 4096); // Telegram message cap
  try {
    const res = await tgApi(token, "sendMessage", {
      chat_id: chatId,
      text: body,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    if (res.ok) return true;
    // HTML parse error (or similar) → resend as plain text so the user still gets it.
    const plain = body.replace(/<[^>]+>/g, "");
    const res2 = await tgApi(token, "sendMessage", {
      chat_id: chatId,
      text: plain,
      disable_web_page_preview: true,
    });
    return res2.ok;
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