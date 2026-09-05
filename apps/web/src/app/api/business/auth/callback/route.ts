import { NextResponse } from "next/server";
import { appBaseUrl, safeReturnPath } from "@/lib/consumer-oidc";
import { businessOidcConfigured, exchangeBusinessCodeForIdentity } from "@/lib/business-oidc";
import {
  BUSINESS_LOGIN_STATE_COOKIE,
  BUSINESS_SESSION_COOKIE,
  loginStateCookieOptions,
  readBusinessLoginState,
  sessionCookieOptions,
  signBusinessSession,
} from "@/lib/business-session";
import { isBusinessEmailAllowed } from "@/lib/business-allowlist";
import { businessWorkspaceId, ensureOwnerProvisioned } from "@/lib/workspace-members";

export const dynamic = "force-dynamic";

/**
 * Redirect to the /login page in a given state (complete | denied | auth_error), always clearing the
 * login-state cookie. The callback bounces through /login (rather than straight to the destination)
 * so the page can set the client-side shell flags the Sidebar reads before forwarding to `return_to`.
 */
function redirectToLogin(params: Record<string, string>) {
  const dest = new URL("/login", appBaseUrl());
  for (const [k, v] of Object.entries(params)) dest.searchParams.set(k, v);
  const res = NextResponse.redirect(dest.toString());
  res.cookies.set(BUSINESS_LOGIN_STATE_COOKIE, "", { ...loginStateCookieOptions(), maxAge: 0 });
  return res;
}

/**
 * OIDC redirect target for the business flow. Validates the CSRF `state`, exchanges the code
 * (verifying id_token + nonce), enforces the invite allowlist, provisions the per-user workspace,
 * and sets a signed business session cookie. Any failure or a non-allowlisted email sets NO session.
 */
export async function GET(req: Request) {
  if (!businessOidcConfigured()) {
    return NextResponse.json({ error: "Business sign-in is not enabled" }, { status: 404 });
  }
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");

  const login = await readBusinessLoginState(req);
  const returnTo = safeReturnPath(login?.returnTo || "/");

  // CSRF + integrity: the provider must return our code and a state matching the signed cookie.
  // Split so `login` narrows to non-null before the state compare (and login.verifier/nonce below).
  if (providerError || !code || !state || !login) {
    return redirectToLogin({ auth_error: "1" });
  }
  if (state !== login.state) {
    return redirectToLogin({ auth_error: "1" });
  }

  try {
    const identity = await exchangeBusinessCodeForIdentity({
      code,
      codeVerifier: login.verifier,
      nonce: login.nonce,
    });

    // Invite-only gate — the single choke point. Only allowlisted, Google-verified emails get in.
    if (!isBusinessEmailAllowed(identity.email, identity.emailVerified)) {
      return redirectToLogin({ denied: "1" });
    }

    // Provision the caller's own workspace and seed them as owner (idempotent). This is where a
    // per-user workspace comes into being on first login.
    const workspaceId = businessWorkspaceId(identity.sub);
    await ensureOwnerProvisioned({ workspaceId, identity });

    const session = await signBusinessSession(identity);
    const res = redirectToLogin({ complete: "1", return_to: returnTo });
    res.cookies.set(BUSINESS_SESSION_COOKIE, session, sessionCookieOptions());
    return res;
  } catch {
    return redirectToLogin({ auth_error: "1" });
  }
}
