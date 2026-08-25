import { NextResponse } from "next/server";
import {
  appBaseUrl,
  consumerOidcConfigured,
  exchangeCodeForIdentity,
  safeReturnPath,
} from "@/lib/consumer-oidc";
import {
  LOGIN_STATE_COOKIE,
  SESSION_COOKIE,
  loginStateCookieOptions,
  readLoginState,
  sessionCookieOptions,
  signSession,
} from "@/lib/consumer-session";

export const dynamic = "force-dynamic";

/** Redirect to `returnTo` (re-validated to a same-origin path), clearing the login-state cookie. */
function redirectClearingState(returnTo: string, opts?: { error?: boolean }) {
  const dest = new URL(safeReturnPath(returnTo), appBaseUrl());
  if (opts?.error) dest.searchParams.set("auth_error", "1");
  const res = NextResponse.redirect(dest.toString());
  res.cookies.set(LOGIN_STATE_COOKIE, "", { ...loginStateCookieOptions(), maxAge: 0 });
  return res;
}

/**
 * OIDC redirect target. Validates the CSRF `state` against the signed login-state cookie, exchanges
 * the code for tokens (verifying the id_token + `nonce` inside exchangeCodeForIdentity), and sets a
 * signed session cookie. Any failure redirects back with ?auth_error=1 and never sets a session.
 */
export async function GET(req: Request) {
  if (!consumerOidcConfigured()) {
    return NextResponse.json({ error: "Consumer sign-in is not enabled" }, { status: 404 });
  }
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");

  const login = await readLoginState(req);
  const returnTo = login?.returnTo || "/me";

  // CSRF + integrity: the provider must have returned our code and a state that matches the signed
  // login-state cookie we set at /login. A missing/forged state or a provider error aborts.
  if (providerError || !code || !state || !login || state !== login.state) {
    return redirectClearingState(returnTo, { error: true });
  }

  try {
    const identity = await exchangeCodeForIdentity({
      code,
      codeVerifier: login.verifier,
      nonce: login.nonce,
    });
    const session = await signSession(identity);
    const res = redirectClearingState(returnTo);
    res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
    return res;
  } catch {
    return redirectClearingState(returnTo, { error: true });
  }
}
