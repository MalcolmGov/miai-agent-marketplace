import { buildAuthorizeUrl, type OAuthConnectorId } from "@miai/connectors";
import { DEFAULT_CONSUMER_AGENT } from "@/lib/consumer";
import { requireConsumer } from "@/lib/consumer-auth";
import { isConsumerConnector } from "@/lib/consumer-connectors";
import { rateLimit } from "@/lib/security";
import { apiErrorFromRequest, apiOk } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** Begin an OAuth connect for the signed-in consumer. The token is stored under the consumer's
 *  own account id (not a tenant workspace), so their agent's tools run against their inbox and
 *  calendar. Reuses the shared /api/oauth/callback — the state carries workspaceId=consumerId. */
export async function GET(req: Request, ctx: { params: Promise<{ connector: string }> }) {
  const c = await requireConsumer(req);
  if (c instanceof Response) return c;
  const consumerId = c.consumerId;

  const { connector } = await ctx.params;
  if (!isConsumerConnector(connector)) {
    return apiErrorFromRequest(req, 400, "Not a connector available on the consumer line");
  }

  const limited = await rateLimit(`consumer-oauth-start:${consumerId}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return apiErrorFromRequest(req, 429, "Too many OAuth starts — retry shortly", undefined, {
      "retry-after": String(limited.retryAfterSec),
    });
  }

  const url = new URL(req.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/me/connectors";
  const result = buildAuthorizeUrl(connector as OAuthConnectorId, {
    workspaceId: consumerId,
    agentId: DEFAULT_CONSUMER_AGENT,
    returnTo,
    emailProvider: "google",
  });

  if (!result.configured) {
    return apiErrorFromRequest(req, 503, "OAuth app credentials missing", {
      missingEnv: result.missingEnv,
      hint: "Set the Google OAuth client id/secret for this environment.",
    });
  }

  if (url.searchParams.get("format") === "json") {
    return apiOk({ url: result.url });
  }
  return Response.redirect(result.url);
}
