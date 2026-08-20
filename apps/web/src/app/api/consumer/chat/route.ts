import { resolveAuth, AuthError } from "@/lib/auth";
import { runConsumerTurn, runConsumerTurnStream } from "@/lib/consumer-turn";
import { walletIdForConsumer, DEFAULT_CONSUMER_AGENT } from "@/lib/consumer";
import { apiErrorFromRequest, apiOk } from "@/lib/api-error";
import { consumerChatBodySchema, formatZodError } from "@/lib/api-schemas";
import { rateLimit } from "@/lib/security";
import { correlationFromRequest } from "@/lib/traceability";

export const dynamic = "force-dynamic";

/** Consumer chat — an authenticated individual talking to their personal agent, metered onto
 *  their own prepaid wallet. First-party only (no embed key, no CORS). Default response is SSE
 *  with live model token deltas; pass Accept: application/json for a one-shot reply. */

function sseLine(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  let auth;
  try {
    auth = await resolveAuth(req);
  } catch (e) {
    if (e instanceof AuthError) return apiErrorFromRequest(req, e.status, e.message);
    throw e;
  }
  const walletId = walletIdForConsumer(auth);

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
    consumerId: auth.userId,
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
    const result = await runConsumerTurn(turnInput);
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

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(enc.encode(sseLine(event, data)));
      };

      send("meta", { channel: "consumer", agentId, streaming: true });

      try {
        const result = await runConsumerTurnStream({
          ...turnInput,
          onDelta: (text) => send("delta", { text }),
          onToolStart: () => send("status", { phase: "tool" }),
        });

        if (!result.ok) {
          send("error", { error: result.error, detail: result.detail, status: result.status });
          controller.close();
          return;
        }

        if (result.paused) {
          send("paused", { reply: result.assistantMessage, balance: result.balance });
        }
        send("done", {
          reply: result.assistantMessage,
          paused: result.paused,
          balance: result.balance,
          correlationId: result.correlationId,
        });
      } catch (err) {
        send("error", {
          error: "Chat failed",
          detail: err instanceof Error ? err.message : "Unknown error",
          status: 500,
        });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
