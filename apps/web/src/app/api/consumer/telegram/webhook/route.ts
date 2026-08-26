import { NextResponse } from "next/server";
import { runConsumerTurn } from "@/lib/consumer-turn";
import {
  consumerIdForTelegram,
  DEFAULT_TELEGRAM_AGENT,
  DEFAULT_TELEGRAM_TENANT,
  escapeTelegramHtml,
  sendTelegramMessage,
  sendTelegramTyping,
  verifySetupNonce,
  verifyTelegramWebhook,
  type TelegramUpdate,
  type TelegramMessage,
} from "@/lib/consumer-telegram";
import { bindTelegram, getActiveAgent, getBoundConsumer, setActiveAgent } from "@/lib/consumer-telegram-store";
import { getPersonalAgent, listPersonalAgents, personalAgentRunnable } from "@/lib/consumer-catalog";
import { newCorrelationId } from "@/lib/traceability";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SECRET = process.env.TELEGRAM_BOT_SECRET;

/** A Telegram slash-command is an agent id with hyphens → underscores (study-coach → study_coach). */
const agentCommand = (id: string) => id.replace(/-/g, "_");

async function runnableSpecialists() {
  return (await listPersonalAgents()).filter(personalAgentRunnable);
}

async function agentDisplayName(id: string): Promise<string> {
  if (id === DEFAULT_TELEGRAM_AGENT) return "Personal Assistant";
  return (await getPersonalAgent(id))?.name ?? id;
}

/** The switch menu: the general assistant + every runnable specialist, marking the active one. */
async function agentMenuText(activeId: string): Promise<string> {
  const row = (id: string, name: string) =>
    `${id === activeId ? "▶️ " : ""}<b>${escapeTelegramHtml(name)}</b> — /${agentCommand(id)}`;
  const specialists = await runnableSpecialists();
  const lines = [
    row(DEFAULT_TELEGRAM_AGENT, "Personal Assistant (general)"),
    ...specialists.map((a) => row(a.id, a.name)),
  ];
  return `🤖 <b>Your assistants</b> — tap one to switch:\n\n${lines.join("\n")}\n\nWe share the same memory across all of them.`;
}

/** Resolve a bare command (no leading slash) to an agent id, or null if it isn't one. */
async function resolveAgentCommand(cmd: string): Promise<string | null> {
  if (cmd === agentCommand(DEFAULT_TELEGRAM_AGENT)) return DEFAULT_TELEGRAM_AGENT;
  const specialists = await runnableSpecialists();
  return specialists.find((a) => agentCommand(a.id) === cmd)?.id ?? null;
}

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

  // "/start setup_<nonce>" links this chat to a signed-in web consumer (shared memory /
  // wallet); a bare "/start" just greets. Neither runs a metered turn.
  if (text.startsWith("/start")) {
    const arg = text.slice("/start".length).trim();
    const nonce = arg.startsWith("setup_") ? arg.slice("setup_".length) : "";
    if (nonce) {
      const linked = verifySetupNonce(nonce);
      const [linkedTenant, linkedConsumer] = linked ? linked.split("::") : [];
      if (linkedTenant && linkedConsumer) {
        await bindTelegram(chatId, { tenantId: linkedTenant, consumerId: linkedConsumer });
        await sendTelegramMessage(
          TOKEN,
          chatId,
          "✅ Connected. I'll remember our conversations here and in your app. What can I help with?",
        );
      } else {
        await sendTelegramMessage(
          TOKEN,
          chatId,
          "That connection link has expired. Open your app and tap “Connect Telegram” again.",
        );
      }
      return new NextResponse("OK");
    }
    await sendTelegramMessage(
      TOKEN,
      chatId,
      "👋 Hi — I'm your assistant. Ask me anything, or link your account from the app to share memory across web and Telegram.",
    );
    return new NextResponse("OK");
  }

  // Agent menu + switching (no metered turn). "/agents" lists the assistants; "/<agent>" switches.
  if (text === "/agents" || text === "/menu" || text === "/help") {
    const active = (await getActiveAgent(chatId)) ?? DEFAULT_TELEGRAM_AGENT;
    await sendTelegramMessage(TOKEN, chatId, await agentMenuText(active));
    return new NextResponse("OK");
  }
  if (text.startsWith("/")) {
    const cmd = text.slice(1).split(/\s+/)[0].split("@")[0].toLowerCase();
    const switched = await resolveAgentCommand(cmd);
    if (switched) {
      await setActiveAgent(chatId, switched);
      await sendTelegramMessage(
        TOKEN,
        chatId,
        `Now talking to <b>${escapeTelegramHtml(await agentDisplayName(switched))}</b>. Go ahead — what do you need?`,
      );
    } else {
      await sendTelegramMessage(TOKEN, chatId, "Unknown command. Send /agents to see your assistants.");
    }
    return new NextResponse("OK");
  }

  // A linked chat uses its web identity; an unlinked chat stays a standalone telegram:<id> identity.
  // The active agent is per-chat (switched via /agents); default is the general personal-assistant.
  const bound = await getBoundConsumer(chatId);
  const consumerId = bound?.consumerId ?? consumerIdForTelegram(chatId);
  const tenantId = bound?.tenantId ?? DEFAULT_TELEGRAM_TENANT;
  const agentId = (await getActiveAgent(chatId)) ?? DEFAULT_TELEGRAM_AGENT;

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
    sessionId: `tg:${chatId}:${agentId}`,
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