import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  getClientCredentials,
  isOAuthConfigured,
  resolveProvider,
  type OAuthConnectorId,
  type OAuthStartContext,
} from "./providers.js";
import { saveToken, type StoredToken } from "./tokens.js";

export interface OAuthStatePayload {
  workspaceId: string;
  agentId: string;
  connectorId: OAuthConnectorId;
  returnTo?: string;
  shop?: string;
  subdomain?: string;
  emailProvider?: "google" | "microsoft";
  codeVerifier?: string;
  nonce: string;
  exp: number;
}

function env(name: string): string | undefined {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

function stateSecret(): string {
  const s =
    env("OAUTH_STATE_SECRET") ||
    env("OAUTH_TOKEN_SECRET") ||
    "dev-only-change-me";
  if (
    env("NODE_ENV") === "production" &&
    (s === "dev-only-change-me" || s === "replace-with-long-random-string" || s.length < 16)
  ) {
    throw new Error("OAUTH_STATE_SECRET / OAUTH_TOKEN_SECRET missing or weak in production");
  }
  return s;
}

export function publicAppBase(): string {
  return (env("APP_BASE_URL") ?? env("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export function oauthCallbackUrl(): string {
  return `${publicAppBase()}/api/oauth/callback`;
}

function b64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function createPkce(): { verifier: string; challenge: string } {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

/**
 * Self-contained signed state — survives multi-instance / cold starts on Railway.
 * Format: base64url(json).base64url(hmac)
 */
export function createState(payload: Omit<OAuthStatePayload, "nonce" | "exp">): string {
  const body: OAuthStatePayload = {
    ...payload,
    nonce: b64url(randomBytes(12)),
    exp: Date.now() + 15 * 60 * 1000,
  };
  const data = b64url(JSON.stringify(body));
  const mac = createHmac("sha256", stateSecret()).update(data).digest();
  return `${data}.${b64url(mac)}`;
}

export function consumeState(state: string): OAuthStatePayload | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [data, macB64] = parts;
  const expected = createHmac("sha256", stateSecret()).update(data).digest();
  let mac: Buffer;
  try {
    mac = fromB64url(macB64);
  } catch {
    return null;
  }
  if (mac.length !== expected.length || !timingSafeEqual(mac, expected)) return null;

  try {
    const row = JSON.parse(fromB64url(data).toString("utf8")) as OAuthStatePayload;
    if (!row?.connectorId || !row.workspaceId || !row.agentId) return null;
    if (typeof row.exp !== "number" || row.exp < Date.now()) return null;
    return row;
  } catch {
    return null;
  }
}

export interface AuthorizeStartResult {
  url: string;
  state: string;
  configured: boolean;
  missingEnv?: string[];
  callbackUrl?: string;
}

export function buildAuthorizeUrl(
  connectorId: OAuthConnectorId,
  opts: {
    workspaceId: string;
    agentId: string;
    returnTo?: string;
    shop?: string;
    subdomain?: string;
    emailProvider?: "google" | "microsoft";
  },
): AuthorizeStartResult {
  const ctx: OAuthStartContext = {
    shop: opts.shop,
    subdomain: opts.subdomain,
    emailProvider: opts.emailProvider ?? "google",
  };
  const provider = resolveProvider(connectorId, ctx);
  const { clientId, clientSecret } = getClientCredentials(provider);
  const callbackUrl = oauthCallbackUrl();
  if (!clientId || !clientSecret) {
    return {
      url: "",
      state: "",
      configured: false,
      missingEnv: [provider.clientIdEnv, provider.clientSecretEnv],
      callbackUrl,
    };
  }

  let codeVerifier: string | undefined;
  let codeChallenge: string | undefined;
  if (provider.pkce) {
    const pkce = createPkce();
    codeVerifier = pkce.verifier;
    codeChallenge = pkce.challenge;
  }

  const state = createState({
    workspaceId: opts.workspaceId,
    agentId: opts.agentId,
    connectorId,
    returnTo: opts.returnTo,
    shop: ctx.shop,
    subdomain: ctx.subdomain,
    emailProvider: ctx.emailProvider,
    codeVerifier,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    state,
    scope: provider.scopes.join(" "),
  });

  if (provider.pkce && codeChallenge) {
    params.set("code_challenge", codeChallenge);
    params.set("code_challenge_method", "S256");
  }
  for (const [k, v] of Object.entries(provider.extraAuthParams ?? {})) {
    params.set(k, v);
  }

  // Slack + Shopify expect comma-separated scopes
  if (connectorId === "slack" || connectorId === "shopify") {
    params.set("scope", provider.scopes.join(","));
  }

  // HubSpot uses space-separated scopes (default) — keep as-is

  const url = `${provider.authorizeUrl(ctx)}?${params.toString()}`;
  return { url, state, configured: true, callbackUrl };
}

export async function exchangeCode(opts: {
  connectorId: OAuthConnectorId;
  code: string;
  statePayload: OAuthStatePayload;
}): Promise<StoredToken> {
  const ctx: OAuthStartContext = {
    shop: opts.statePayload.shop,
    subdomain: opts.statePayload.subdomain,
    emailProvider: opts.statePayload.emailProvider ?? "google",
  };
  const provider = resolveProvider(opts.connectorId, ctx);
  const { clientId, clientSecret } = getClientCredentials(provider);
  if (!isOAuthConfigured(provider)) throw new Error("OAuth app not configured");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: oauthCallbackUrl(),
  });

  if (provider.authStyle === "body") {
    body.set("client_id", clientId);
    body.set("client_secret", clientSecret);
  }
  if (opts.statePayload.codeVerifier) {
    body.set("code_verifier", opts.statePayload.codeVerifier);
  }

  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
    accept: "application/json",
  };
  if (provider.authStyle === "basic") {
    headers.authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  }

  const res = await fetch(provider.tokenUrl(ctx), {
    method: "POST",
    headers,
    body,
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      `Token exchange failed (${res.status}): ${JSON.stringify(json).slice(0, 400)}`,
    );
  }

  // Slack wraps tokens differently
  let accessToken = String(json.access_token ?? "");
  let refreshToken = json.refresh_token ? String(json.refresh_token) : undefined;
  let scope = json.scope ? String(json.scope) : provider.scopes.join(" ");
  const meta: Record<string, string> = {};

  if (opts.connectorId === "slack") {
    const authed = json.authed_user as { access_token?: string } | undefined;
    accessToken = String(
      (json.access_token as string | undefined) ?? authed?.access_token ?? "",
    );
    if (json.team && typeof json.team === "object") {
      meta.team_id = String((json.team as { id?: string }).id ?? "");
      meta.team_name = String((json.team as { name?: string }).name ?? "");
    }
    meta.bot_user_id = String(json.bot_user_id ?? "");
    meta.incoming_webhook_channel =
      (json.incoming_webhook as { channel?: string } | undefined)?.channel ?? "";
  }

  if (opts.statePayload.shop) meta.shop = normalizeShopMeta(opts.statePayload.shop);
  if (opts.statePayload.subdomain) meta.subdomain = opts.statePayload.subdomain;
  if (opts.statePayload.emailProvider) meta.emailProvider = opts.statePayload.emailProvider;
  if (json.realmId) meta.realmId = String(json.realmId);
  if (json.tenant_id) meta.tenantId = String(json.tenant_id);

  if (!accessToken) throw new Error("No access_token in provider response");

  const expiresIn = Number(json.expires_in ?? 0);
  const token: StoredToken = {
    connectorId: opts.connectorId,
    workspaceId: opts.statePayload.workspaceId,
    accessToken,
    refreshToken,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
    tokenType: String(json.token_type ?? "Bearer"),
    scope,
    meta,
    updatedAt: new Date().toISOString(),
  };

  // Xero needs a second call for tenant connections
  if (opts.connectorId === "xero") {
    const connRes = await fetch("https://api.xero.com/connections", {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (connRes.ok) {
      const conns = (await connRes.json()) as Array<{ tenantId?: string; tenantName?: string }>;
      if (conns[0]?.tenantId) {
        token.meta.tenantId = conns[0].tenantId;
        token.meta.tenantName = conns[0].tenantName ?? "";
      }
    }
  }

  await saveToken(token);
  return token;
}

function normalizeShopMeta(shop: string): string {
  let s = shop.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!s.includes(".")) s = `${s}.myshopify.com`;
  return s;
}

export async function refreshAccessToken(token: StoredToken): Promise<StoredToken> {
  if (!token.refreshToken) return token;
  const ctx: OAuthStartContext = {
    shop: token.meta.shop,
    subdomain: token.meta.subdomain,
    emailProvider: (token.meta.emailProvider as "google" | "microsoft") ?? "google",
  };
  const provider = resolveProvider(token.connectorId as OAuthConnectorId, ctx);
  const { clientId, clientSecret } = getClientCredentials(provider);

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: token.refreshToken,
  });
  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
    accept: "application/json",
  };
  if (provider.authStyle === "basic") {
    headers.authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  } else {
    body.set("client_id", clientId);
    body.set("client_secret", clientSecret);
  }

  const res = await fetch(provider.tokenUrl(ctx), { method: "POST", headers, body });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Refresh failed: ${JSON.stringify(json).slice(0, 300)}`);

  const next: StoredToken = {
    ...token,
    accessToken: String(json.access_token ?? token.accessToken),
    refreshToken: json.refresh_token ? String(json.refresh_token) : token.refreshToken,
    expiresAt: json.expires_in
      ? Date.now() + Number(json.expires_in) * 1000
      : token.expiresAt,
    updatedAt: new Date().toISOString(),
  };
  await saveToken(next);
  return next;
}

export async function getValidAccessToken(
  workspaceId: string,
  connectorId: string,
): Promise<StoredToken | null> {
  const { getToken } = await import("./tokens.js");
  let token = await getToken(workspaceId, connectorId);
  if (!token) return null;
  if (token.expiresAt && token.expiresAt < Date.now() + 60_000 && token.refreshToken) {
    try {
      token = await refreshAccessToken(token);
    } catch {
      /* use existing until forced reconnect */
    }
  }
  return token;
}
