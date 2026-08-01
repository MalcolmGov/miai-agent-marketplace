import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { WORKSPACE_ID } from "@/lib/constants";

export interface AuthContext {
  mode: "mock" | "oidc";
  workspaceId: string;
  userId: string;
  roles: string[];
  raw?: JWTPayload;
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
 * - mock: body/query/header workspaceId, else demo-workspace
 * - oidc: Bearer JWT verified against MIAI_OIDC_ISSUER JWKS
 */
export async function resolveAuth(req: Request): Promise<AuthContext> {
  const mode = authMode();
  if (mode === "mock") {
    const url = new URL(req.url);
    const headerWs = req.headers.get("x-workspace-id");
    const headerUser = req.headers.get("x-user-id");
    const headerRoles = req.headers.get("x-roles");
    const roles = headerRoles
      ? headerRoles.split(",").map((r) => r.trim()).filter(Boolean)
      : ["admin"];
    return {
      mode: "mock",
      workspaceId: headerWs || url.searchParams.get("workspaceId") || WORKSPACE_ID,
      userId: headerUser || url.searchParams.get("userId") || "demo-user",
      roles,
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

  return { mode: "oidc", workspaceId, userId, roles, raw: payload };
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Public routes that skip OIDC when auth mode is oidc. */
export function isPublicApiPath(pathname: string): boolean {
  if (pathname === "/api/health") return true;
  if (pathname === "/api/catalog") return true;
  if (pathname.startsWith("/api/oauth/callback")) return true;
  if (pathname.startsWith("/api/embed/")) return true;
  if (pathname.startsWith("/agents/v1/")) return true;
  return false;
}
