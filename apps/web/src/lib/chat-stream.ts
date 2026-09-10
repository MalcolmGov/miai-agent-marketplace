import type { SseSend } from "@/lib/sse";

/** The common shape both channel and consumer turn runners resolve to, as far as the SSE
 *  event choreography cares. */
export type StreamableTurnResult =
  | {
      ok: true;
      assistantMessage: string;
      paused: boolean;
      balance: number;
      correlationId: string;
    }
  | { ok: false; error: string; detail?: string; status: number };

/**
 * Drive the standard chat SSE event choreography from a streaming turn runner:
 *   meta → (delta | status)* → done | paused+done | error
 * Shared by the app and consumer chat routes so the event contract stays identical and lives in
 * one place. The caller supplies only the runner (which turn to run) and any extra meta fields.
 */
export async function streamChatTurn(
  send: SseSend,
  meta: Record<string, unknown>,
  runStream: (hooks: {
    onDelta: (text: string) => void;
    onToolStart: () => void;
  }) => Promise<StreamableTurnResult>,
): Promise<void> {
  send("meta", { ...meta, streaming: true });
  try {
    const result = await runStream({
      onDelta: (text) => send("delta", { text }),
      onToolStart: () => send("status", { phase: "tool" }),
    });

    if (!result.ok) {
      send("error", { error: result.error, detail: result.detail, status: result.status });
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
    // Log the raw error server-side, but send a GENERIC frame — the raw message can carry internal
    // host/IP/DSN/credential-shaped detail (e.g. "connect ECONNREFUSED 46.x:6379", a pg auth error)
    // straight into the user's chat banner. Matches the sanitized JSON path (api/consumer/chat).
    console.error(
      JSON.stringify({
        level: "error",
        event: "miai.chat_stream_failed",
        message: err instanceof Error ? err.message : String(err),
      }),
    );
    send("error", { error: "Chat failed", status: 500 });
  }
}
