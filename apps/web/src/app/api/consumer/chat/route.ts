import { runConsumerTurn, runConsumerTurnStream } from "@/lib/consumer-turn";
import { DEFAULT_CONSUMER_AGENT } from "@/lib/consumer";
import { requireConsumer } from "@/lib/consumer-auth";
import { apiError, apiErrorFromRequest, apiOk } from "@/lib/api-error";
import { consumerChatBodySchema, formatZodError } from "@/lib/api-schemas";
import { rateLimit } from "@/lib/security";
import { sseStreamResponse } from "@/lib/sse";
import { streamChatTurn } from "@/lib/chat-stream";
import { correlationFromRequest } from "@/lib/traceability";

export const dynamic = "force-dynamic";

/** Consumer chat — an authenticated individual talking to their personal agent, metered onto
 *  their own prepaid wallet. First-party only (no embed key, no CORS). Default response is SSE
 *  with live model token deltas; pass Accept: application/json for a one-shot reply. */

export async function POST(req: Request) {
  const c = await requireConsumer(req);
  if (c instanceof Response) return c;
  const walletId = c.consumerId;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return apiErrorFromRequest(req, 400, "Invalid JSON body");
  }

  const parsed = consumerChatBodySchema.safeParse(raw);
  if (!parsed.success) {
    return apiErrorFromRequest(req, 400, "Invalid request body", formatZodError(parsed.error));
  }
  const body = parsed.data;
  const agentId = body.agentId ?? DEFAULT_CONSUMER_AGENT;
  const correlationId = correlationFromRequest(req, body.correlationId);
  const limited = await rateLimit(`consumer:${walletId}:${agentId}`, {
    limit: 30,
    windowMs: 60_000,
  });

  const accept = req.headers.get("accept") || "";
  const wantJson = accept.includes("application/json") && !accept.includes("text/event-stream");

  const turnInput = {
    tenantId: c.auth.workspaceId,
    consumerId: c.consumerId,
    walletId,
    agentId,
    message: body.message.trim(),
    sessionId: body.sessionId,
    replyLanguage: body.replyLanguage,
    correlationId,
    rateLimitOk: limited.ok,
    rateLimitRetryAfterSec: limited.ok ? undefined : limited.retryAfterSec,
  };

  if (wantJson) {
    let result;
    try {
      result = await runConsumerTurn(turnInput);
    } catch (err) {
      // A store/persistence outage (session store, memory, audit recorder) can throw here. The SSE
      // path catches this in streamChatTurn and degrades to an in-stream error frame; mirror that on
      // the JSON path so a dependency blip returns a structured, traceable 500 (with correlationId)
      // instead of a raw unhandled Next.js crash with no body.
      console.error(
        JSON.stringify({
          level: "error",
          event: "miai.consumer_turn_failed",
          correlationId,
          agentId,
          message: err instanceof Error ? err.message : String(err),
        }),
      );
      return apiError(500, "Chat failed", { correlationId });
    }
    if (!result.ok) {
      const headers: Record<string, string> = {};
      if (result.retryAfterSec != null) headers["retry-after"] = String(result.retryAfterSec);
      return apiErrorFromRequest(
        req,
        result.status,
        result.error,
        { detail: result.detail, retryAfterSec: result.retryAfterSec },
        headers,
      );
    }
    return apiOk({
      reply: result.assistantMessage,
      paused: result.paused,
      balance: result.balance,
      agentId: result.agentId,
      correlationId: result.correlationId,
    });
  }

  return sseStreamResponse((send) =>
    streamChatTurn(send, { channel: "consumer", agentId }, (hooks) =>
      runConsumerTurnStream({ ...turnInput, ...hooks }),
    ),
  );
}
