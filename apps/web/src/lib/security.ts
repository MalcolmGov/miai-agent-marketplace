import { NextResponse } from "next/server";
import type { AuthContext } from "@/lib/auth";

const OPERATOR_ROLES = new Set(["admin", "operator", "platform_admin", "miai_admin"]);

export function isOperator(auth: AuthContext): boolean {
  return auth.roles.some((r) => OPERATOR_ROLES.has(r.toLowerCase()));
}

/** Gate MyInstantAI operator surfaces (Agent Admin). */
export function requireOperator(auth: AuthContext): NextResponse | null {
  if (isOperator(auth)) return null;
  return NextResponse.json(
    { error: "Forbidden — operator role required (admin / operator)" },
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

/** Fail closed in non-mock when critical secrets are still the dev default. */
export function assertProductionSecrets(): void {
  if (process.env.MIAI_AUTH_MODE !== "oidc") return;
  const bad = "dev-only-change-me";
  const secrets = [
    process.env.OAUTH_TOKEN_SECRET,
    process.env.OAUTH_STATE_SECRET,
    process.env.EMBED_KEY_SECRET,
  ];
  if (secrets.some((s) => !s || s === bad || s.length < 16)) {
    console.error(
      "[security] OIDC mode requires strong OAUTH_TOKEN_SECRET / OAUTH_STATE_SECRET / EMBED_KEY_SECRET",
    );
  }
}
