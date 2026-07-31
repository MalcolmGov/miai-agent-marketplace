import { NextResponse } from "next/server";
import {
  CONNECTORS,
  connectorOAuthConfigured,
  isOAuthConnector,
  listConnected,
  listOAuthProviders,
  oauthCallbackUrl,
  type OAuthConnectorId,
} from "@miai/connectors";
import { isAuthContext, requireAuth } from "@/lib/request-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;

  const workspaceId =
    auth.mode === "oidc"
      ? auth.workspaceId
      : (new URL(req.url).searchParams.get("workspaceId") ?? auth.workspaceId);
  const connected = await listConnected(workspaceId);

  const oauth = listOAuthProviders().map((p) => {
    const cfg = connectorOAuthConfigured(p.id as OAuthConnectorId);
    return {
      id: p.id,
      name: p.name,
      configured: cfg.configured,
      connected: connected.includes(p.id),
      requiresShop: Boolean(p.requiresShop),
      requiresSubdomain: Boolean(p.requiresSubdomain),
      missingEnv: cfg.missingEnv,
      clientIdEnv: p.clientIdEnv,
      clientSecretEnv: p.clientSecretEnv,
    };
  });

  const apiKey = CONNECTORS.filter(
    (c) => c.auth === "api_key" || c.auth === "webhook_secret" || c.auth === "mcp",
  ).map((c) => ({
    id: c.id,
    name: c.name,
    auth: c.auth,
    connected: connected.includes(c.id),
  }));

  return NextResponse.json({
    workspaceId,
    callbackUrl: oauthCallbackUrl(),
    connected,
    oauth,
    other: apiKey,
    oauthConnectors: CONNECTORS.filter((c) => isOAuthConnector(c.id)).map((c) => c.id),
  });
}
