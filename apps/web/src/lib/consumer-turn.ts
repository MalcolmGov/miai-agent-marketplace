import { runTurn, type ChatMessage } from "@miai/runtime";
import { createWalletAdapter } from "@miai/wallet-adapter";
import { getAgentPackage } from "@/lib/catalog";
import {
  isChatLanguage,
  replyLanguageSystemAppend,
  type ChatLanguageCode,
} from "@/lib/chat-languages";
import { DEFAULT_CONSUMER_AGENT, isConsumerAgent } from "@/lib/consumer";
import { getComposedKnowledge } from "@/lib/knowledge";
import { redisAvailable, redisGet, redisSet } from "@/lib/redis";
import { newCorrelationId, recordChatTurn } from "@/lib/traceability";

/**
 * Consumer turn runner — the individual-facing sibling of channel-turn.
 *
 * Differences from the B2B channel path, on purpose:
 *  - identity comes from auth (a person), not an embed key, so there is no key to resolve;
 *  - there is no rental/publish gate — a consumer isn't a tenant renting a marketplace SKU. The
 *    only gate on running is the wallet: the runtime debits and reports `paused` at zero balance;
 *  - usage debits the consumer's own wallet (keyed by walletId) via the same wallet adapter;
 *  - only vetted consumer agents (see consumer.ts) are runnable.
 *
 * Tool bindings are intentionally not wired here yet: connecting a consumer's own Gmail/Calendar
 * to the agent's tools is the next slice. Until then the agent converses and reasons; tool calls
 * are surfaced by the runtime but not executed against real connectors.
 */

export type ConsumerMessage = {
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
};

export type ConsumerTurnOk = {
  ok: true;
  walletId: string;
  agentId: string;
  assistantMessage: string;
  paused: boolean;
  balance: number;
  tokensDebited: number;
  messages: ConsumerMessage[];
  correlationId: string;
};

export type ConsumerTurnErr = {
  ok: false;
  status: number;
  error: string;
  detail?: string;
  retryAfterSec?: number;
};

export type ConsumerTurnResult = ConsumerTurnOk | ConsumerTurnErr;

export type ConsumerTurnInput = {
  /** Authenticated consumer identity (for audit + session scoping). */
  consumerId: string;
  /** Wallet the turn debits — from walletIdForConsumer(auth). */
  walletId: string;
  agentId: string;
  message: string;
  sessionId?: string;
  replyLanguage?: string;
  correlationId?: string;
  rateLimitOk: boolean;
  rateLimitRetryAfterSec?: number;
  onDelta?: (text: string) => void;
  onToolStart?: () => void;
};

// ---- session memory (redis when available, else in-process; mirrors channel-turn) ----

type SessionBag = Map<string, ConsumerMessage[]>;
const g = globalThis as typeof globalThis & { __miaiConsumerSessions?: SessionBag };

function sessions(): SessionBag {
  if (!g.__miaiConsumerSessions) g.__miaiConsumerSessions = new Map();
  return g.__miaiConsumerSessions;
}

const MAX_SESSIONS = 1000;
const MAX_TURNS_KEPT = 24;
const SESSION_TTL_SEC = 24 * 60 * 60;

async function getHistory(sessionKey: string): Promise<ConsumerMessage[]> {
  if (redisAvailable()) {
    const raw = await redisGet(`miai:consumer:${sessionKey}`);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as ConsumerMessage[];
    } catch {
      return [];
    }
  }
  return sessions().get(sessionKey) ?? [];
}

async function setHistory(sessionKey: string, messages: ConsumerMessage[]): Promise<void> {
  const trimmed = messages.slice(-MAX_TURNS_KEPT);
  if (redisAvailable()) {
    await redisSet(`miai:consumer:${sessionKey}`, JSON.stringify(trimmed), SESSION_TTL_SEC);
    return;
  }
  const store = sessions();
  if (!store.has(sessionKey) && store.size >= MAX_SESSIONS) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(sessionKey, trimmed);
}

// ---- turn ----

type Prepared = {
  ok: true;
  sessionKey: string;
  turnInput: Parameters<typeof runTurn>[0];
};

async function prepare(input: ConsumerTurnInput): Promise<ConsumerTurnErr | Prepared> {
  if (!input.walletId || !input.message.trim()) {
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

  const agentId = input.agentId || DEFAULT_CONSUMER_AGENT;
  if (!isConsumerAgent(agentId)) {
    return {
      ok: false,
      status: 403,
      error: "Agent not available on the consumer line",
      detail: "This agent id is not one an individual can run here.",
    };
  }

  const pkg = await getAgentPackage(agentId);
  if (!pkg) return { ok: false, status: 404, error: "Agent missing" };

  const knowledgeOverride = await getComposedKnowledge(input.walletId, agentId, pkg.knowledge);

  const sessionKey = `${input.walletId}::${agentId}::${input.sessionId ?? "default"}`;
  const history = await getHistory(sessionKey);

  const replyLanguage: ChatLanguageCode = isChatLanguage(input.replyLanguage)
    ? input.replyLanguage
    : "en";
  const systemAppend = replyLanguage !== "en" ? replyLanguageSystemAppend(replyLanguage) : "";

  return {
    ok: true,
    sessionKey,
    turnInput: {
      workspaceId: input.walletId,
      agentId,
      pkg,
      messages: history as ChatMessage[],
      userMessage: input.message,
      model: pkg.manifest?.model?.primary ?? "claude-sonnet",
      mode: "live",
      knowledgeOverride,
      state: "live",
      systemAppend,
      replyLanguage,
    },
  };
}

async function finalize(
  input: ConsumerTurnInput,
  prepared: Prepared,
  result: Awaited<ReturnType<typeof runTurn>>,
): Promise<ConsumerTurnOk> {
  await setHistory(prepared.sessionKey, result.messages as ConsumerMessage[]);

  const correlationId = input.correlationId?.trim() || newCorrelationId();
  const agentId = prepared.turnInput.agentId;
  await recordChatTurn({
    correlationId,
    workspaceId: input.walletId,
    agentId,
    channel: "consumer",
    sessionId: input.sessionId ?? "default",
    userId: input.consumerId,
    userMessage: input.message.trim(),
    assistantMessage: result.assistantMessage,
    toolCalls: result.toolCalls,
    tokensDebited: result.tokensDebited,
    paused: result.paused,
    model: prepared.turnInput.model,
    mode: "live",
    replyLanguage: prepared.turnInput.replyLanguage,
    auditType: "consumer_turn",
    extraDetail: { streamed: Boolean(input.onDelta), balance: result.balance },
  });

  return {
    ok: true,
    walletId: input.walletId,
    agentId,
    assistantMessage: result.assistantMessage,
    paused: result.paused,
    balance: result.balance,
    tokensDebited: result.tokensDebited,
    messages: result.messages as ConsumerMessage[],
    correlationId,
  };
}

export async function runConsumerTurn(input: ConsumerTurnInput): Promise<ConsumerTurnResult> {
  const prepared = await prepare(input);
  if (!prepared.ok) return prepared;
  const result = await runTurn(prepared.turnInput, { wallet: createWalletAdapter() });
  return finalize(input, prepared, result);
}

/** Same as runConsumerTurn but forwards live model token deltas (and tool-start resets). */
export async function runConsumerTurnStream(input: ConsumerTurnInput): Promise<ConsumerTurnResult> {
  const prepared = await prepare(input);
  if (!prepared.ok) return prepared;
  const result = await runTurn(prepared.turnInput, {
    wallet: createWalletAdapter(),
    onDelta: input.onDelta,
    onToolStart: input.onToolStart,
  });
  return finalize(input, prepared, result);
}
