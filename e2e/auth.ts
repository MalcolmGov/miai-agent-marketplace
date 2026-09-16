import { createHmac } from "node:crypto";
import type { BrowserContext } from "@playwright/test";

/**
 * Authenticated-E2E session minting.
 *
 * Gated business surfaces (studio pages at /agents/:id, rent/configure APIs) require a
 * signed-in business session when the target runs MIAI_AUTH_MODE=oidc. Playwright cannot
 * complete a real Google consent screen headlessly, so instead we mint the same HS256
 * session JWT the server issues after a successful business login
 * (apps/web/src/lib/business-session.ts).
 *
 * This is NOT a backdoor: the minted token goes through the standard verification path —
 * signature, audience and expiry are validated and the email is re-checked against the
 * invite allowlist (MIAI_B2B_ALLOWED_EMAILS / _DOMAINS) on EVERY request. It can only
 * impersonate an identity that is already allowed to sign in.
 *
 * Required env (auth-dependent tests skip cleanly without it):
 *   E2E_SESSION_SECRET  — must equal the target's MIAI_SESSION_SECRET (or its
 *                         OAUTH_TOKEN_SECRET fallback).
 *   E2E_BUSINESS_EMAIL  — optional; an email on the target's invite allowlist.
 *                         Defaults to e2e-smoke@myinstantai.com (covered by
 *                         MIAI_B2B_ALLOWED_DOMAINS=myinstantai.com on staging).
 *   E2E_BUSINESS_SUB    — optional stable subject; a fixed value pins all runs to one
 *                         isolated e2e workspace (businessWorkspaceId(sub)).
 */

const SESSION_AUDIENCE = "miai:business:session"; // matches business-session.ts
export const E2E_SESSION_COOKIE = "miai_business_session";

export function e2eSessionConfigured(): boolean {
  return Boolean((process.env.E2E_SESSION_SECRET || "").trim());
}

export const E2E_SESSION_SKIP_REASON =
  "Needs E2E_SESSION_SECRET (target's MIAI_SESSION_SECRET) — set it to run authenticated smoke tests; see docs/PROD_E2E.md";

function b64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

/** Mint a session JWT identical in shape to signBusinessSession() (HS256, aud, sub, iat, exp). */
export function mintBusinessSession(): string {
  const secret = (process.env.E2E_SESSION_SECRET || "").trim();
  if (secret.length < 16) throw new Error("E2E_SESSION_SECRET must be >= 16 chars");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256" }));
  const payload = b64url(
    JSON.stringify({
      sub: (process.env.E2E_BUSINESS_SUB || "e2e-smoke-user").trim(),
      email: (process.env.E2E_BUSINESS_EMAIL || "e2e-smoke@myinstantai.com").trim(),
      name: "E2E Smoke",
      aud: SESSION_AUDIENCE,
      iat: now,
      exp: now + 60 * 60, // 1 hour — plenty for a suite run
    }),
  );
  const sig = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

/** Set the business session cookie on a browser context (UI specs). */
export async function authenticateContext(context: BrowserContext, baseURL: string): Promise<void> {
  await context.addCookies([
    {
      name: E2E_SESSION_COOKIE,
      value: mintBusinessSession(),
      url: baseURL,
      httpOnly: true,
      secure: baseURL.startsWith("https:"),
      sameSite: "Lax",
    },
  ]);
}

/** Headers carrying the session cookie — pass to request.get/post in API specs. */
export function authHeaders(): Record<string, string> {
  return { cookie: `${E2E_SESSION_COOKIE}=${mintBusinessSession()}` };
}
