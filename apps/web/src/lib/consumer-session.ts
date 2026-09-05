import { SignJWT, jwtVerify } from "jose";
import type { ConsumerIdentity } from "@/lib/consumer-oidc";

/**
 * Consumer session — a signed, HttpOnly cookie holding the verified person's identity after a
 * successful "Sign in with Google" flow. The consumer API routes then resolve `userId` from this
 * cookie (see resolveConsumerAuth), so memory is keyed to the real person.
 *
 * Two cookies, both signed (HS256) with the session secret:
 *  - the session cookie (long-lived): the signed-in identity.
 *  - the login-state cookie (short-lived): the CSRF `state`, OIDC `nonce` and PKCE `code_verifier`
 *    carried across the redirect to the provider and read back at the callback.
 */

export const SESSION_COOKIE = "miai_consumer_session";
export const LOGIN_STATE_COOKIE = "miai_consumer_login";

const SESSION_AUDIENCE = "miai:consumer:session";
const LOGIN_STATE_AUDIENCE = "miai:consumer:login-state";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const LOGIN_STATE_MAX_AGE = 60 * 10; // 10 minutes

function secretKey(): Uint8Array {
  const secret = process.env.MIAI_SESSION_SECRET || process.env.OAUTH_TOKEN_SECRET || "";
  if (secret.length < 16) {
    throw new Error(
      "MIAI_SESSION_SECRET (or OAUTH_TOKEN_SECRET) of >=16 chars required for consumer sessions",
    );
  }
  return new TextEncoder().encode(secret);
}

const isProd = () => process.env.NODE_ENV === "production";

/** Cookie options for NextResponse.cookies.set — secure in production, HttpOnly, lax same-site. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function loginStateCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax" as const,
    path: "/api/consumer/auth",
    maxAge: LOGIN_STATE_MAX_AGE,
  };
}

export async function signSession(identity: ConsumerIdentity): Promise<string> {
  return new SignJWT({ email: identity.email, name: identity.name })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(SESSION_AUDIENCE)
    .setSubject(identity.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export type LoginState = { state: string; nonce: string; verifier: string; returnTo: string };

export async function signLoginState(data: LoginState): Promise<string> {
  return new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(LOGIN_STATE_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${LOGIN_STATE_MAX_AGE}s`)
    .sign(secretKey());
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

/** The signed-in person, or null if there is no valid session cookie. Never throws. */
export async function readConsumerSession(req: Request): Promise<ConsumerIdentity | null> {
  try {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token) return null;
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
      audience: SESSION_AUDIENCE,
      requiredClaims: ["sub", "iat", "exp"],
    });
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    if (!sub) return null;
    return {
      sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
    };
  } catch {
    return null;
  }
}

export async function readLoginState(req: Request): Promise<LoginState | null> {
  try {
    const token = readCookie(req, LOGIN_STATE_COOKIE);
    if (!token) return null;
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
      audience: LOGIN_STATE_AUDIENCE,
      requiredClaims: ["iat", "exp"],
    });
    const { state, nonce, verifier, returnTo } = payload as Record<string, unknown>;
    if (
      typeof state === "string" &&
      typeof nonce === "string" &&
      typeof verifier === "string" &&
      typeof returnTo === "string"
    ) {
      return { state, nonce, verifier, returnTo };
    }
    return null;
  } catch {
    return null;
  }
}
