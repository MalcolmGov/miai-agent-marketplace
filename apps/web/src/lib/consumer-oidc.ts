import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Consumer OIDC — the "Sign in with Google" (or any compliant OIDC provider) login used to give a
 * person a real, verified identity so their memory is per-person rather than shared.
 *
 * This is the in-app Authorization Code + PKCE flow (the B2B `agents-auth` handoff delegates login
 * to an external MIAI portal; consumers instead sign in directly here). Everything is gated behind
 * MIAI_AUTH_MODE=oidc + provider credentials, so with mock auth nothing here runs.
 *
 * Endpoints come from the provider's OIDC discovery document, so this works for Google (issuer
 * https://accounts.google.com) and any other spec-compliant issuer without code changes.
 */

export const CONSUMER_OIDC_SCOPE = "openid email profile";

export function consumerOidcConfigured(): boolean {
  return (
    process.env.MIAI_AUTH_MODE === "oidc" &&
    Boolean(process.env.MIAI_OIDC_ISSUER) &&
    Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.MIAI_OIDC_CLIENT_ID) &&
    Boolean(process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.MIAI_OIDC_CLIENT_SECRET)
  );
}

function issuer(): string {
  const iss = process.env.MIAI_OIDC_ISSUER;
  if (!iss) throw new Error("MIAI_OIDC_ISSUER required");
  return iss.replace(/\/$/, "");
}

function clientId(): string {
  return (process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.MIAI_OIDC_CLIENT_ID || "").trim();
}

function clientSecret(): string {
  return (process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.MIAI_OIDC_CLIENT_SECRET || "").trim();
}

/** App origin used to build the OAuth redirect_uri (must be registered with the provider). */
export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function consumerRedirectUri(): string {
  return `${appBaseUrl()}/api/consumer/auth/callback`;
}

/**
 * Sanitize a `return_to` into a SAME-ORIGIN path (never an absolute/cross-origin URL). Resolves the
 * candidate against the app origin and keeps only the path+query when the origin still matches —
 * which rejects `//evil.com`, `https://evil.com`, and the backslash form `/\evil.com` (the WHATWG
 * parser normalizes `\` to `/`, so it would otherwise become protocol-relative). Falls back to /me.
 *
 * The result must not itself start with `//`: a candidate like `/..//evil.com` (or the same-origin
 * absolute `${base}//evil.com`) resolves to a same-origin URL whose *pathname* is `//evil.com`, which
 * would re-resolve to a cross-origin URL at a redirect sink — so a `//`-leading result is rejected.
 */
export function safeReturnPath(raw: string | null | undefined): string {
  const FALLBACK = "/me";
  if (!raw) return FALLBACK;
  try {
    const base = appBaseUrl();
    const dest = new URL(raw, base);
    if (dest.origin !== new URL(base).origin) return FALLBACK;
    const path = `${dest.pathname}${dest.search}${dest.hash}`;
    return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") ? path : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

type Discovery = { authorization_endpoint: string; token_endpoint: string; jwks_uri: string };
let discoveryCache: { at: number; doc: Discovery } | null = null;
let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

/** Fetch + cache the provider's OIDC discovery document (endpoints). */
async function discovery(): Promise<Discovery> {
  const now = Date.now();
  if (discoveryCache && now - discoveryCache.at < 3_600_000) return discoveryCache.doc;
  const res = await fetch(`${issuer()}/.well-known/openid-configuration`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`OIDC discovery failed (${res.status})`);
  const doc = (await res.json()) as Discovery;
  if (!doc.authorization_endpoint || !doc.token_endpoint || !doc.jwks_uri) {
    throw new Error("OIDC discovery document missing endpoints");
  }
  discoveryCache = { at: now, doc };
  return doc;
}

function jwks(jwksUri: string) {
  if (!jwksCache) jwksCache = createRemoteJWKSet(new URL(jwksUri));
  return jwksCache;
}

// ---- PKCE + one-time values -------------------------------------------------

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(bytes = 32): string {
  return base64url(randomBytes(bytes));
}

export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = randomToken(32);
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

// ---- Flow steps -------------------------------------------------------------

export async function buildAuthorizationUrl(args: {
  state: string;
  nonce: string;
  codeChallenge: string;
}): Promise<string> {
  const { authorization_endpoint } = await discovery();
  const url = new URL(authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId());
  url.searchParams.set("redirect_uri", consumerRedirectUri());
  url.searchParams.set("scope", CONSUMER_OIDC_SCOPE);
  url.searchParams.set("state", args.state);
  url.searchParams.set("nonce", args.nonce);
  url.searchParams.set("code_challenge", args.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  // Ask Google to always return an id_token with the account picker.
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export type ConsumerIdentity = { sub: string; email?: string; name?: string; emailVerified?: boolean };

/** Exchange the authorization code for tokens and return the verified identity. */
export async function exchangeCodeForIdentity(args: {
  code: string;
  codeVerifier: string;
  nonce: string;
}): Promise<ConsumerIdentity> {
  const { token_endpoint, jwks_uri } = await discovery();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: args.code,
    client_id: clientId(),
    client_secret: clientSecret(),
    redirect_uri: consumerRedirectUri(),
    code_verifier: args.codeVerifier,
  });
  const res = await fetch(token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status})`);
  }
  const tokens = (await res.json()) as { id_token?: string };
  if (!tokens.id_token) throw new Error("No id_token in token response");

  const { payload } = await jwtVerify(tokens.id_token, jwks(jwks_uri), {
    issuer: issuer(),
    audience: clientId(),
  });
  if (payload.nonce !== args.nonce) throw new Error("OIDC nonce mismatch");
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!sub) throw new Error("id_token missing sub");
  return {
    sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
    emailVerified: payload.email_verified === true,
  };
}
