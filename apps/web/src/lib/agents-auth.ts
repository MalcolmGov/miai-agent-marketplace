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

/** External MIAI login/signup URL for the Agents product. */
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
  const loginUrl = agentsAuthLoginUrl(opts);
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
