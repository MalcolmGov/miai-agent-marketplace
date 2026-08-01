import { runTurn, type ChatMessage } from "@miai/runtime";
import { createWalletAdapter } from "@miai/wallet-adapter";
import { getAgentPackage } from "@/lib/catalog";
import {
  isChatLanguage,
  replyLanguageSystemAppend,
  type ChatLanguageCode,
} from "@/lib/chat-languages";
import { getComposedKnowledge } from "@/lib/knowledge";
import { getWorkspaceAgent, resolveEmbedKey, upsertWorkspaceAgent } from "@/lib/store";
import { newCorrelationId, recordChatTurn } from "@/lib/traceability";

export type ChannelKind = "embed" | "app";

export type ChannelMessage = {
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
};

const LIVE_STATES = new Set(["live", "rented", "paused_no_tokens"]);

const HANDOFF_POLICY: Record<ChannelKind, string> = {
  embed: [
    "## Handoff contact policy (website chat)",
    "When a visitor wants a human (or you decide to hand off), you MUST first collect their",
    "full name, best phone number, and email address so the team can reach them — ask briefly",
    "and naturally, in one message, for whichever of the three you don't have yet. Only call",
    "handoff_to_human once you have them, passing customer: {name, phone, email} in the args.",
    "After the tool succeeds, confirm that a team member will contact them on those details.",
  ].join("\n"),
  app: [
    "## Handoff contact policy (in-app chat)",
    "When a user wants a human (or you decide to hand off), you MUST first collect their",
    "full name, best phone number, and email address so the team can reach them — ask briefly",
    "and naturally, in one message, for whichever of the three you don't have yet. Only call",
    "handoff_to_human once you have them, passing customer: {name, phone, email} in the args.",
    "After the tool succeeds, confirm that a team member will contact them on those details.",
  ].join("\n"),
};

export type ChannelTurnOk = {
  ok: true;
  workspaceId: string;
  agentId: string;
  assistantMessage: string;
  paused: boolean;
  balance: number;
  tokensDebited: number;
  messages: ChannelMessage[];
  correlationId: string;
};

export type ChannelTurnErr = {
  ok: false;
  status: number;
  error: string;
  detail?: string;
  retryAfterSec?: number;
};

export type ChannelTurnResult = ChannelTurnOk | ChannelTurnErr;

type SessionBag = Map<string, ChannelMessage[]>;

const g = globalThis as typeof globalThis & {
  __miaiChannelSessions?: Map<ChannelKind, SessionBag>;
};

function sessionsFor(channel: ChannelKind): SessionBag {
  if (!g.__miaiChannelSessions) g.__miaiChannelSessions = new Map();
  let map = g.__miaiChannelSessions.get(channel);
  if (!map) {
    map = new Map();
    g.__miaiChannelSessions.set(channel, map);
  }
  return map;
}

const MAX_SESSIONS = 500;
const MAX_TURNS_KEPT = 24;

type ChannelTurnInput = {
  channel: ChannelKind;
  key: string;
  message: string;
  sessionId?: string;
  replyLanguage?: string;
  correlationId?: string;
  rateLimitOk: boolean;
  rateLimitRetryAfterSec?: number;
  onDelta?: (text: string) => void;
  onToolStart?: () => void;
};

async function prepareChannelTurn(input: ChannelTurnInput): Promise<
  | ChannelTurnErr
  | {
      ok: true;
      workspaceId: string;
      agentId: string;
      sessionKey: string;
      store: SessionBag;
      turnInput: Parameters<typeof runTurn>[0];
    }
> {
  if (!input.key || !input.message.trim()) {
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

  const resolved = resolveEmbedKey(input.key);
  if (!resolved) return { ok: false, status: 401, error: "Invalid key" };

  const { workspaceId, agentId } = resolved;
  const pkg = await getAgentPackage(agentId);
  if (!pkg) return { ok: false, status: 404, error: "Agent missing" };

  const rental = await getWorkspaceAgent(workspaceId, agentId);
  if (!rental || !LIVE_STATES.has(rental.state)) {
    return {
      ok: false,
      status: 403,
      error: `Agent not published for ${input.channel}`,
      detail: "Rent and go live from Agent Studio before deploying this channel.",
    };
  }

  const knowledgeOverride = await getComposedKnowledge(
    workspaceId,
    agentId,
    rental.knowledge || pkg.knowledge,
  );

  const sessionKey = `${input.channel}::${workspaceId}::${agentId}::${input.sessionId ?? "anon"}`;
  const store = sessionsFor(input.channel);
  const history = store.get(sessionKey) ?? [];

  const replyLanguage: ChatLanguageCode = isChatLanguage(input.replyLanguage)
    ? input.replyLanguage
    : "en";
  const systemAppend = [
    HANDOFF_POLICY[input.channel],
    replyLanguage !== "en" ? replyLanguageSystemAppend(replyLanguage) : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    ok: true,
    workspaceId,
    agentId,
    sessionKey,
    store,
    turnInput: {
      workspaceId,
      agentId,
      pkg,
      messages: history as ChatMessage[],
      userMessage: input.message,
      model: rental.model,
      mode: "live",
      knowledgeOverride,
      bindings: rental.bindings,
      state: rental.state,
      systemAppend,
      replyLanguage,
    },
  };
}

async function finalizeChannelTurn(
  input: ChannelTurnInput,
  prepared: {
    workspaceId: string;
    agentId: string;
    sessionKey: string;
    store: SessionBag;
    turnInput: Parameters<typeof runTurn>[0];
  },
  result: Awaited<ReturnType<typeof runTurn>>,
): Promise<ChannelTurnOk> {
  if (!prepared.store.has(prepared.sessionKey) && prepared.store.size >= MAX_SESSIONS) {
    const oldest = prepared.store.keys().next().value;
    if (oldest) prepared.store.delete(oldest);
  }
  prepared.store.set(
    prepared.sessionKey,
    (result.messages as ChannelMessage[]).slice(-MAX_TURNS_KEPT),
  );

  if (result.paused) {
    await upsertWorkspaceAgent(prepared.workspaceId, prepared.agentId, {
      agentId: prepared.agentId,
      state: "paused_no_tokens",
    });
  }

  const correlationId = input.correlationId?.trim() || newCorrelationId();
  const sessionId = input.sessionId ?? "anon";
  await recordChatTurn({
    correlationId,
    workspaceId: prepared.workspaceId,
    agentId: prepared.agentId,
    channel: input.channel,
    sessionId,
    userMessage: input.message.trim(),
    assistantMessage: result.assistantMessage,
    toolCalls: result.toolCalls,
    tokensDebited: result.tokensDebited,
    paused: result.paused,
    model: prepared.turnInput.model,
    mode: "live",
    replyLanguage: prepared.turnInput.replyLanguage,
    auditType: input.channel === "app" ? "app_turn" : "embed_turn",
    extraDetail: { streamed: Boolean(input.onDelta), balance: result.balance },
  });

  return {
    ok: true,
    workspaceId: prepared.workspaceId,
    agentId: prepared.agentId,
    assistantMessage: result.assistantMessage,
    paused: result.paused,
    balance: result.balance,
    tokensDebited: result.tokensDebited,
    messages: result.messages as ChannelMessage[],
    correlationId,
  };
}

export async function runChannelTurn(input: ChannelTurnInput): Promise<ChannelTurnResult> {
  const prepared = await prepareChannelTurn(input);
  if (!prepared.ok) return prepared;

  const result = await runTurn(prepared.turnInput, { wallet: createWalletAdapter() });
  return finalizeChannelTurn(input, prepared, result);
}

/** Same as runChannelTurn but forwards live model token deltas (and tool-start resets). */
export async function runChannelTurnStream(input: ChannelTurnInput): Promise<ChannelTurnResult> {
  const prepared = await prepareChannelTurn(input);
  if (!prepared.ok) return prepared;

  const result = await runTurn(prepared.turnInput, {
    wallet: createWalletAdapter(),
    onDelta: input.onDelta,
    onToolStart: input.onToolStart,
  });
  return finalizeChannelTurn(input, prepared, result);
}

/** Split reply into paced chunks (fallback / non-stream adapters). */
export function chunkReplyForStream(text: string): string[] {
  if (!text) return [""];
  const parts: string[] = [];
  const words = text.split(/(\s+)/);
  let buf = "";
  for (const w of words) {
    buf += w;
    if (buf.length >= 12 || /\n$/.test(buf)) {
      parts.push(buf);
      buf = "";
    }
  }
  if (buf) parts.push(buf);
  return parts.length ? parts : [text];
}
