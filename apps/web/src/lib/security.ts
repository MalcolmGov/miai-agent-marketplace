import type { AuthContext } from "@/lib/auth";
import { redisAvailable, redisIncr, redisTtl } from "@/lib/redis";
import { isProductionRuntime } from "@/lib/security-flags";

export {
  MOCK_RAILS_ACK_ENV,
  EMBED_STAR_ACK_ENV,
  isProductionRuntime,
  mockRailsAllowed,
  embedOriginStarAllowed,
  isWeakSecret,
  checkProductionSecrets,
  checkProductionRails,
  checkBootHardening,
  assertProductionSecrets,
  assertBootHardening,
  timingSafeEqualString,
  type HardeningCheck,
} from "@/lib/security-flags";

/** Canonical workspace roles (least → most privileged). */
export const WORKSPACE_ROLES = ["readonly", "agent", "admin", "owner"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

const WORKSPACE_RANK: Record<WorkspaceRole, number> = {
  readonly: 1,
  agent: 2,
  admin: 3,
  owner: 4,
};

/** Platform / MyInstantAI operator roles (Agent Admin across tenants). */
const PLATFORM_ROLES = new Set(["operator", "platform_admin", "miai_admin"]);

const ALIASES: Record<string, WorkspaceRole | "operator"> = {
  owner: "owner",
  admin: "admin",
  agent: "agent",
  readonly: "readonly",
  "read-only": "readonly",
  reader: "readonly",
  viewer: "readonly",
  operator: "operator",
  platform_admin: "operator",
  miai_admin: "operator",
};

export function normalizeRoles(roles: string[]): string[] {
  const out = new Set<string>();
  for (const raw of roles) {
    const key = raw.trim().toLowerCase();
    const mapped = ALIASES[key];
    if (mapped) out.add(mapped);
    else if (key) out.add(key);
  }
  return [...out];
}

function bestWorkspaceRank(auth: AuthContext): number {
  let best = 0;
  for (const r of normalizeRoles(auth.roles)) {
    if (r in WORKSPACE_RANK) best = Math.max(best, WORKSPACE_RANK[r as WorkspaceRole]);
    if (PLATFORM_ROLES.has(r) || r === "operator") best = Math.max(best, WORKSPACE_RANK.admin);
  }
  return best;
}

export function hasMinRole(auth: AuthContext, min: WorkspaceRole): boolean {
  return bestWorkspaceRank(auth) >= WORKSPACE_RANK[min];
}

export function isOperator(auth: AuthContext): boolean {
  return normalizeRoles(auth.roles).some(
    (r) => r === "operator" || PLATFORM_ROLES.has(r) || r === "admin" || r === "owner",
  );
}

/** Gate MyInstantAI operator surfaces (Agent Admin marketplace view). */
export function requireOperator(auth: AuthContext): Response | null {
  const roles = normalizeRoles(auth.roles);
  const platform = roles.some((r) => r === "operator" || PLATFORM_ROLES.has(r));
  if (platform || (auth.mode === "mock" && hasMinRole(auth, "owner"))) return null;
  return Response.json(
    { error: "Forbidden — platform operator role required" },
    { status: 403 },
  );
}

/** Require at least this workspace role. */
export function requireRole(auth: AuthContext, min: WorkspaceRole): Response | null {
  if (hasMinRole(auth, min)) return null;
  return Response.json(
    { error: `Forbidden — requires ${min} role or higher`, roles: auth.roles },
    { status: 403 },
  );
}

type Bucket = { count: number; resetAt: number };

const g = globalThis as typeof globalThis & { __miaiRateLimit?: Map<string, Bucket> };

function buckets(): Map<string, Bucket> {
  if (!g.__miaiRateLimit) g.__miaiRateLimit = new Map();
  return g.__miaiRateLimit;
}

function rateLimitInProcess(
  key: string,
  opts: { limit: number; windowMs: number },
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const map = buckets();
  const current = map.get(key);
  if (!current || now >= current.resetAt) {
    map.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }
  if (current.count >= opts.limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  return { ok: true };
}

/**
 * Token bucket rate limiter. Uses Redis INCR + EXPIRE when Upstash is configured
 * (shared across replicas); otherwise in-process Map (single replica).
 */
export async function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const ttlSec = Math.ceil(opts.windowMs / 1000);

  if (redisAvailable()) {
    const redisKey = `miai:rl:${key}`;
    const count = await redisIncr(redisKey, ttlSec);
    if (count == null) {
      // Redis is configured but failed — do not silently fail open to a per-replica Map.
      return { ok: false, retryAfterSec: Math.max(1, ttlSec) };
    }
    if (count > opts.limit) {
      const remaining = await redisTtl(redisKey);
      const retryAfterSec = Math.max(
        1,
        remaining != null && remaining > 0 ? remaining : ttlSec,
      );
      return { ok: false, retryAfterSec };
    }
    return { ok: true };
  }

  return rateLimitInProcess(key, opts);
}

/** Wave4 proof sinks must require secrets outside local/dev. */
export function sinksRequireSecret(): boolean {
  return isProductionRuntime();
}

/** Demo embed keys (`mia_pk_*_demo`) only for local/dev. */
export function demoEmbedKeysAllowed(): boolean {
  return !isProductionRuntime();
}
