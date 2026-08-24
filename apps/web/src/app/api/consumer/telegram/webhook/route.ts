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
 * Receives inbound Telegram messages and routes them through the consumer turn
 * pipeline. A Telegram user's chat_id becomes their consumer identity — no OIDC
 * needed. Every reply is metered onto their own wallet, and durable memory
 * (facts, goals, people) persists across sessions just like the web app surface.
 *
 * Telegram calls this webhook once per message; we must return 200 quickly and
 * do the LLM turn asynchronously, or Telegram will retry/timeout. We fire the
 * turn and reply in the same request but within Telegram's ~10s window — for
 * longer turns we'd move to a queue + edit-message pattern later.
 */
export async function POST(req: Request) {
  if (!TOKEN) {
    return new NextResponse("Telegram bot not configured", { status: 503 });
  }

  let raw: string;
  let update: TelegramUpdate;
  try {
    raw = await req.text();
    update = JSON.parse(raw);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  // Optional webhook secret verification (set via Bot API setWebhook?secret_token=…)
  if (SECRET) {
    const headerSecret = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
    if (!verifyTelegramWebhook(SECRET, raw, headerSecret)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const msg: TelegramMessage | undefined = update.message;
  if (!msg?.text || !msg.chat?.id) {
    // Not a text message (could be a photo, sticker, join/leave event, etc.) —
    // acknowledge silently so Telegram doesn't retry, but don't process.
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

  // Rate limit: 30 messages / minute per Telegram consumer
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
    "en";

  // Show typing indicator while the turn runs
  await sendTelegramTyping(TOKEN, chatId);

  // Run the same consumer turn pipeline as the web/app surface
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
    // Don't leak error details to the Telegram user
    await sendTelegramMessage(
      TOKEN,
      chatId,
      "Sorry, I ran into a problem processing that. Please try again in a moment.",
    );
  }

  return new NextResponse("OK");
}