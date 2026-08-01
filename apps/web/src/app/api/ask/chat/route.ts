import { NextResponse } from "next/server";
import { runAskTurn } from "@/lib/ask-turn";
import { rateLimit } from "@/lib/security";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    message?: string;
    sessionId?: string;
    replyLanguage?: string;
  };

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "anon";
  const limited = rateLimit(`ask:${sessionId.slice(0, 48)}`, {
    limit: 40,
    windowMs: 60_000,
  });

  const result = await runAskTurn({
    message: typeof body.message === "string" ? body.message : "",
    sessionId,
    replyLanguage: body.replyLanguage,
    rateLimitOk: limited.ok,
    rateLimitRetryAfterSec: limited.ok ? undefined : limited.retryAfterSec,
  });

  if (!result.ok) {
    const headers: Record<string, string> = {};
    if (result.retryAfterSec != null) headers["retry-after"] = String(result.retryAfterSec);
    return NextResponse.json(
      { error: result.error, retryAfterSec: result.retryAfterSec },
      { status: result.status, headers },
    );
  }

  return NextResponse.json({
    reply: result.reply,
    paused: result.paused,
    balance: result.balance,
    leadIds: result.leadIds,
  });
}
