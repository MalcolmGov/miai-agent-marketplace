import { SignJWT, jwtVerify } from "jose";
import type { ConsumerIdentity } from "@/lib/consumer-oidc";

/**
 * Business session — a signed, HttpOnly cookie holding the verified Google identity after a
 * successful business "Sign in with Google". `resolveAuth` reads this cookie (before the Bearer
 * path) and resolves the caller to the owner of their own per-user workspace.
 *
 * Mirrors consumer-session.ts but with distinct cookie names, so a person can be signed in to the
 * consumer and business surfaces independently. Same HS256 signing secret.
 *
 * Two cookies, both signed (HS256) with the session secret:
 *  - the session cookie (long-lived): the signed-in identity.
 *  - the login-state cookie (short-lived): CSRF `state`, OIDC `nonce`, PKCE `code_verifier`.
 */

export const BUSINESS_SESSION_COOKIE = "miai_business_session";
export const BUSINESS_LOGIN_STATE_COOKIE = "miai_business_login";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const LOGIN_STATE_MAX_AGE = 60 * 10; // 10 minutes

function secretKey(): Uint8Array {
  const secret = process.env.MIAI_SESSION_SECRET || process.env.OAUTH_TOKEN_SECRET || "";
  if (secret.length < 16) {
    throw new Error(
      "MIAI_SESSION_SECRET (or OAUTH_TOKEN_SECRET) of >=16 chars required for business sessions",
    );
  }
  return new TextEncoder().encode(secret);
}

const isProd = () => process.env.NODE_ENV === "production";

/** Cookie options for the long-lived session cookie — secure in production, HttpOnly, lax same-site. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

/** Cookie options for the short-lived login-state cookie — scoped to the business auth subtree. */
export function loginStateCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax" as const,
    path: "/api/business/auth",
    maxAge: LOGIN_STATE_MAX_AGE,
  };
}

export async function signBusinessSession(identity: ConsumerIdentity): Promise<string> {
  return new SignJWT({ email: identity.email, name: identity.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(identity.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export type BusinessLoginState = {
  state: string;
  nonce: string;
  verifier: string;
  returnTo: string;
};

export async function signBusinessLoginState(data: BusinessLoginState): Promise<string> {
  return new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
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

/** The signed-in business person, or null if there is no valid session cookie. Never throws. */
export async function readBusinessSession(req: Request): Promise<ConsumerIdentity | null> {
  const token = readCookie(req, BUSINESS_SESSION_COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
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

export async function readBusinessLoginState(req: Request): Promise<BusinessLoginState | null> {
  const token = readCookie(req, BUSINESS_LOGIN_STATE_COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
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
