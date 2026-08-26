import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mockRailsAllowed,
  embedOriginStarAllowed,
  checkProductionRails,
  checkProductionSecrets,
  checkProductionPersistence,
  checkBootHardening,
  checkSandboxModeSafety,
  productionRailSignals,
  sandboxInProdAllowed,
  isWeakSecret,
  timingSafeEqualString,
  assertBootHardening,
  MOCK_RAILS_ACK_ENV,
  EMBED_STAR_ACK_ENV,
  FILE_FALLBACK_ACK_ENV,
  PG_SSL_INSECURE_ACK_ENV,
  SANDBOX_IN_PROD_ACK_ENV,
} from "../src/lib/security-flags.ts";

const ENV_KEYS = [
  "NODE_ENV",
  "SANDBOX_MODE",
  "ALLOW_MOCK_RAILS",
  MOCK_RAILS_ACK_ENV,
  "ALLOW_EMBED_ORIGIN_STAR",
  EMBED_STAR_ACK_ENV,
  "ALLOW_FILE_FALLBACK_IN_PROD",
  FILE_FALLBACK_ACK_ENV,
  "PG_SSL_REJECT_UNAUTHORIZED",
  PG_SSL_INSECURE_ACK_ENV,
  "ALLOW_SANDBOX_IN_PROD",
  SANDBOX_IN_PROD_ACK_ENV,
  "DATABASE_URL",
  "MIAI_DATABASE_URL",
  "MIAI_AUTH_MODE",
  "MIAI_WALLET_MODE",
  "MIAI_MODEL_MODE",
  "PAYSTACK_SECRET_KEY",
  "OAUTH_TOKEN_SECRET",
  "OAUTH_STATE_SECRET",
  "EMBED_KEY_SECRET",
  "MIAI_SESSION_SECRET",
  "WEBHOOK_SINK_SECRET",
  "CRON_SECRET",
];

/** @type {Record<string, string | undefined>} */
let savedEnv = {};

function snapshotEnv() {
  savedEnv = {};
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
  }
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const val = savedEnv[key];
    if (val === undefined) delete process.env[key];
    else process.env[key] = val;
  }
}

function setEnv(/** @type {Record<string, string | undefined>} */ overrides) {
  for (const key of ENV_KEYS) {
    if (!(key in overrides)) continue;
    const val = overrides[key];
    if (val === undefined) delete process.env[key];
    else process.env[key] = val;
  }
}

describe("security boot hardening / dual flags", () => {
  beforeEach(() => snapshotEnv());
  afterEach(() => restoreEnv());

  it("mockRailsAllowed is false in production with no mock flags", () => {
    setEnv({ NODE_ENV: "production" });
    delete process.env.ALLOW_MOCK_RAILS;
    delete process.env[MOCK_RAILS_ACK_ENV];
    assert.equal(mockRailsAllowed(), false);
  });

  it("checkProductionRails fails in production when modes are mock", () => {
    setEnv({
      NODE_ENV: "production",
      MIAI_AUTH_MODE: "mock",
      MIAI_WALLET_MODE: "mock",
      MIAI_MODEL_MODE: "mock",
    });
    delete process.env.ALLOW_MOCK_RAILS;
    delete process.env[MOCK_RAILS_ACK_ENV];
    const result = checkProductionRails();
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.includes("MIAI_AUTH_MODE=mock")));
    }
  });

  it("checkProductionRails fails when only ALLOW_MOCK_RAILS is set (incomplete hatch)", () => {
    setEnv({
      NODE_ENV: "production",
      ALLOW_MOCK_RAILS: "1",
      MIAI_AUTH_MODE: "oidc",
      MIAI_WALLET_MODE: "http",
      MIAI_MODEL_MODE: "openai",
    });
    delete process.env[MOCK_RAILS_ACK_ENV];
    const result = checkProductionRails();
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.includes("Mock rails escape hatch incomplete")));
    }
  });

  it("mockRailsAllowed is true when both mock-rails flags are set", () => {
    setEnv({
      NODE_ENV: "production",
      ALLOW_MOCK_RAILS: "1",
      [MOCK_RAILS_ACK_ENV]: "1",
    });
    assert.equal(mockRailsAllowed(), true);
  });

  it("embedOriginStarAllowed requires both embed star dual flags", () => {
    setEnv({ NODE_ENV: "production" });
    delete process.env.ALLOW_EMBED_ORIGIN_STAR;
    delete process.env[EMBED_STAR_ACK_ENV];
    assert.equal(embedOriginStarAllowed(), false);

    setEnv({ ALLOW_EMBED_ORIGIN_STAR: "1" });
    delete process.env[EMBED_STAR_ACK_ENV];
    assert.equal(embedOriginStarAllowed(), false);

    setEnv({
      ALLOW_EMBED_ORIGIN_STAR: "1",
      [EMBED_STAR_ACK_ENV]: "1",
    });
    assert.equal(embedOriginStarAllowed(), true);
  });

  it("checkProductionRails fails when only ALLOW_EMBED_ORIGIN_STAR is set", () => {
    setEnv({
      NODE_ENV: "production",
      ALLOW_EMBED_ORIGIN_STAR: "1",
      ALLOW_MOCK_RAILS: "1",
      [MOCK_RAILS_ACK_ENV]: "1",
    });
    delete process.env[EMBED_STAR_ACK_ENV];
    const result = checkProductionRails();
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.includes("Embed origin * escape hatch incomplete")));
    }
  });

  it("isWeakSecret flags dev default and accepts long random secrets", () => {
    assert.equal(isWeakSecret("dev-only-change-me"), true);
    assert.equal(
      isWeakSecret("xK9mP2vL8nQ4wR7tY1uI0oA3sD6fG5hJ"),
      false,
    );
  });

  it("timingSafeEqualString compares equal strings and rejects length mismatch", () => {
    assert.equal(timingSafeEqualString("ab", "ab"), true);
    assert.equal(timingSafeEqualString("ab", "a"), false);
  });

  it("checkBootHardening aggregates production failures", () => {
    setEnv({
      NODE_ENV: "production",
      MIAI_AUTH_MODE: "mock",
    });
    delete process.env.ALLOW_MOCK_RAILS;
    delete process.env[MOCK_RAILS_ACK_ENV];
    const result = checkBootHardening();
    assert.equal(result.ok, false);
  });

  it("checkProductionSecrets requires strong secrets when OIDC is on", () => {
    setEnv({
      NODE_ENV: "development",
      MIAI_AUTH_MODE: "oidc",
      OAUTH_TOKEN_SECRET: "dev-only-change-me",
    });
    const result = checkProductionSecrets();
    assert.equal(result.ok, false);
  });

  it("assertBootHardening throws in production when checks fail", () => {
    setEnv({
      NODE_ENV: "production",
      MIAI_AUTH_MODE: "mock",
      MIAI_WALLET_MODE: "mock",
      MIAI_MODEL_MODE: "mock",
    });
    delete process.env.ALLOW_MOCK_RAILS;
    delete process.env[MOCK_RAILS_ACK_ENV];
    assert.throws(() => assertBootHardening(), /Refusing to start/);
  });

  it("checkProductionPersistence requires DATABASE_URL in production", () => {
    setEnv({ NODE_ENV: "production" });
    delete process.env.DATABASE_URL;
    delete process.env.MIAI_DATABASE_URL;
    delete process.env.ALLOW_FILE_FALLBACK_IN_PROD;
    delete process.env[FILE_FALLBACK_ACK_ENV];
    const result = checkProductionPersistence();
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.includes("DATABASE_URL required")));
    }
  });

  it("checkProductionPersistence blocks insecure PG SSL without ACK", () => {
    setEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:pass@db.example.com:5432/app",
      PG_SSL_REJECT_UNAUTHORIZED: "0",
    });
    delete process.env[PG_SSL_INSECURE_ACK_ENV];
    const result = checkProductionPersistence();
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.includes("PG_SSL_REJECT_UNAUTHORIZED=0")));
    }
  });

  describe("SANDBOX_MODE leak guard", () => {
    // The demo sandbox legitimately runs SANDBOX_MODE=1 with mock rails, NODE_ENV=production, and a
    // REAL model (openai) — it must still boot. A SANDBOX_MODE flag leaked onto a deployment with
    // real rails (oidc / http wallet / remote db / live payment key) must fail closed.
    const cleanSandbox = {
      SANDBOX_MODE: "1",
      NODE_ENV: "production",
      MIAI_AUTH_MODE: "mock",
      MIAI_WALLET_MODE: "mock",
      MIAI_MODEL_MODE: "openai", // real model — must NOT count as a prod signal
      DATABASE_URL: undefined,
      MIAI_DATABASE_URL: undefined,
      PAYSTACK_SECRET_KEY: undefined,
      ALLOW_SANDBOX_IN_PROD: undefined,
      [SANDBOX_IN_PROD_ACK_ENV]: undefined,
    };

    it("a genuine sandbox (mock rails, real model, no db) still boots", () => {
      setEnv(cleanSandbox);
      assert.deepEqual(productionRailSignals(), []);
      assert.equal(checkSandboxModeSafety().ok, true);
      assert.equal(checkBootHardening().ok, true);
      assert.doesNotThrow(() => assertBootHardening());
    });

    it("SANDBOX_MODE=1 + oidc auth fails closed", () => {
      setEnv({ ...cleanSandbox, MIAI_AUTH_MODE: "oidc" });
      const r = checkSandboxModeSafety();
      assert.equal(r.ok, false);
      if (!r.ok) {
        assert.ok(r.errors.some((e) => e.includes("SANDBOX_MODE=1 disables all production hardening")));
      }
      assert.equal(checkBootHardening().ok, false);
    });

    it("SANDBOX_MODE=1 + http wallet fails closed", () => {
      setEnv({ ...cleanSandbox, MIAI_WALLET_MODE: "http" });
      assert.equal(checkSandboxModeSafety().ok, false);
    });

    it("SANDBOX_MODE=1 + remote DATABASE_URL fails closed", () => {
      setEnv({ ...cleanSandbox, DATABASE_URL: "postgresql://db.example.com:5432/app" });
      assert.equal(checkSandboxModeSafety().ok, false);
    });

    it("SANDBOX_MODE=1 + live Paystack key fails closed", () => {
      // built by concatenation so the literal isn't a scannable secret pattern
      setEnv({ ...cleanSandbox, PAYSTACK_SECRET_KEY: "sk_live_" + "0".repeat(24) });
      assert.equal(checkSandboxModeSafety().ok, false);
    });

    it("a test Paystack key does NOT trip the guard", () => {
      setEnv({ ...cleanSandbox, PAYSTACK_SECRET_KEY: "sk_test_" + "0".repeat(24) });
      assert.deepEqual(productionRailSignals(), []);
      assert.equal(checkSandboxModeSafety().ok, true);
    });

    it("throws regardless of NODE_ENV — a leaked sandbox flag on non-prod must not boot", () => {
      setEnv({ ...cleanSandbox, NODE_ENV: "development", MIAI_AUTH_MODE: "oidc" });
      assert.throws(() => assertBootHardening(), /Refusing to start/);
    });

    it("explicit dual-ack lets SANDBOX_MODE run alongside real rails", () => {
      setEnv({
        ...cleanSandbox,
        MIAI_AUTH_MODE: "oidc",
        ALLOW_SANDBOX_IN_PROD: "1",
        [SANDBOX_IN_PROD_ACK_ENV]: "1",
      });
      assert.equal(sandboxInProdAllowed(), true);
      assert.equal(checkSandboxModeSafety().ok, true);
      assert.equal(checkBootHardening().ok, true);
    });

    it("half-configured ack does not enable the override", () => {
      setEnv({ ...cleanSandbox, MIAI_AUTH_MODE: "oidc", ALLOW_SANDBOX_IN_PROD: "1" });
      delete process.env[SANDBOX_IN_PROD_ACK_ENV];
      assert.equal(sandboxInProdAllowed(), false);
      assert.equal(checkSandboxModeSafety().ok, false);
    });
  });

  describe("checkProductionSecrets — session / sink / cron secrets", () => {
    // Long enough + not a dev default → strong per isWeakSecret; low entropy so it isn't a scannable secret.
    const STRONG = "strong-enough-secret-for-tests";

    it("flags each of them when SET but weak", () => {
      setEnv({
        MIAI_AUTH_MODE: "oidc",
        OAUTH_TOKEN_SECRET: STRONG,
        MIAI_SESSION_SECRET: "dev-only-change-me",
        WEBHOOK_SINK_SECRET: "short",
        CRON_SECRET: "dev-only-change-me",
      });
      const r = checkProductionSecrets();
      assert.equal(r.ok, false);
      if (!r.ok) {
        assert.ok(r.errors.some((e) => e.includes("MIAI_SESSION_SECRET")));
        assert.ok(r.errors.some((e) => e.includes("WEBHOOK_SINK_SECRET")));
        assert.ok(r.errors.some((e) => e.includes("CRON_SECRET")));
      }
    });

    it("does NOT require them when unset (safe fallbacks), given a strong OAUTH_TOKEN_SECRET", () => {
      setEnv({ MIAI_AUTH_MODE: "oidc", OAUTH_TOKEN_SECRET: STRONG });
      for (const k of ["MIAI_SESSION_SECRET", "WEBHOOK_SINK_SECRET", "CRON_SECRET", "OAUTH_STATE_SECRET", "EMBED_KEY_SECRET"]) {
        delete process.env[k];
      }
      assert.equal(checkProductionSecrets().ok, true);
    });

    it("passes when they are set and strong", () => {
      setEnv({
        MIAI_AUTH_MODE: "oidc",
        OAUTH_TOKEN_SECRET: STRONG,
        MIAI_SESSION_SECRET: STRONG,
        WEBHOOK_SINK_SECRET: STRONG,
        CRON_SECRET: STRONG,
      });
      for (const k of ["OAUTH_STATE_SECRET", "EMBED_KEY_SECRET"]) delete process.env[k];
      assert.equal(checkProductionSecrets().ok, true);
    });
  });
});
