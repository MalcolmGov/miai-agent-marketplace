import { NextResponse } from "next/server";
import { runTurn } from "@miai/runtime";
import { createWalletAdapter } from "@miai/wallet-adapter";
import { getAgentPackage } from "@/lib/catalog";
import { getComposedKnowledge } from "@/lib/knowledge";
import { appendAudit, getWorkspaceAgent, resolveEmbedKey, upsertWorkspaceAgent } from "@/lib/store";
import { rateLimit } from "@/lib/security";

/** The widget runs on customers' websites, so this endpoint must answer cross-origin.
 *  The embed key identifies (and is scoped to) the tenant agent; it is public by design. */
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** Per-visitor conversation histories. Keyed by workspace::agent::session so two website
 *  visitors NEVER share context (rental.messages is the studio's sandbox thread, not ours).
 *  In-memory with a simple cap; a session dies with the container, which is fine for a
 *  website chat. */
type EmbedMessage = { role: "user" | "assistant" | "tool"; content: string; toolName?: string };
const gEmbed = globalThis as typeof globalThis & { __miaiEmbedSessions?: Map<string, EmbedMessage[]> };
function sessions(): Map<string, EmbedMessage[]> {
  if (!gEmbed.__miaiEmbedSessions) gEmbed.__miaiEmbedSessions = new Map();
  return gEmbed.__miaiEmbedSessions;
}
const MAX_SESSIONS = 500;
const MAX_TURNS_KEPT = 24;

const LIVE_STATES = new Set(["live", "rented", "paused_no_tokens"]);

const EMBED_HANDOFF_POLICY = [
  "## Handoff contact policy (website chat)",
  "When a visitor wants a human (or you decide to hand off), you MUST first collect their",
  "full name, best phone number, and email address so the team can reach them — ask briefly",
  "and naturally, in one message, for whichever of the three you don't have yet. Only call",
  "handoff_to_human once you have them, passing customer: {name, phone, email} in the args.",
  "After the tool succeeds, confirm that a team member will contact them on those details.",
].join("\n");

export async function POST(req: Request) {
  const body = (await req.json()) as {
    key: string;
    message: string;
    sessionId?: string;
  };
  if (!body.key || typeof body.message !== "string" || !body.message.trim()) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: CORS_HEADERS });
  }

  const resolved = resolveEmbedKey(body.key);
  if (!resolved)
    return NextResponse.json({ error: "Invalid key" }, { status: 401, headers: CORS_HEADERS });

  const limited = rateLimit(`embed:${body.key.slice(0, 48)}`, { limit: 30, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterSec: limited.retryAfterSec },
      {
        status: 429,
        headers: { ...CORS_HEADERS, "retry-after": String(limited.retryAfterSec) },
      },
    );
  }

  const { workspaceId, agentId } = resolved;
  const pkg = await getAgentPackage(agentId);
  if (!pkg)
    return NextResponse.json({ error: "Agent missing" }, { status: 404, headers: CORS_HEADERS });

  const rental = await getWorkspaceAgent(workspaceId, agentId);
  if (!rental || !LIVE_STATES.has(rental.state)) {
    return NextResponse.json(
      {
        error: "Agent not published for embed",
        detail: "Rent and go live from Agent Studio before installing the website widget.",
      },
      { status: 403, headers: CORS_HEADERS },
    );
  }

  const knowledgeOverride = await getComposedKnowledge(
    workspaceId,
    agentId,
    rental.knowledge || pkg.knowledge,
  );

  const sessionKey =
    workspaceId + "::" + agentId + "::" + (body.sessionId ?? "anon");
  const history = sessions().get(sessionKey) ?? [];

  const result = await runTurn(
    {
      workspaceId,
      agentId,
      pkg,
      messages: history,
      userMessage: body.message,
      model: rental.model,
      mode: "live",
      knowledgeOverride,
      bindings: rental.bindings,
      state: rental.state,
      systemAppend: EMBED_HANDOFF_POLICY,
    },
    { wallet: createWalletAdapter() },
  );

  const store = sessions();
  if (!store.has(sessionKey) && store.size >= MAX_SESSIONS) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(sessionKey, result.messages.slice(-MAX_TURNS_KEPT));

  if (result.paused) {
    await upsertWorkspaceAgent(workspaceId, agentId, { agentId, state: "paused_no_tokens" });
  }

  await appendAudit({
    workspaceId,
    agentId,
    type: "embed_turn",
    detail: { tokensDebited: result.tokensDebited, paused: result.paused },
  });

  return NextResponse.json(
    {
      reply: result.assistantMessage,
      paused: result.paused,
      balance: result.balance,
    },
    { headers: CORS_HEADERS },
  );
}
