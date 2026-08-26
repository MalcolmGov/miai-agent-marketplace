import { NextResponse } from "next/server";
import { requireConsumer } from "@/lib/consumer-auth";
import { unbindTelegramForConsumer } from "@/lib/consumer-telegram-store";

export const dynamic = "force-dynamic";

/**
 * Consumer Telegram disconnect.
 *
 * POST → unlink every Telegram chat bound to this consumer; each reverts to a standalone
 *        telegram:<chat_id> identity (its active-agent choice is kept). Returns
 *        `{ ok, removed }` where `removed` is how many chats were unlinked (0 if none).
 *        Same-origin, consumer-authenticated (the person can only disconnect their own chats).
 */
export async function POST(req: Request) {
  const resolved = await requireConsumer(req);
  if (resolved instanceof Response) return resolved; // 401 in oidc mode when signed out
  const { consumerId, auth } = resolved;
  const removed = await unbindTelegramForConsumer(auth.workspaceId, consumerId);
  return NextResponse.json({ ok: true, removed });
}
