import { NextResponse } from "next/server";
import { runChannelTurn, runChannelTurnStream } from "@/lib/channel-turn";
import { apiErrorFromRequest, apiOk } from "@/lib/api-error";
import { channelChatBodySchema, formatZodError } from "@/lib/api-schemas";
import { embedCorsHeaders } from "@/lib/embed-cors";
import { rateLimit } from "@/lib/security";
import { correlationFromRequest } from "@/lib/traceability";

export const dynamic = "force-dynamic";

/** In-app channel chat. Same embed key + publish gate as website widget.
 *  Default response is SSE with live model token deltas. Pass Accept: application/json for one-shot. */

export function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: embedCorsHeaders(req) });
}

function sseLine(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  const cors = embedCorsHeaders(req);
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return apiErrorFromRequest(req, 400, "Invalid JSON body", undefined, cors);
  }

  const parsed = channelChatBodySchema.safeParse(raw);
  if (!parsed.success) {
    return apiErrorFromRequest(req, 400, "Invalid request body", formatZodError(parsed.error), cors);
  }
  const body = parsed.data;

  const correlationId = correlationFromRequest(req, body.correlationId);
  const limited = await rateLimit(`app:${body.key.slice(0, 48)}`, {
    limit: 30,
    windowMs: 60_000,
  });

  const wantJson =
    (req.headers.get("accept") || "").includes("application/json") &&
    !(req.headers.get("accept") || "").includes("text/event-stream");

  if (wantJson) {
    const result = await runChannelTurn({
      channel: "app",
      key: body.key,
      message: body.message.trim(),
      sessionId: body.sessionId,
      replyLanguage: body.replyLanguage,
      correlationId,
      rateLimitOk: limited.ok,
      rateLimitRetryAfterSec: limited.ok ? undefined : limited.retryAfterSec,
    });
    if (!result.ok) {
      const headers: Record<string, string> = { ...cors };
      if (result.retryAfterSec != null) headers["retry-after"] = String(result.retryAfterSec);
      return apiErrorFromRequest(
        req,
        result.status,
        result.error,
        { detail: result.detail, retryAfterSec: result.retryAfterSec },
        headers,
      );
    }
    return apiOk(
      {
        reply: result.assistantMessage,
        paused: result.paused,
        balance: result.balance,
        channel: "app",
        correlationId: result.correlationId,
      },
      200,
      cors,
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(enc.encode(sseLine(event, data)));
      };

      send("meta", { channel: "app", streaming: true });

      try {
        const result = await runChannelTurnStream({
          channel: "app",
          key: body.key,
          message: body.message.trim(),
          sessionId: body.sessionId,
          replyLanguage: body.replyLanguage,
          correlationId,
          rateLimitOk: limited.ok,
          rateLimitRetryAfterSec: limited.ok ? undefined : limited.retryAfterSec,
          onDelta: (text) => send("delta", { text }),
          onToolStart: () => send("status", { phase: "tool" }),
        });

        if (!result.ok) {
          send("error", {
            error: result.error,
            detail: result.detail,
            status: result.status,
          });
          controller.close();
          return;
        }

        if (result.paused) {
          send("paused", {
            reply: result.assistantMessage,
            balance: result.balance,
          });
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
      ...cors,
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
