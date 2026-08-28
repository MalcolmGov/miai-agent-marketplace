/**
 * MyInstantAI Agents auth handoff (separate from consumer Get Started).
 * See docs/B2B_ONBOARDING.md
 */

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/** External MIAI login/signup URL for the Agents product (legacy — retired once OIDC is on). */
export function agentsAuthLoginUrl(opts?: { returnTo?: string }): string | null {
  const base =
    process.env.NEXT_PUBLIC_MIAI_AGENTS_AUTH_URL || process.env.MIAI_AGENTS_AUTH_URL || "";
  if (!base.trim()) return null;
  try {
    const url = new URL(base);
    url.searchParams.set("product", "agents");
    url.searchParams.set("return_to", opts?.returnTo || `${appBaseUrl()}/`);
    return url.toString();
  } catch {
    return null;
  }
}

/** True when the first-party business Google login is configured (same predicate as the OIDC flow). */
function businessOidcConfigured(): boolean {
  return (
    process.env.MIAI_AUTH_MODE === "oidc" &&
    Boolean(process.env.MIAI_OIDC_ISSUER) &&
    Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.MIAI_OIDC_CLIENT_ID) &&
    Boolean(process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.MIAI_OIDC_CLIENT_SECRET)
  );
}

/**
 * First-party business Google login URL. ABSOLUTE on purpose — GetStartedWizard does
 * `new URL(loginUrl)`, which throws on a relative path. The /login page also navigates to it.
 */
export function businessLoginUrl(opts?: { returnTo?: string }): string {
  const url = new URL(`${appBaseUrl()}/api/business/auth/login`);
  url.searchParams.set("return_to", opts?.returnTo || `${appBaseUrl()}/`);
  return url.toString();
}

export function consumerAppUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_MIAI_CONSUMER_APP_URL || process.env.MIAI_CONSUMER_APP_URL;
  return raw?.trim() || null;
}

export function authMode(): "mock" | "oidc" {
  return process.env.MIAI_AUTH_MODE === "oidc" ? "oidc" : "mock";
}

/** Public handoff payload for /login and clients. */
export function authHandoffPayload(opts?: { returnTo?: string }) {
  const mode = authMode();
  // Prefer the first-party "Continue with Google" route when business OIDC is configured; fall back
  // to the legacy external portal URL only when it isn't (kept until that portal is fully retired).
  const loginUrl = businessOidcConfigured() ? businessLoginUrl(opts) : agentsAuthLoginUrl(opts);
  return {
    mode,
    product: "agents" as const,
    loginUrl,
    getStartedPath: "/get-started",
    consumerAppUrl: consumerAppUrl(),
    /** When oidc and loginUrl set, clients should send users to loginUrl before APIs. */
    requiresExternalLogin: mode === "oidc" && Boolean(loginUrl),
  };
}
