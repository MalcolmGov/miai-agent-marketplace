import { NextResponse } from "next/server";
import {
  CONNECTORS,
  getClientCredentials,
  isOAuthConfigured,
  isOAuthConnector,
  listConnected,
  listOAuthProviders,
  resolveProvider,
} from "@miai/connectors";
import { WORKSPACE_ID } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const workspaceId = new URL(req.url).searchParams.get("workspaceId") ?? WORKSPACE_ID;
  const connected = await listConnected(workspaceId);

  const oauth = listOAuthProviders().map((p) => {
    const provider = resolveProvider(p.id);
    const creds = getClientCredentials(provider);
    return {
      id: p.id,
      name: p.name,
      configured: isOAuthConfigured(provider),
      connected: connected.includes(p.id),
      requiresShop: Boolean(p.requiresShop),
      requiresSubdomain: Boolean(p.requiresSubdomain),
      missingEnv: creds.clientId && creds.clientSecret ? [] : [p.clientIdEnv, p.clientSecretEnv],
    };
  });

  const apiKey = CONNECTORS.filter((c) => c.auth === "api_key" || c.auth === "webhook_secret" || c.auth === "mcp").map(
    (c) => ({
      id: c.id,
      name: c.name,
      auth: c.auth,
      connected: connected.includes(c.id),
    }),
  );

  return NextResponse.json({
    workspaceId,
    connected,
    oauth,
    other: apiKey,
    oauthConnectors: CONNECTORS.filter((c) => isOAuthConnector(c.id)).map((c) => c.id),
  });
}
