const DEV_DEFAULT_SECRET = "dev-only-change-me";

/** Second confirmation required with ALLOW_MOCK_RAILS in production. */
export const MOCK_RAILS_ACK_ENV = "I_UNDERSTAND_MOCK_RAILS_IN_PROD";
/** Second confirmation required with ALLOW_EMBED_ORIGIN_STAR in production. */
export const EMBED_STAR_ACK_ENV = "I_UNDERSTAND_EMBED_ORIGIN_STAR";
/** Second confirmation required with ALLOW_FILE_FALLBACK_IN_PROD. */
export const FILE_FALLBACK_ACK_ENV = "I_UNDERSTAND_FILE_FALLBACK_IN_PROD";
/** Second confirmation required when PG_SSL_REJECT_UNAUTHORIZED=0 in production. */
export const PG_SSL_INSECURE_ACK_ENV = "I_UNDERSTAND_PG_SSL_INSECURE";

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

export function checkBootHardening(): HardeningCheck {
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

/** Called from instrumentation.ts on Node server start. */
export function assertBootHardening(): void {
  const check = checkBootHardening();
  if (!check.ok) {
    for (const e of check.errors) console.error(`[security] ${e}`);
    if (isProductionRuntime()) {
      throw new Error(
        `[security] Refusing to start — fix env or ${dualFlagHint("ALLOW_MOCK_RAILS", MOCK_RAILS_ACK_ENV)} for staging demos.\n- ${check.errors.join("\n- ")}`,
      );
    }
    return;
  }
  logMockRailsAlert();
  logEmbedStarAlert();
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
