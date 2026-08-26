import { NextResponse } from "next/server";
import { requireConsumer } from "@/lib/consumer-auth";
import { mintSetupNonce } from "@/lib/consumer-telegram";
import { isConsumerLinked } from "@/lib/consumer-telegram-store";

export const dynamic = "force-dynamic";

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME;
// A connectable channel needs the bot token (Bot API) + the webhook secret (nonce signing).
const BOT_CONFIGURED = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_SECRET);
const enabled = () => BOT_CONFIGURED && Boolean(BOT_USERNAME);

/**
 * Consumer Telegram connect.
 *
 * GET  → availability + this consumer's link status: `{ enabled, botUsername, connected }`.
 *        No secrets; the UI uses it to show "Connect Telegram" vs a "Connected · Disconnect"
 *        state. `connected` is best-effort (false when no consumer can be resolved).
 * POST → mint a short-TTL, single-use setup nonce for the signed-in consumer and return
 *        the deep link `https://t.me/<bot>?start=setup_<nonce>`. Opening it binds that
 *        Telegram chat to this consumer, so Telegram shares the web memory / wallet.
 *        The nonce carries `<tenant>::<consumer>` so the webhook binds the exact identity.
 */
export async function GET(req: Request) {
  let connected = false;
  if (enabled()) {
    const resolved = await requireConsumer(req);
    if (!(resolved instanceof Response)) {
      connected = await isConsumerLinked(resolved.auth.workspaceId, resolved.consumerId);
    }
  }
  return NextResponse.json({ enabled: enabled(), botUsername: BOT_USERNAME ?? null, connected });
}

export async function POST(req: Request) {
  if (!enabled()) {
    return NextResponse.json({ enabled: false }, { status: 503 });
  }
  const resolved = await requireConsumer(req);
  if (resolved instanceof Response) return resolved; // 401 in oidc mode when signed out
  const { consumerId, auth } = resolved;
  const nonce = mintSetupNonce(`${auth.workspaceId}::${consumerId}`);
  return NextResponse.json({
    enabled: true,
    botUsername: BOT_USERNAME,
    url: `https://t.me/${BOT_USERNAME}?start=setup_${nonce}`,
  });
}
