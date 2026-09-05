import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { WORKSPACE_ID } from "@/lib/constants";

export interface AuthContext {
  mode: "mock" | "oidc";
  workspaceId: string;
  userId: string;
  roles: string[];
  raw?: JWTPayload;
  /** Observability only (never branch authorization on this): how the identity was proven. */
  via?: "cookie" | "bearer";
}

function env(name: string): string | undefined {
  return process.env[name];
}

function authMode(): "mock" | "oidc" {
  return env("MIAI_AUTH_MODE") === "oidc" ? "oidc" : "mock";
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  const issuer = env("MIAI_OIDC_ISSUER");
  if (!issuer) throw new Error("MIAI_OIDC_ISSUER required when MIAI_AUTH_MODE=oidc");
  const url = new URL(
    env("MIAI_OIDC_JWKS_URL") ??
      `${issuer.replace(/\/$/, "")}/.well-known/jwks.json`,
  );
  if (!jwks) jwks = createRemoteJWKSet(url);
  return jwks;
}

/**
 * Resolve workspace/user from the request.
 * - mock: body/query/header workspaceId, else demo-workspace; roles from header/env,
 *   overridden by workspace member store when an active member matches userId
 * - oidc: Bearer JWT verified against MIAI_OIDC_ISSUER JWKS (IdP roles until SCIM)
 */
export async function resolveAuth(req: Request): Promise<AuthContext> {
  const mode = authMode();
  if (mode === "mock") {
    const url = new URL(req.url);
    const headerWs = req.headers.get("x-workspace-id");
    const headerUser = req.headers.get("x-user-id");
    const headerRoles = req.headers.get("x-roles");
    const envRoles = env("MIAI_MOCK_ROLES");
    // Elevated mock defaults only outside production, or when dual mock-rails flags are set.
    // Production without ACK must not silently grant owner+operator (boot also fails closed).
    const elevatedMockDefault =
      process.env.NODE_ENV !== "production" ||
      (process.env.ALLOW_MOCK_RAILS === "1" &&
        process.env.I_UNDERSTAND_MOCK_RAILS_IN_PROD === "1");
    let roles = headerRoles
      ? headerRoles.split(",").map((r) => r.trim()).filter(Boolean)
      : envRoles
        ? envRoles.split(",").map((r) => r.trim()).filter(Boolean)
        : elevatedMockDefault
          ? ["owner", "operator"]
          : ["readonly"];
    const workspaceId = headerWs || url.searchParams.get("workspaceId") || WORKSPACE_ID;
    const userId = headerUser || url.searchParams.get("userId") || "demo-user";

    try {
      const { roleFromMembers } = await import("@/lib/workspace-members");
      const memberRole = await roleFromMembers(workspaceId, userId);
      if (memberRole) {
        // Keep platform operator if already present; replace workspace role from store
        const platform = roles.filter((r) =>
          ["operator", "platform_admin", "miai_admin"].includes(r.toLowerCase()),
        );
        roles = [memberRole, ...platform];
      }
    } catch {
      /* member store optional at boot */
    }

    return {
      mode: "mock",
      workspaceId,
      userId,
      roles,
    };
  }

  // First-party BUSINESS session cookie (browser calls in OIDC mode). Verified HS256 against
  // MIAI_SESSION_SECRET, checked BEFORE the Bearer path so a signed-in browser needs no token.
  // Returns mode:"oidc" — the codebase's "identity is cryptographically verified → pin the
  // workspace to it, ignore client-supplied workspaceId, grant no mock backdoor" discriminator —
  // so every `auth.mode === "oidc" ? pinned : client-supplied` site pins to THIS user's own
  // workspace with zero edits. Isolation: workspaceId is derived from the verified Google sub and
  // the user is owner of only that workspace (no operator/platform role, so no cross-tenant reach).
  const { readBusinessSession } = await import("@/lib/business-session");
  const session = await readBusinessSession(req);
  // Offboarding: re-check the invite allowlist on EVERY request, not only at the callback. A 30-day
  // session cookie must stop working the moment the person is removed from the allowlist (or the
  // allowlist is cleared for an emergency lockout) — otherwise their existing cookie keeps full owner
  // access for weeks. The verified cookie satisfies the membership-only check, and a denied session
  // skips provisioning entirely so it can never resurrect a revoked member row.
  const { emailOnAllowlist } = await import("@/lib/business-allowlist");
  if (session && emailOnAllowlist(session.email)) {
    const { businessWorkspaceId, ensureOwnerProvisioned, roleFromMembers } = await import(
      "@/lib/workspace-members"
    );
    const workspaceId = businessWorkspaceId(session.sub);
    await ensureOwnerProvisioned({ workspaceId, identity: session }); // idempotent, cold-store safe
    const memberRole = await roleFromMembers(workspaceId, session.sub);
    return {
      mode: "oidc",
      workspaceId,
      userId: session.sub,
      roles: memberRole ? [memberRole] : ["owner"],
      via: "cookie",
    };
  }

  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    throw new AuthError(401, "Missing Bearer token");
  }

  const issuer = env("MIAI_OIDC_ISSUER");
  const audience = env("MIAI_OIDC_AUDIENCE");
  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: issuer || undefined,
    audience: audience || undefined,
  });

  const workspaceId =
    (payload.workspace_id as string) ||
    (payload.workspaceId as string) ||
    (payload.org_id as string);
  const userId =
    (payload.user_id as string) ||
    (payload.sub as string) ||
    "unknown";
  const roles = Array.isArray(payload.roles)
    ? (payload.roles as string[])
    : typeof payload.roles === "string"
      ? [payload.roles]
      : [];

  if (!workspaceId) {
    throw new AuthError(403, "Token missing workspace_id claim");
  }

  return { mode: "oidc", workspaceId, userId, roles, raw: payload, via: "bearer" };
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Public-path allowlist lives in one dependency-free module shared with middleware.ts
// (re-exported here for existing callers/tests). See lib/public-paths.ts.
export { isPublicApiPath } from "@/lib/public-paths";
