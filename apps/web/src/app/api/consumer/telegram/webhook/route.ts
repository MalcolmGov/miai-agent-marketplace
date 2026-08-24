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
import { bindTelegramConsumer, consumerIdForChat } from "@/lib/consumer-telegram-store";
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
 * Identity is resolved in this order:
 *   1. A `/start setup_<consumerId>` deep link binds this chat_id to a signed-in consumer
 *      account (so Telegram reaches the SAME wallet + memory as the web app).
 *   2. A previously-bound chat_id resolves to its consumer account.
 *   3. Otherwise the chat_id auto-provisions an isolated `telegram:<chat_id>` identity.
 *
 * Every reply is metered onto the consumer's own wallet, and durable memory persists across
 * sessions — identical to the web/app surface.
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

  if (SECRET) {
    const headerSecret = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
    if (!verifyTelegramWebhook(SECRET, raw, headerSecret)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
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

  // 1) Deep-link setup: /start setup_<consumerId>
  const setupMatch = text.match(/^\/start\s+setup_([A-Za-z0-9._-]+)$/);
  if (setupMatch) {
    const consumerId = setupMatch[1];
    await bindTelegramConsumer(chatId, consumerId);
    await sendTelegramMessage(
      TOKEN,
      chatId,
      "✅ You're connected! Your MyInstantAI assistant is now linked to this chat.\n\n" +
        "You can start chatting right away — or head back to the app to explore more agents.",
    );
    return new NextResponse("OK");
  }

  // 2) Resolve identity: bound consumer → auto-provisioned telegram:<chat_id>
  const boundConsumerId = await consumerIdForChat(chatId);
  const consumerId = boundConsumerId ?? consumerIdForTelegram(chatId);
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