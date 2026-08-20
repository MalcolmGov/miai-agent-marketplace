export type SseSend = (event: string, data: unknown) => void;

export function sseLine(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Wrap an async producer as a Server-Sent-Events response. The producer is handed a
 * `send(event, data)` and the stream controller is always closed when it settles or throws.
 * Shared by every SSE chat surface (embed/app/consumer) so the streaming + header boilerplate
 * lives in exactly one place.
 */
export function sseStreamResponse(
  run: (send: SseSend) => Promise<void> | void,
  extraHeaders?: Record<string, string>,
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send: SseSend = (event, data) => {
        controller.enqueue(enc.encode(sseLine(event, data)));
      };
      try {
        await run(send);
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      ...(extraHeaders ?? {}),
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
