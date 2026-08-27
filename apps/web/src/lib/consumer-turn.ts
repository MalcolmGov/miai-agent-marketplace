import { runTurn, type ChatMessage } from "@miai/runtime";
import { createWalletAdapter } from "@miai/wallet-adapter";
import { getAgentPackage } from "@/lib/catalog";
import {
  isChatLanguage,
  replyLanguageSystemAppend,
  type ChatLanguageCode,
} from "@/lib/chat-languages";
import { createSessionStore } from "@/lib/channel-sessions";
import { DEFAULT_CONSUMER_AGENT, isRunnableConsumerAgent } from "@/lib/consumer";
import { getComposedKnowledge } from "@/lib/knowledge";
import { getMemoryContext, rememberFact, type MemoryOwner } from "@/lib/consumer-memory-store";
import { extractDurableFacts } from "@/lib/memory-extract";
import {
  getGoalsContext,
  getPeopleContext,
  rememberPerson,
  setGoal,
} from "@/lib/consumer-lifegraph-store";
import { setReminder } from "@/lib/consumer-reminders-store";
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
  /** Brand/workspace the consumer belongs to (auth.workspaceId) — the memory tenant boundary. */
  tenantId: string;
  /** Authenticated consumer identity (for audit + session scoping). */
  consumerId: string;
  /** Wallet the turn debits — from walletIdForConsumer(auth). */
  walletId: string;
  agentId: string;
  message: string;
  sessionId?: string;
  /** Per-submit wallet-debit idempotency key from the client — unique per distinct send, reused
   *  only on a retry of the SAME send. Forwarded to the runtime so a replay dedups the charge. */
  idempotencyKey?: string;
  replyLanguage?: string;
  correlationId?: string;
  rateLimitOk: boolean;
  rateLimitRetryAfterSec?: number;
  onDelta?: (text: string) => void;
  onToolStart?: () => void;
};

// ---- session memory (shared store: redis when available, else in-process) ----

const g = globalThis as typeof globalThis & {
  __miaiConsumerSessions?: Map<string, ConsumerMessage[]>;
};
const consumerBag: Map<string, ConsumerMessage[]> =
  g.__miaiConsumerSessions ?? (g.__miaiConsumerSessions = new Map());

const sessionStore = createSessionStore<ConsumerMessage>({
  redisPrefix: "miai:consumer:",
  bag: consumerBag,
  maxSessions: 1000,
});

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
  if (!(await isRunnableConsumerAgent(agentId))) {
    return {
      ok: false,
      status: 403,
      error: "Agent not available on the consumer line",
      detail: "This agent id is not one an individual can run here.",
    };
  }

  const pkg = await getAgentPackage(agentId);
  if (!pkg) return { ok: false, status: 404, error: "Agent missing" };

  // Knowledge is scoped to the AUTHENTICATED person (walletId = userId), NOT input.tenantId (the
  // client-supplied ?workspaceId= brand). Do NOT "fix" this to pass tenantId: that would make brand
  // knowledge a client-controlled cross-tenant read. See getComposedKnowledge's ownerId contract.
  const knowledgeOverride = await getComposedKnowledge(input.walletId, agentId, pkg.knowledge);

  const sessionKey = `${input.walletId}::${agentId}::${input.sessionId ?? "default"}`;
  const history = await sessionStore.get(sessionKey);

  const replyLanguage: ChatLanguageCode = isChatLanguage(input.replyLanguage)
    ? input.replyLanguage
    : "en";
  const langAppend = replyLanguage !== "en" ? replyLanguageSystemAppend(replyLanguage) : "";
  // Durable memory (tenant-scoped): fold what we know about this consumer — facts, goals, and the
  // people in their life — into the system prompt, so the assistant carries it across sessions.
  const owner: MemoryOwner = { tenantId: input.tenantId, consumerId: input.consumerId };
  const [memoryAppend, goalsAppend, peopleAppend] = await Promise.all([
    getMemoryContext(owner, input.message),
    getGoalsContext(owner),
    getPeopleContext(owner),
  ]);
  const systemAppend = [langAppend, memoryAppend, goalsAppend, peopleAppend]
    .filter(Boolean)
    .join("\n\n");

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
      consumerLine: true,
      // Session scopes the DERIVED idempotency key so two distinct conversations with an identical
      // first message are charged separately; idempotencyKey (when the client sends one) overrides.
      sessionId: input.sessionId,
      idempotencyKey: input.idempotencyKey,
    },
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function num(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

/**
 * Persist the durable-memory writes the assistant made this turn — facts, goals, and people. Those
 * tools run in the runtime/connectors layer, which can't reach the app-layer stores, so we record
 * them here from the turn's tool calls, scoped to (tenant, consumer). Best-effort: a memory write
 * must never fail the chat turn. Order matters — remember_person also matches /remember/, so people
 * and goals are checked before the generic fact branch.
 */
async function persistMemoryWrites(
  owner: MemoryOwner,
  toolCalls: Awaited<ReturnType<typeof runTurn>>["toolCalls"],
): Promise<void> {
  if (!owner.tenantId || !owner.consumerId || !toolCalls?.length) return;
  for (const call of toolCalls) {
    const name = call.name.toLowerCase();
    const a = (call.args ?? {}) as Record<string, unknown>;
    try {
      if (/person|contact/.test(name)) {
        const personName = str(a.name ?? a.person ?? a.who).trim();
        if (personName) {
          await rememberPerson(owner, {
            name: personName,
            relationship: str(a.relationship ?? a.relation ?? a.role) || undefined,
            notes: str(a.notes ?? a.note ?? a.detail) || undefined,
          });
        }
      } else if (/goal/.test(name)) {
        const title = str(a.title ?? a.goal ?? a.name).trim();
        if (title) {
          await setGoal(owner, {
            title,
            detail: str(a.detail ?? a.description) || undefined,
            target: str(a.target) || undefined,
            progress: num(a.progress),
            deadline: str(a.deadline ?? a.due) || undefined,
            status: str(a.status) || undefined,
          });
        }
      } else if (/remember/.test(name)) {
        const content = str(a.fact ?? a.note ?? a.text ?? a.value ?? a.content).trim();
        if (content) {
          await rememberFact(owner, {
            content,
            category: typeof a.category === "string" ? a.category : undefined,
            source: "assistant",
          });
        }
      }
    } catch {
      /* best-effort — never fail a turn on a memory write */
    }
  }
}

/**
 * Persist reminders the assistant set this turn. set_reminder runs in the connectors layer (and, if
 * the user's calendar is connected, also drops a calendar event there), but the in-app reminder is
 * owned here so it works regardless of which channels are connected — scoped to (tenant, consumer).
 * Best-effort: a reminder write must never fail the chat turn. Matches /remind/ so it never collides
 * with remember_about_me (which is /remember/).
 */
async function persistReminderWrites(
  owner: MemoryOwner,
  toolCalls: Awaited<ReturnType<typeof runTurn>>["toolCalls"],
): Promise<void> {
  if (!owner.tenantId || !owner.consumerId || !toolCalls?.length) return;
  for (const call of toolCalls) {
    if (!/remind/.test(call.name.toLowerCase())) continue;
    const a = (call.args ?? {}) as Record<string, unknown>;
    const text = str(a.text ?? a.summary ?? a.what ?? a.title).trim();
    const when = str(a.when ?? a.datetime ?? a.time ?? a.date).trim();
    if (!text || !when) continue;
    try {
      await setReminder(owner, { text, when, channel: str(a.channel) || undefined });
    } catch {
      /* best-effort — never fail a turn on a reminder write */
    }
  }
}

/**
 * Passively store durable self-facts the user revealed but didn't explicitly ask to keep (e.g.
 * "I'm vegetarian", "I live in Lisbon"). High-precision heuristics, no extra model call, so the
 * assistant remembers things it wasn't told to — the "feels smarter" half of memory. Best-effort.
 */
async function persistPassiveFacts(owner: MemoryOwner, message: string): Promise<void> {
  if (!owner.tenantId || !owner.consumerId) return;
  for (const fact of extractDurableFacts(message)) {
    try {
      await rememberFact(owner, { content: fact.content, category: fact.category, source: "auto" });
    } catch {
      /* best-effort — never fail a turn on a memory write */
    }
  }
}

async function finalize(
  input: ConsumerTurnInput,
  prepared: Prepared,
  result: Awaited<ReturnType<typeof runTurn>>,
): Promise<ConsumerTurnOk> {
  await sessionStore.set(prepared.sessionKey, result.messages as ConsumerMessage[]);
  const owner: MemoryOwner = { tenantId: input.tenantId, consumerId: input.consumerId };
  await persistMemoryWrites(owner, result.toolCalls);
  await persistReminderWrites(owner, result.toolCalls);
  await persistPassiveFacts(owner, input.message);

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
