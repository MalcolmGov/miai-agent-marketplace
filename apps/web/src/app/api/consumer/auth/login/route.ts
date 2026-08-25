import { NextResponse } from "next/server";
import {
  buildAuthorizationUrl,
  consumerOidcConfigured,
  pkcePair,
  randomToken,
  safeReturnPath,
} from "@/lib/consumer-oidc";
import { LOGIN_STATE_COOKIE, loginStateCookieOptions, signLoginState } from "@/lib/consumer-session";

export const dynamic = "force-dynamic";

/**
 * Start "Sign in with Google": generate PKCE + a CSRF `state` + an OIDC `nonce`, stash them in a
 * short-lived signed cookie, and redirect the person to the provider.
 */
export async function GET(req: Request) {
  if (!consumerOidcConfigured()) {
    return NextResponse.json({ error: "Consumer sign-in is not enabled" }, { status: 404 });
  }
  const url = new URL(req.url);
  const returnTo = safeReturnPath(url.searchParams.get("return_to"));
  const state = randomToken(24);
  const nonce = randomToken(24);
  const { verifier, challenge } = pkcePair();

  const authUrl = await buildAuthorizationUrl({ state, nonce, codeChallenge: challenge });
  const stateToken = await signLoginState({ state, nonce, verifier, returnTo });

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(LOGIN_STATE_COOKIE, stateToken, loginStateCookieOptions());
  return res;
}
