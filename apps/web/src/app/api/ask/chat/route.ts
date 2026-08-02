import { runAskTurn } from "@/lib/ask-turn";
import { apiErrorFromRequest, apiOk } from "@/lib/api-error";
import { askChatBodySchema, formatZodError } from "@/lib/api-schemas";
import { rateLimit } from "@/lib/security";
import { correlationFromRequest } from "@/lib/traceability";

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return apiErrorFromRequest(req, 400, "Invalid JSON body");
  }

  const parsed = askChatBodySchema.safeParse(raw);
  if (!parsed.success) {
    return apiErrorFromRequest(req, 400, "Invalid request body", formatZodError(parsed.error));
  }
  const body = parsed.data;

  const sessionId = body.sessionId ?? "anon";
  const correlationId = correlationFromRequest(req, body.correlationId);
  const limited = await rateLimit(`ask:${sessionId.slice(0, 48)}`, {
    limit: 40,
    windowMs: 60_000,
  });

  const result = await runAskTurn({
    message: body.message.trim(),
    sessionId,
    replyLanguage: body.replyLanguage,
    correlationId,
    rateLimitOk: limited.ok,
    rateLimitRetryAfterSec: limited.ok ? undefined : limited.retryAfterSec,
  });

  if (!result.ok) {
    const headers: Record<string, string> = {};
    if (result.retryAfterSec != null) headers["retry-after"] = String(result.retryAfterSec);
    return apiErrorFromRequest(req, result.status, result.error, { retryAfterSec: result.retryAfterSec }, headers);
  }

  return apiOk({
    reply: result.reply,
    paused: result.paused,
    balance: result.balance,
    leadIds: result.leadIds,
    correlationId: result.correlationId,
  });
}
