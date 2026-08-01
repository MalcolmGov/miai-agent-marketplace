import { runTurn, type ChatMessage } from "@miai/runtime";
import { createWalletAdapter } from "@miai/wallet-adapter";
import {
  isChatLanguage,
  replyLanguageSystemAppend,
  type ChatLanguageCode,
} from "@/lib/chat-languages";
import { createAskLead } from "@/lib/ask-leads";
import {
  getMarketplaceAssistantPackage,
  marketplaceAssistantId,
  marketplaceWorkspaceId,
} from "@/lib/marketplace-assistant";
import { appendAudit } from "@/lib/store";

type SessionMap = Map<string, ChatMessage[]>;

const g = globalThis as typeof globalThis & {
  __miaiAskSessions?: SessionMap;
};

function sessions(): SessionMap {
  if (!g.__miaiAskSessions) g.__miaiAskSessions = new Map();
  return g.__miaiAskSessions;
}

const MAX_SESSIONS = 400;
const MAX_TURNS = 24;

export type AskTurnOk = {
  ok: true;
  reply: string;
  paused: boolean;
  balance: number;
  tokensDebited: number;
  leadIds: string[];
};

export type AskTurnErr = {
  ok: false;
  status: number;
  error: string;
  retryAfterSec?: number;
};

export async function runAskTurn(input: {
  message: string;
  sessionId?: string;
  replyLanguage?: string;
  rateLimitOk: boolean;
  rateLimitRetryAfterSec?: number;
}): Promise<AskTurnOk | AskTurnErr> {
  if (!input.message.trim()) {
    return { ok: false, status: 400, error: "Invalid request" };
  }
  if (!input.rateLimitOk) {
    return {
      ok: false,
      status: 429,
      error: "Rate limit exceeded",
      retryAfterSec: input.rateLimitRetryAfterSec,
    };
  }

  const pkg = await getMarketplaceAssistantPackage();
  if (!pkg) {
    return { ok: false, status: 503, error: "Marketplace assistant unavailable" };
  }

  const replyLanguage: ChatLanguageCode = isChatLanguage(input.replyLanguage)
    ? input.replyLanguage
    : "en";

  const sessionKey = `ask::${input.sessionId ?? "anon"}`;
  const store = sessions();
  const history = store.get(sessionKey) ?? [];

  const systemAppend = [
    "You are chatting inside the MyInstantAI Agent Marketplace product UI.",
    "Include deep links like /trust, /demo, /roadmap, /agents/{id} when they help the user act.",
    replyLanguage !== "en" ? replyLanguageSystemAppend(replyLanguage) : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await runTurn(
    {
      workspaceId: marketplaceWorkspaceId(),
      agentId: marketplaceAssistantId(),
      pkg,
      messages: history,
      userMessage: input.message.trim(),
      model: pkg.manifest.model.primary,
      mode: "live",
      state: "live",
      systemAppend,
      replyLanguage,
    },
    { wallet: createWalletAdapter() },
  );

  if (!store.has(sessionKey) && store.size >= MAX_SESSIONS) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(sessionKey, (result.messages as ChatMessage[]).slice(-MAX_TURNS));

  const leadIds: string[] = [];
  for (const call of result.toolCalls) {
    if (call.name !== "capture_lead") continue;
    const args = call.args ?? {};
    const name = String(args.name ?? "").trim();
    const contact = String(args.contact ?? args.email ?? args.phone ?? "").trim();
    if (!name || !contact) continue;
    const lead = await createAskLead({
      name,
      contact,
      email: typeof args.email === "string" ? args.email : undefined,
      company: typeof args.company === "string" ? args.company : undefined,
      interest: String(args.interest ?? args.need ?? "").trim() || undefined,
      notes: typeof args.notes === "string" ? args.notes : undefined,
      sessionId: input.sessionId,
    });
    leadIds.push(lead.id);
    if (call.result && typeof call.result === "object") {
      (call.result as Record<string, unknown>).reference = lead.id;
      (call.result as Record<string, unknown>).source = "ask_assistant";
    }
  }

  await appendAudit({
    workspaceId: marketplaceWorkspaceId(),
    agentId: marketplaceAssistantId(),
    type: "ask_turn",
    detail: {
      tokensDebited: result.tokensDebited,
      paused: result.paused,
      leads: leadIds,
    },
  });

  let reply = result.assistantMessage;
  if (leadIds[0]) {
    reply = reply
      .replace(/LEAD-\d+/g, leadIds[0])
      .replace(/\blead_[a-f0-9]+\b/gi, leadIds[0]);
  }

  return {
    ok: true,
    reply,
    paused: Boolean(result.paused),
    balance: result.balance,
    tokensDebited: result.tokensDebited,
    leadIds,
  };
}
