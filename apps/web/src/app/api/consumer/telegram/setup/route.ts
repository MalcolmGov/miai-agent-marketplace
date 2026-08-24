import { requireConsumer } from "@/lib/consumer-auth";
import { apiOk } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME;

/**
 * GET /api/consumer/telegram/setup
 *
 * Returns the Telegram connection details for the signed-in consumer: the bot username and a
 * one-tap deep link that binds their Telegram chat to this consumer account.
 *
 * The deep link is `https://t.me/<bot>?start=setup_<consumerId>`. When the consumer taps it,
 * Telegram opens the bot and sends `/start setup_<consumerId>`; the webhook binds their chat_id
 * to this account so Telegram reaches the same wallet + memory as the web app.
 */
export async function GET(req: Request) {
  const c = await requireConsumer(req);
  if (c instanceof Response) return c;

  if (!BOT_USERNAME) {
    return apiOk({ configured: false, reason: "Telegram bot not configured on this deployment." });
  }

  const deepLink = `https://t.me/${BOT_USERNAME}?start=setup_${encodeURIComponent(c.consumerId)}`;

  return apiOk({
    configured: true,
    botUsername: BOT_USERNAME,
    deepLink,
  });
}
