import { NextResponse } from "next/server";
import { pkcePair, randomToken, safeReturnPath } from "@/lib/consumer-oidc";
import { buildBusinessAuthorizationUrl, businessOidcConfigured } from "@/lib/business-oidc";
import {
  BUSINESS_LOGIN_STATE_COOKIE,
  loginStateCookieOptions,
  signBusinessLoginState,
} from "@/lib/business-session";

export const dynamic = "force-dynamic";

/**
 * Start the business "Sign in with Google": generate PKCE + a CSRF `state` + an OIDC `nonce`, stash
 * them in a short-lived signed cookie, and redirect the person to the provider with the BUSINESS
 * callback as redirect_uri. Access is still gated by the email allowlist at the callback.
 */
export async function GET(req: Request) {
  if (!businessOidcConfigured()) {
    return NextResponse.json({ error: "Business sign-in is not enabled" }, { status: 404 });
  }
  const url = new URL(req.url);
  const returnTo = safeReturnPath(url.searchParams.get("return_to") || "/");
  const state = randomToken(24);
  const nonce = randomToken(24);
  const { verifier, challenge } = pkcePair();

  const authUrl = await buildBusinessAuthorizationUrl({ state, nonce, codeChallenge: challenge });
  const stateToken = await signBusinessLoginState({ state, nonce, verifier, returnTo });

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(BUSINESS_LOGIN_STATE_COOKIE, stateToken, loginStateCookieOptions());
  return res;
}
