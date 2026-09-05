import {
  appBaseUrl,
  buildAuthorizationUrl,
  consumerOidcConfigured,
  exchangeCodeForIdentity,
  type ConsumerIdentity,
} from "@/lib/consumer-oidc";

/**
 * Business "Sign in with Google" — reuses the shared consumer OIDC engine (discovery + PKCE + JWKS +
 * id_token verification) with a business-scoped callback redirect URI. No crypto is forked here; the
 * only differences from the consumer flow are the redirect_uri and the session cookie (business-session.ts).
 *
 * Gated behind the same switches as the consumer flow (MIAI_AUTH_MODE=oidc + Google client creds),
 * so with mock auth nothing here runs. Access to the business console is additionally gated by the
 * email allowlist (business-allowlist.ts) at the callback.
 */

export type BusinessIdentity = ConsumerIdentity;

/** True when the Google OIDC client + issuer are configured (same predicate as the consumer flow). */
export function businessOidcConfigured(): boolean {
  return consumerOidcConfigured();
}

/** The business OAuth callback; must be registered as an authorized redirect URI on the Google client. */
export function businessRedirectUri(): string {
  return `${appBaseUrl()}/api/business/auth/callback`;
}

export function buildBusinessAuthorizationUrl(args: {
  state: string;
  nonce: string;
  codeChallenge: string;
}): Promise<string> {
  return buildAuthorizationUrl({ ...args, redirectUri: businessRedirectUri() });
}

export function exchangeBusinessCodeForIdentity(args: {
  code: string;
  codeVerifier: string;
  nonce: string;
}): Promise<BusinessIdentity> {
  return exchangeCodeForIdentity({ ...args, redirectUri: businessRedirectUri() });
}
