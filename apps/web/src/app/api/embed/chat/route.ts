import { NextResponse } from "next/server";
import { runChannelTurn } from "@/lib/channel-turn";
import { embedCorsHeaders } from "@/lib/embed-cors";
import { rateLimit } from "@/lib/security";

/** The widget runs on customers' websites, so this endpoint must answer cross-origin.
 *  The embed key identifies (and is scoped to) the tenant agent; it is public by design.
 *  Origins are gated by EMBED_ALLOWED_ORIGINS (* = allow all, default for staging). */

export function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: embedCorsHeaders(req) });
}

export async function POST(req: Request) {
  const cors = embedCorsHeaders(req);
  const body = (await req.json()) as {
    key: string;
    message: string;
    sessionId?: string;
    replyLanguage?: string;
  };

  const limited = rateLimit(`embed:${(body.key || "").slice(0, 48)}`, {
    limit: 30,
    windowMs: 60_000,
  });

  const result = await runChannelTurn({
    channel: "embed",
    key: body.key,
    message: typeof body.message === "string" ? body.message : "",
    sessionId: body.sessionId,
    replyLanguage: body.replyLanguage,
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
    },
    { headers: cors },
  );
}
