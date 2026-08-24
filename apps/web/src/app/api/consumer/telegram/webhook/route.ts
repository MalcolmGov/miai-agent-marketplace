import { NextResponse } from "next/server";
import { runConsumerTurn } from "@/lib/consumer-turn";
import {
  consumerIdForTelegram,
  DEFAULT_TELEGRAM_AGENT,
  DEFAULT_TELEGRAM_TENANT,
  sendTelegramMessage,
  sendTelegramTyping,
  verifyTelegramWebhook,
  type TelegramUpdate,
  type TelegramMessage,
} from "@/lib/consumer-telegram";
import { newCorrelationId } from "@/lib/traceability";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SECRET = process.env.TELEGRAM_BOT_SECRET;

/**
 * POST /api/consumer/telegram/webhook
 *
 * Receives inbound Telegram messages and routes them through the consumer turn pipeline.
 *
 * Identity: each Telegram chat auto-provisions an isolated `telegram:<chat_id>` identity.
 * No OIDC, no cross-account binding — the Telegram user IS the identity. Same wallet,
 * memory, and reminders as any consumer, but scoped to that one chat.
 *
 * Security:
 *  - Webhook secret is MANDATORY (fails closed if unset).
 *  - Private chats only (groups/channels are silently ignored).
 *  - Rate-limited per chat_id.
 */
export async function POST(req: Request) {
  if (!TOKEN) {
    return new NextResponse("Telegram bot not configured", { status: 503 });
  }

  if (!SECRET) {
    return new NextResponse("Telegram webhook secret not configured", { status: 503 });
  }

  let raw: string;
  let update: TelegramUpdate;
  try {
    raw = await req.text();
    update = JSON.parse(raw);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const headerSecret = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!verifyTelegramWebhook(SECRET, headerSecret)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const msg: TelegramMessage | undefined = update.message;
  if (!msg?.text || !msg.chat?.id) {
    return new NextResponse("OK");
  }

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  if (!text) return new NextResponse("OK");

  // Only respond in private chats (not groups/channels) for consumer line safety
  if (msg.chat.type !== "private") {
    return new NextResponse("OK");
  }

  const consumerId = consumerIdForTelegram(chatId);
  const tenantId = DEFAULT_TELEGRAM_TENANT;
  const agentId = DEFAULT_TELEGRAM_AGENT;

  const limited = await rateLimit(`consumer:tg:${chatId}:${agentId}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    await sendTelegramMessage(
      TOKEN,
      chatId,
      "You're sending messages too quickly — please wait a moment.",
    );
    return new NextResponse("OK");
  }

  const correlationId = newCorrelationId();
  const replyLanguage =
    msg.from?.language_code?.slice(0, 2) === "ru" ? "ru" :
    msg.from?.language_code?.slice(0, 2) === "es" ? "es" :
    msg.from?.language_code?.slice(0, 2) === "fr" ? "fr" :
    msg.from?.language_code?.slice(0, 2) === "de" ? "de" :
    msg.from?.language_code?.slice(0, 2) === "af" ? "af" :
    msg.from?.language_code?.slice(0, 2) === "zu" ? "zu" :
    "en";

  await sendTelegramTyping(TOKEN, chatId);

  const result = await runConsumerTurn({
    tenantId,
    consumerId,
    walletId: consumerId,
    agentId,
    message: text,
    sessionId: `tg:${chatId}`,
    replyLanguage,
    correlationId,
    rateLimitOk: true,
  });

  if (result.ok && result.assistantMessage) {
    await sendTelegramMessage(TOKEN, chatId, result.assistantMessage);
  } else if (!result.ok) {
    await sendTelegramMessage(
      TOKEN,
      chatId,
      "Sorry, I ran into a problem processing that. Please try again in a moment.",
    );
  }

  return new NextResponse("OK");
}