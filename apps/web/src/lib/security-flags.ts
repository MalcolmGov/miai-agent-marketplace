const DEV_DEFAULT_SECRET = "dev-only-change-me";

/** Second confirmation required with ALLOW_MOCK_RAILS in production. */
export const MOCK_RAILS_ACK_ENV = "I_UNDERSTAND_MOCK_RAILS_IN_PROD";
/** Second confirmation required with ALLOW_EMBED_ORIGIN_STAR in production. */
export const EMBED_STAR_ACK_ENV = "I_UNDERSTAND_EMBED_ORIGIN_STAR";
/** Second confirmation required with ALLOW_FILE_FALLBACK_IN_PROD. */
export const FILE_FALLBACK_ACK_ENV = "I_UNDERSTAND_FILE_FALLBACK_IN_PROD";
/** Second confirmation required when PG_SSL_REJECT_UNAUTHORIZED=0 in production. */
export const PG_SSL_INSECURE_ACK_ENV = "I_UNDERSTAND_PG_SSL_INSECURE";
/** Second confirmation required to run SANDBOX_MODE=1 alongside real production rails. */
export const SANDBOX_IN_PROD_ACK_ENV = "I_UNDERSTAND_SANDBOX_IN_PROD";

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

function envFlag(name: string): boolean {
  return process.env[name] === "1";
}

/**
 * Staging demos may keep mock auth/wallet/model when BOTH flags are set in production:
 * ALLOW_MOCK_RAILS=1 and I_UNDERSTAND_MOCK_RAILS_IN_PROD=1.
 */
export function mockRailsAllowed(): boolean {
  // A sandbox is an explicitly acknowledged mock-rails evaluation environment.
  if (process.env.SANDBOX_MODE === "1") return true;
  if (!isProductionRuntime()) return true;
  return envFlag("ALLOW_MOCK_RAILS") && envFlag(MOCK_RAILS_ACK_ENV);
}

/** Bare embed CORS `*` in production requires dual acknowledgment. */
export function embedOriginStarAllowed(): boolean {
  if (!isProductionRuntime()) return true;
  return envFlag("ALLOW_EMBED_ORIGIN_STAR") && envFlag(EMBED_STAR_ACK_ENV);
}

export function isWeakSecret(value: string | undefined): boolean {
  if (!value) return true;
  if (value === DEV_DEFAULT_SECRET) return true;
  if (value === "replace-with-long-random-string") return true;
  if (value.length < 16) return true;
  return false;
}

export type HardeningCheck = { ok: true } | { ok: false; errors: string[] };

function dualFlagHint(primary: string, ack: string): string {
  return `set ${primary}=1 and ${ack}=1 (staging demos only)`;
}

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

  // These have safe behaviour when UNSET (MIAI_SESSION_SECRET falls back to OAUTH_TOKEN_SECRET; the
  // sink/cron routes fail closed with 503/401), so they are not required. But a SET-but-weak value
  // would boot "green" while being under-protected — flag that so it fails closed at boot, not at
  // the first request.
  for (const name of ["MIAI_SESSION_SECRET", "WEBHOOK_SINK_SECRET", "CRON_SECRET"] as const) {
    const v = process.env[name];
    if (v !== undefined && isWeakSecret(v)) {
      errors.push(`${name} is set but weak (min 16 chars, not a default) — set a strong value or unset it`);
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

/**
 * Refuse mock auth/wallet/model in production unless dual mock-rails flags are set.
 * Also catch half-configured escape hatches (one flag without the other).
 */
export function checkProductionRails(): HardeningCheck {
  if (!isProductionRuntime()) return { ok: true };

  const errors: string[] = [];
  const allow = envFlag("ALLOW_MOCK_RAILS");
  const ack = envFlag(MOCK_RAILS_ACK_ENV);

  if (allow !== ack) {
    errors.push(
      `Mock rails escape hatch incomplete — ${dualFlagHint("ALLOW_MOCK_RAILS", MOCK_RAILS_ACK_ENV)}`,
    );
  }

  const embedStar = envFlag("ALLOW_EMBED_ORIGIN_STAR");
  const embedAck = envFlag(EMBED_STAR_ACK_ENV);
  if (embedStar !== embedAck) {
    errors.push(
      `Embed origin * escape hatch incomplete — ${dualFlagHint("ALLOW_EMBED_ORIGIN_STAR", EMBED_STAR_ACK_ENV)}`,
    );
  }

  // A typo must not pass boot checks then select a mock adapter at runtime.
  for (const [key, allowed] of [
    ["MIAI_AUTH_MODE", ["mock", "oidc"]],
    ["MIAI_WALLET_MODE", ["mock", "http"]],
    ["MIAI_MODEL_MODE", ["mock", "gateway", "http", "azure", "openai", "anthropic", "claude"]],
  ] as const) {
    const mode = process.env[key] ?? "mock";
    if (!(allowed as readonly string[]).includes(mode)) errors.push(`${key} has an unsupported mode`);
  }

  if (mockRailsAllowed()) return errors.length ? { ok: false, errors } : { ok: true };

  const auth = process.env.MIAI_AUTH_MODE ?? "mock";
  const wallet = process.env.MIAI_WALLET_MODE ?? "mock";
  const model = process.env.MIAI_MODEL_MODE ?? "mock";

  if (auth === "mock") {
    errors.push(
      `MIAI_AUTH_MODE=mock blocked in production (set OIDC or ${dualFlagHint("ALLOW_MOCK_RAILS", MOCK_RAILS_ACK_ENV)})`,
    );
  }
  if (wallet === "mock") {
    errors.push(
      `MIAI_WALLET_MODE=mock blocked in production (set http or ${dualFlagHint("ALLOW_MOCK_RAILS", MOCK_RAILS_ACK_ENV)})`,
    );
  }
  if (model === "mock") {
    errors.push(
      `MIAI_MODEL_MODE=mock blocked in production (set openai|azure|anthropic|gateway or ${dualFlagHint("ALLOW_MOCK_RAILS", MOCK_RAILS_ACK_ENV)})`,
    );
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

/**
 * Production must use Postgres unless dual file-fallback flags are set.
 * Remote Postgres must verify TLS unless dual insecure-SSL flags are set.
 */
export function checkProductionPersistence(): HardeningCheck {
  if (!isProductionRuntime()) return { ok: true };

  const errors: string[] = [];
  const dbUrl = (process.env.DATABASE_URL || process.env.MIAI_DATABASE_URL)?.trim();
  const allowFile = envFlag("ALLOW_FILE_FALLBACK_IN_PROD");
  const fileAck = envFlag(FILE_FALLBACK_ACK_ENV);
  if (allowFile !== fileAck) {
    errors.push(
      `File fallback escape hatch incomplete — ${dualFlagHint("ALLOW_FILE_FALLBACK_IN_PROD", FILE_FALLBACK_ACK_ENV)}`,
    );
  }
  if (!dbUrl && !(allowFile && fileAck)) {
    errors.push(
      `DATABASE_URL required in production (or ${dualFlagHint("ALLOW_FILE_FALLBACK_IN_PROD", FILE_FALLBACK_ACK_ENV)})`,
    );
  }

  if (dbUrl && !/localhost|127\.0\.0\.1/.test(dbUrl)) {
    const insecureSsl = process.env.PG_SSL_REJECT_UNAUTHORIZED === "0";
    const sslAck = envFlag(PG_SSL_INSECURE_ACK_ENV);
    if (insecureSsl && !sslAck) {
      errors.push(
        `PG_SSL_REJECT_UNAUTHORIZED=0 blocked in production without ${PG_SSL_INSECURE_ACK_ENV}=1`,
      );
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}

/**
 * Real-production rail signals that must never coexist with SANDBOX_MODE=1.
 *
 * SANDBOX_MODE=1 relaxes ALL boot hardening (mock auth/wallet, weak secrets, file store), so if it
 * is ever inherited onto a genuine customer deployment the app would boot wide open with no warning.
 * We detect that by rails a real deployment configures but a sandbox never does.
 * NOTE: NODE_ENV and MIAI_MODEL_MODE are deliberately NOT signals — the demo sandbox runs
 * NODE_ENV=production and a real model (e.g. openai), so neither distinguishes it from prod. A live
 * payment key means real money; a remote DATABASE_URL / oidc auth / http wallet mean a real backend —
 * none of which a sandbox has.
 */
export function productionRailSignals(): string[] {
  const signals: string[] = [];
  if ((process.env.MIAI_AUTH_MODE ?? "mock") === "oidc") signals.push("MIAI_AUTH_MODE=oidc");
  if ((process.env.MIAI_WALLET_MODE ?? "mock") === "http") signals.push("MIAI_WALLET_MODE=http");
  const dbUrl = (process.env.DATABASE_URL || process.env.MIAI_DATABASE_URL)?.trim();
  if (dbUrl && !/localhost|127\.0\.0\.1/.test(dbUrl)) signals.push("DATABASE_URL (remote)");
  if ((process.env.PAYSTACK_SECRET_KEY ?? "").startsWith("sk_live_")) {
    signals.push("PAYSTACK_SECRET_KEY (live)");
  }
  return signals;
}

/** Explicit dual-ack to run SANDBOX_MODE=1 alongside real rails (e.g. a persistent staging sandbox). */
export function sandboxInProdAllowed(): boolean {
  return envFlag("ALLOW_SANDBOX_IN_PROD") && envFlag(SANDBOX_IN_PROD_ACK_ENV);
}

/**
 * SANDBOX_MODE=1 disables every hardening check, so it must only run on a genuine sandbox. If it is
 * set while real production rails are configured, that is a leaked flag — refuse to boot (unless
 * explicitly dual-acked). Closes the single-flag master-bypass where a stray SANDBOX_MODE on the
 * production deployment would silently run mock auth/wallet with weak secrets and no real database.
 */
export function checkSandboxModeSafety(): HardeningCheck {
  if (process.env.SANDBOX_MODE !== "1") return { ok: true };
  if (sandboxInProdAllowed()) return { ok: true };
  const signals = productionRailSignals();
  if (signals.length === 0) return { ok: true };
  return {
    ok: false,
    errors: [
      `SANDBOX_MODE=1 disables all production hardening, but real rails are configured (${signals.join(", ")}). ` +
        `A leaked SANDBOX_MODE would boot this deployment on mock auth/wallet with weak secrets and no real database. ` +
        `Unset SANDBOX_MODE for production, or ${dualFlagHint("ALLOW_SANDBOX_IN_PROD", SANDBOX_IN_PROD_ACK_ENV)}.`,
    ],
  };
}

export function checkBootHardening(): HardeningCheck {
  // A sandbox is an isolated evaluation environment (mock rails, no real money/sends), so the
  // production hardening requirements — real rails, strong secrets, a production Postgres — don't
  // apply, and SANDBOX_MODE=1 relaxes them all. But FIRST confirm this really is a sandbox: a
  // SANDBOX_MODE flag leaked onto a deployment with real rails must fail closed, not relax.
  const sandbox = checkSandboxModeSafety();
  if (!sandbox.ok) return sandbox;
  if (process.env.SANDBOX_MODE === "1") return { ok: true };
  const secrets = checkProductionSecrets();
  const rails = checkProductionRails();
  const persistence = checkProductionPersistence();
  const errors = [
    ...(secrets.ok ? [] : secrets.errors),
    ...(rails.ok ? [] : rails.errors),
    ...(persistence.ok ? [] : persistence.errors),
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

function logMockRailsAlert(): void {
  if (!isProductionRuntime() || !mockRailsAllowed()) return;
  console.warn(
    JSON.stringify({
      level: "warn",
      event: "miai.mock_rails_enabled",
      message:
        "Production boot with mock auth/wallet/model — dual escape hatch acknowledged. Not for customer cutover.",
      ALLOW_MOCK_RAILS: "1",
      [MOCK_RAILS_ACK_ENV]: "1",
      MIAI_AUTH_MODE: process.env.MIAI_AUTH_MODE ?? "mock",
      MIAI_WALLET_MODE: process.env.MIAI_WALLET_MODE ?? "mock",
      MIAI_MODEL_MODE: process.env.MIAI_MODEL_MODE ?? "mock",
    }),
  );
}

function logEmbedStarAlert(): void {
  if (!isProductionRuntime() || !embedOriginStarAllowed()) return;
  console.warn(
    JSON.stringify({
      level: "warn",
      event: "miai.embed_origin_star_enabled",
      message: "Production boot allows EMBED_ALLOWED_ORIGINS=* — dual escape hatch acknowledged.",
      ALLOW_EMBED_ORIGIN_STAR: "1",
      [EMBED_STAR_ACK_ENV]: "1",
    }),
  );
}

/**
 * Warn (do not fail) when a real production deployment is running WITHOUT Upstash/Redis: rate limits
 * then live in a per-instance Map and are not shared across replicas / serverless instances —
 * largely bypassable at scale. Skipped for the sandbox (mock rails) and non-production, which are
 * single-instance by design.
 */
function logRateLimitDegradedAlert(): void {
  if (!isProductionRuntime() || mockRailsAllowed()) return;
  const redisConfigured = Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
  if (redisConfigured) return;
  console.warn(
    JSON.stringify({
      level: "warn",
      event: "miai.rate_limit_per_instance",
      message:
        "No Upstash/Redis configured — rate limiting is per-instance and NOT shared across replicas; largely bypassable at scale. Set UPSTASH_REDIS_REST_URL/TOKEN before running more than one replica.",
    }),
  );
}

/** Called from instrumentation.ts on Node server start. */
export function assertBootHardening(): void {
  const check = checkBootHardening();
  if (!check.ok) {
    for (const e of check.errors) console.error(`[security] ${e}`);
    // Throw in production — and whenever SANDBOX_MODE=1 has failed the safety check, regardless of
    // NODE_ENV: a sandbox flag leaked onto a deployment with real rails must never boot. (A genuine
    // sandbox passes checkBootHardening, so this only fires on the contradiction.)
    if (isProductionRuntime() || process.env.SANDBOX_MODE === "1") {
      throw new Error(
        `[security] Refusing to start — fix env or ${dualFlagHint("ALLOW_MOCK_RAILS", MOCK_RAILS_ACK_ENV)} for staging demos.\n- ${check.errors.join("\n- ")}`,
      );
    }
    return;
  }
  logMockRailsAlert();
  logEmbedStarAlert();
  logRateLimitDegradedAlert();
}

/**
 * Timing-safe compare for sink / bearer tokens.
 * Pure JS (no node:crypto) so this module stays webpack-safe if pulled into a client graph.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}
