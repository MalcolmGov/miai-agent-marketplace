import { NextResponse } from "next/server";
import { runChannelTurn, runChannelTurnStream } from "@/lib/channel-turn";
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
  const body = (await req.json()) as {
    key: string;
    message: string;
    sessionId?: string;
    replyLanguage?: string;
    correlationId?: string;
  };

  const correlationId = correlationFromRequest(req, body.correlationId);
  const limited = rateLimit(`app:${(body.key || "").slice(0, 48)}`, {
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
      message: typeof body.message === "string" ? body.message : "",
      sessionId: body.sessionId,
      replyLanguage: body.replyLanguage,
      correlationId,
      rateLimitOk: limited.ok,
      rateLimitRetryAfterSec: limited.ok ? undefined : limited.retryAfterSec,
    });
    if (!result.ok) {
      const headers: Record<string, string> = { ...cors };
      if (result.retryAfterSec != null) headers["retry-after"] = String(result.retryAfterSec);
      return NextResponse.json(
        { error: result.error, detail: result.detail, retryAfterSec: result.retryAfterSec },
        { status: result.status, headers },
      );
    }
    return NextResponse.json(
      {
        reply: result.assistantMessage,
        paused: result.paused,
        balance: result.balance,
        channel: "app",
        correlationId: result.correlationId,
      },
      { headers: cors },
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
          message: typeof body.message === "string" ? body.message : "",
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
