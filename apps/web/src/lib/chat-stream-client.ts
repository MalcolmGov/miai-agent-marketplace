/**
 * Client-side consumer for the chat SSE contract (embed/app/consumer chat routes all speak it).
 * POSTs a message and drives a single `onEvent` callback as events arrive. Browser-only (fetch +
 * streaming reader); no server imports, so it's safe to bundle into any client component.
 */

export type ChatStreamEvent =
  | { type: "delta"; text: string }
  | { type: "tool" }
  | { type: "paused"; reply: string; balance?: number }
  | { type: "done"; reply: string; paused: boolean; balance?: number; correlationId?: string };

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

/** Split an SSE buffer into complete `event:`/`data:` blocks, returning the unparsed remainder. */
function parseSseBlocks(buffer: string): {
  events: Array<{ event: string; data: string }>;
  rest: string;
} {
  const events: Array<{ event: string; data: string }> = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  for (const block of parts) {
    if (!block.trim()) continue;
    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    events.push({ event, data: dataLines.join("\n") });
  }
  return { events, rest };
}

function mapEvent(event: string, data: Record<string, unknown>): ChatStreamEvent | null {
  if (event === "status" && data.phase === "tool") return { type: "tool" };
  if (event === "delta" && typeof data.text === "string") return { type: "delta", text: data.text };
  if (event === "paused" || (event === "done" && data.paused)) {
    return { type: "paused", reply: str(data.reply), balance: num(data.balance) };
  }
  if (event === "done") {
    return {
      type: "done",
      reply: str(data.reply),
      paused: Boolean(data.paused),
      balance: num(data.balance),
      correlationId: str(data.correlationId),
    };
  }
  return null;
}

/**
 * POST to an SSE chat endpoint and invoke `onEvent` for each parsed event. Throws on an `error`
 * SSE event or a non-streaming HTTP error, so callers wrap this in try/catch.
 */
export async function streamChat(
  url: string,
  body: unknown,
  onEvent: (ev: ChatStreamEvent) => void,
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify(body),
  });
  if (!res.body) {
    const j = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null;
    throw new Error(j?.detail || j?.error || `HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const { events, rest } = parseSseBlocks(buf);
    buf = rest;
    for (const ev of events) {
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(ev.data) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (ev.event === "error") throw new Error(str(data.detail) || str(data.error) || "Chat failed");
      const mapped = mapEvent(ev.event, data);
      if (mapped) onEvent(mapped);
    }
  }
}
