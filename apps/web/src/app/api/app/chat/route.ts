import { NextResponse } from "next/server";
import { chunkReplyForStream, runChannelTurn } from "@/lib/channel-turn";
import { embedCorsHeaders } from "@/lib/embed-cors";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

/** In-app channel chat. Same embed key + publish gate as website widget.
 *  Default response is SSE (delta stream). Pass Accept: application/json for one-shot. */

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
  };

  const limited = rateLimit(`app:${(body.key || "").slice(0, 48)}`, {
    limit: 30,
    windowMs: 60_000,
  });

  const result = await runChannelTurn({
    channel: "app",
    key: body.key,
    message: typeof body.message === "string" ? body.message : "",
    sessionId: body.sessionId,
    replyLanguage: body.replyLanguage,
    rateLimitOk: limited.ok,
    rateLimitRetryAfterSec: limited.ok ? undefined : limited.retryAfterSec,
  });

  const wantJson =
    (req.headers.get("accept") || "").includes("application/json") &&
    !(req.headers.get("accept") || "").includes("text/event-stream");

  if (!result.ok) {
    const headers: Record<string, string> = { ...cors };
    if (result.retryAfterSec != null) headers["retry-after"] = String(result.retryAfterSec);
    if (wantJson) {
      return NextResponse.json(
        { error: result.error, detail: result.detail, retryAfterSec: result.retryAfterSec },
        { status: result.status, headers },
      );
    }
    const stream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder();
        controller.enqueue(
          enc.encode(
            sseLine("error", {
              error: result.error,
              detail: result.detail,
              status: result.status,
            }),
          ),
        );
        controller.close();
      },
    });
    return new Response(stream, {
      status: result.status >= 400 ? result.status : 200,
      headers: {
        ...headers,
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  }

  if (wantJson) {
    return NextResponse.json(
      {
        reply: result.assistantMessage,
        paused: result.paused,
        balance: result.balance,
        channel: "app",
      },
      { headers: cors },
    );
  }

  const chunks = chunkReplyForStream(result.assistantMessage);
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(
        enc.encode(
          sseLine("meta", {
            channel: "app",
            paused: result.paused,
            balance: result.balance,
          }),
        ),
      );
      if (result.paused) {
        controller.enqueue(
          enc.encode(
            sseLine("paused", {
              reply: result.assistantMessage,
              balance: result.balance,
            }),
          ),
        );
        controller.enqueue(
          enc.encode(
            sseLine("done", {
              reply: result.assistantMessage,
              paused: true,
              balance: result.balance,
            }),
          ),
        );
        controller.close();
        return;
      }
      for (const delta of chunks) {
        controller.enqueue(enc.encode(sseLine("delta", { text: delta })));
        await new Promise((r) => setTimeout(r, 18));
      }
      controller.enqueue(
        enc.encode(
          sseLine("done", {
            reply: result.assistantMessage,
            paused: false,
            balance: result.balance,
          }),
        ),
      );
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
