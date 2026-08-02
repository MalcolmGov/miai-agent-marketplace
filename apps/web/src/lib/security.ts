import { NextResponse } from "next/server";
import type { AuthContext } from "@/lib/auth";

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

const DEV_DEFAULT_SECRET = "dev-only-change-me";

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
    // Legacy: bare "admin" already mapped; platform operators get admin-equivalent on their home ws
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
export function requireOperator(auth: AuthContext): NextResponse | null {
  const roles = normalizeRoles(auth.roles);
  const platform = roles.some((r) => r === "operator" || PLATFORM_ROLES.has(r));
  // Demo: mock owners can open the operator view without a separate IdP role
  if (platform || (auth.mode === "mock" && hasMinRole(auth, "owner"))) return null;
  return NextResponse.json(
    { error: "Forbidden — platform operator role required" },
    { status: 403 },
  );
}

/** Require at least this workspace role. */
export function requireRole(auth: AuthContext, min: WorkspaceRole): NextResponse | null {
  if (hasMinRole(auth, min)) return null;
  return NextResponse.json(
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

/**
 * Simple in-process token bucket. Good enough for embed abuse control on a single
 * Container App replica; replace with Redis/APIM when multi-region scale lands.
 */
export function rateLimit(
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

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Staging demos may keep mock auth/wallet/model when this is set. */
export function mockRailsAllowed(): boolean {
  if (!isProductionRuntime()) return true;
  return process.env.ALLOW_MOCK_RAILS === "1";
}

export function isWeakSecret(value: string | undefined): boolean {
  if (!value) return true;
  if (value === DEV_DEFAULT_SECRET) return true;
  if (value === "replace-with-long-random-string") return true;
  if (value.length < 16) return true;
  return false;
}

export type HardeningCheck = { ok: true } | { ok: false; errors: string[] };

/** Strong secrets required whenever OIDC is on, or production without mock rails. */
export function checkProductionSecrets(): HardeningCheck {
  const authMode = process.env.MIAI_AUTH_MODE ?? "mock";
  const mustCheck =
    authMode === "oidc" || (isProductionRuntime() && !mockRailsAllowed());
  if (!mustCheck) return { ok: true };

  const errors: string[] = [];
  const token = process.env.OAUTH_TOKEN_SECRET;
  const state = process.env.OAUTH_STATE_SECRET || token;
  const embed = process.env.EMBED_KEY_SECRET || token;

  if (isWeakSecret(token)) {
    errors.push("OAUTH_TOKEN_SECRET missing or weak (min 16 chars, not a default)");
  }
  if (isWeakSecret(state)) {
    errors.push("OAUTH_STATE_SECRET missing or weak (or set a strong OAUTH_TOKEN_SECRET)");
  }
  if (isWeakSecret(embed)) {
    errors.push("EMBED_KEY_SECRET missing or weak (or set a strong OAUTH_TOKEN_SECRET)");
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

/** Refuse mock auth/wallet/model in production unless ALLOW_MOCK_RAILS=1. */
export function checkProductionRails(): HardeningCheck {
  if (mockRailsAllowed()) return { ok: true };

  const errors: string[] = [];
  const auth = process.env.MIAI_AUTH_MODE ?? "mock";
  const wallet = process.env.MIAI_WALLET_MODE ?? "mock";
  const model = process.env.MIAI_MODEL_MODE ?? "mock";

  if (auth === "mock") {
    errors.push("MIAI_AUTH_MODE=mock blocked in production (set OIDC or ALLOW_MOCK_RAILS=1)");
  }
  if (wallet === "mock") {
    errors.push("MIAI_WALLET_MODE=mock blocked in production (set http or ALLOW_MOCK_RAILS=1)");
  }
  if (model === "mock") {
    errors.push(
      "MIAI_MODEL_MODE=mock blocked in production (set openai|anthropic|gateway or ALLOW_MOCK_RAILS=1)",
    );
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function checkBootHardening(): HardeningCheck {
  const secrets = checkProductionSecrets();
  const rails = checkProductionRails();
  const errors = [
    ...(secrets.ok ? [] : secrets.errors),
    ...(rails.ok ? [] : rails.errors),
  ];
  return errors.length ? { ok: false, errors } : { ok: true };
}

/**
 * Fail closed in non-mock when critical secrets are still the dev default.
 * Logs always; throws on boot when production hardening fails.
 */
export function assertProductionSecrets(): void {
  const check = checkProductionSecrets();
  if (!check.ok) {
    for (const e of check.errors) console.error(`[security] ${e}`);
  }
}

/** Called from instrumentation.ts on Node server start. */
export function assertBootHardening(): void {
  const check = checkBootHardening();
  if (check.ok) return;
  for (const e of check.errors) console.error(`[security] ${e}`);
  if (isProductionRuntime()) {
    throw new Error(
      `[security] Refusing to start — fix env or set ALLOW_MOCK_RAILS=1 for staging demos.\n- ${check.errors.join("\n- ")}`,
    );
  }
}

/** Wave4 proof sinks must require secrets outside local/dev. */
export function sinksRequireSecret(): boolean {
  return isProductionRuntime();
}

/** Demo embed keys (`mia_pk_*_demo`) only for local/dev. */
export function demoEmbedKeysAllowed(): boolean {
  return !isProductionRuntime();
}
