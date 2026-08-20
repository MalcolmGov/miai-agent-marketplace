import { NextResponse } from "next/server";
import { runChannelTurn } from "@/lib/channel-turn";
import { apiErrorFromRequest, apiOk } from "@/lib/api-error";
import { channelChatBodySchema, formatZodError } from "@/lib/api-schemas";
import { embedCorsHeaders } from "@/lib/embed-cors";
import { rateLimit } from "@/lib/security";
import { correlationFromRequest } from "@/lib/traceability";

export function handleEmbedChatOptions(req: Request): NextResponse {
  return new NextResponse(null, { status: 204, headers: embedCorsHeaders(req) });
}

export async function handleEmbedChatPost(req: Request): Promise<NextResponse> {
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
  const limited = await rateLimit(`embed:${body.key.slice(0, 48)}`, {
    limit: 30,
    windowMs: 60_000,
  });

  const result = await runChannelTurn({
    channel: "embed",
    key: body.key,
    message: body.message.trim(),
    sessionId: body.sessionId,
    replyLanguage: body.replyLanguage,
    correlationId,
    origin: req.headers.get("origin") ?? undefined,
    referer: req.headers.get("referer") ?? undefined,
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
      correlationId: result.correlationId,
    },
    200,
    cors,
  );
}
