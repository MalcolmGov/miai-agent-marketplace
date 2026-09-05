import { randomUUID } from "node:crypto";
import { runTurn, type ChatMessage } from "@miai/runtime";
import { agentReadiness } from "@/lib/connector-preflight";
import { createWalletAdapter } from "@miai/wallet-adapter";
import { getAgentPackage } from "@/lib/catalog";
import {
  isChatLanguage,
  replyLanguageSystemAppend,
  type ChatLanguageCode,
} from "@/lib/chat-languages";
import { createSessionStore } from "@/lib/channel-sessions";
import { getComposedKnowledge } from "@/lib/knowledge";
import {
  getWorkspaceAgent,
  originAllowed,
  resolveEmbedKey,
  upsertWorkspaceAgent,
} from "@/lib/store";
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

function bagFor(channel: ChannelKind): SessionBag {
  if (!g.__miaiChannelSessions) g.__miaiChannelSessions = new Map();
  let map = g.__miaiChannelSessions.get(channel);
  if (!map) {
    map = new Map();
    g.__miaiChannelSessions.set(channel, map);
  }
  return map;
}

// One store per channel keeps each channel's in-process bag (and eviction cap) independent,
// while the redis-backed history + trimming/TTL live once in createSessionStore.
function storeFor(channel: ChannelKind) {
  return createSessionStore<ChannelMessage>({ redisPrefix: "miai:chan:", bag: bagFor(channel) });
}

async function getChannelHistory(
  channel: ChannelKind,
  sessionKey: string,
): Promise<ChannelMessage[]> {
  return storeFor(channel).get(sessionKey);
}

async function setChannelHistory(
  channel: ChannelKind,
  sessionKey: string,
  messages: ChannelMessage[],
): Promise<void> {
  await storeFor(channel).set(sessionKey, messages);
}

type ChannelTurnInput = {
  channel: ChannelKind;
  key: string;
  message: string;
  sessionId?: string;
  replyLanguage?: string;
  correlationId?: string;
  rateLimitOk: boolean;
  rateLimitRetryAfterSec?: number;
  /** Request Origin / Referer, used to enforce per-agent domain locking (when configured). */
  origin?: string;
  referer?: string;
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

  const resolved = await resolveEmbedKey(input.key);
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

  // Per-tenant domain lock (opt-in): when the agent has approved domains, the request must
  // originate from one of them. CORS only constrains browsers; this rejects non-browser
  // callers that lifted the public key. No approved domains = unrestricted (backward-compatible).
  if (
    rental.approvedDomains?.length &&
    !originAllowed(input.origin, input.referer, rental.approvedDomains)
  ) {
    return {
      ok: false,
      status: 403,
      error: "Origin not allowed for this agent",
      detail: "This agent's embed is locked to approved domains.",
    };
  }

  const knowledgeOverride = await getComposedKnowledge(
    workspaceId,
    agentId,
    rental.knowledge || pkg.knowledge,
  );

  const sessionKey = `${input.channel}::${workspaceId}::${agentId}::${input.sessionId ?? "anon"}`;
  const history = await getChannelHistory(input.channel, sessionKey);

  const replyLanguage: ChatLanguageCode = isChatLanguage(input.replyLanguage)
    ? input.replyLanguage
    : "en";
  // P0-6: keep the model honest about unconnected connectors on embed/widget turns too. The embed
  // end-user can't connect them (that's the owner's job), so we inject only the system notice, not a
  // UI payload. Inert in sandbox via the helper's mode short-circuit.
  const preflight = await agentReadiness(workspaceId, pkg, rental.bindings, "live");
  const systemAppend = [
    HANDOFF_POLICY[input.channel],
    replyLanguage !== "en" ? replyLanguageSystemAppend(replyLanguage) : "",
    preflight.systemAppend,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    ok: true,
    workspaceId,
    agentId,
    sessionKey,
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
      // Scope the DERIVED wallet-debit idempotency key per visitor session. Without this, two
      // different embed/app visitors whose first message is identical (e.g. a suggested opening
      // prompt) derive the same key, and the gateway dedups the second to a free turn. The consumer
      // wrapper already forwards this; the B2B channel must too. Our embed widget always sends a
      // sessionId; if a caller sends none, bill each turn on its own key rather than let session-less
      // turns collide into a free dedup.
      sessionId: input.sessionId,
      ...(input.sessionId?.trim() ? {} : { idempotencyKey: randomUUID() }),
    },
  };
}

async function finalizeChannelTurn(
  input: ChannelTurnInput,
  prepared: {
    workspaceId: string;
    agentId: string;
    sessionKey: string;
    turnInput: Parameters<typeof runTurn>[0];
  },
  result: Awaited<ReturnType<typeof runTurn>>,
): Promise<ChannelTurnOk> {
  await setChannelHistory(
    input.channel,
    prepared.sessionKey,
    result.messages as ChannelMessage[],
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
