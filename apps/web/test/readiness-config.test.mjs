import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { missingRuntimeConfig } from "../src/lib/readiness-config.ts";
import { checkProductionRails } from "../src/lib/security-flags.ts";
import { isPublicApiPath } from "../src/lib/public-paths.ts";
import { GET as live } from "../src/app/api/health/live/route.ts";

const keys = ["NODE_ENV", "MIAI_AUTH_MODE", "MIAI_WALLET_MODE", "MIAI_MODEL_MODE", "MIAI_OIDC_ISSUER", "MIAI_WALLET_API_URL", "MIAI_MODEL_GATEWAY_URL", "AZURE_OPENAI_API_KEY", "AZURE_OPENAI_ENDPOINT", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];
let saved;
beforeEach(() => { saved = Object.fromEntries(keys.map(k => [k, process.env[k]])); for (const k of keys) delete process.env[k]; });
afterEach(() => { for (const k of keys) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

test("missing provider credentials and partial Redis configuration are unready", () => {
  assert.deepEqual(missingRuntimeConfig(), []);
  for (const [mode, key] of [["openai", "OPENAI_API_KEY"], ["azure", "AZURE_OPENAI_ENDPOINT"], ["anthropic", "ANTHROPIC_API_KEY"], ["claude", "ANTHROPIC_API_KEY"], ["gateway", "MIAI_MODEL_GATEWAY_URL"], ["http", "MIAI_MODEL_GATEWAY_URL"]]) {
    process.env.MIAI_MODEL_MODE = mode;
    assert.ok(missingRuntimeConfig().includes(key), mode);
  }
  process.env.MIAI_MODEL_MODE = "mock";
  process.env.MIAI_AUTH_MODE = "oidc";
  process.env.MIAI_WALLET_MODE = "http";
  assert.deepEqual(missingRuntimeConfig(), ["MIAI_OIDC_ISSUER", "MIAI_WALLET_API_URL"]);
  process.env.MIAI_OIDC_ISSUER = "https://issuer.test";
  process.env.MIAI_WALLET_API_URL = "https://wallet.test";
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
  assert.ok(missingRuntimeConfig().some(k => k.includes("incomplete pair")));
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  assert.deepEqual(missingRuntimeConfig(), []);
});

test("misspelled rail modes fail production checks instead of selecting mock adapters", () => {
  process.env.NODE_ENV = "production";
  process.env.MIAI_AUTH_MODE = "OIDC";
  process.env.MIAI_WALLET_MODE = "HTTP";
  process.env.MIAI_MODEL_MODE = "Azure";
  const check = checkProductionRails();
  assert.equal(check.ok, false);
  assert.equal(check.errors.filter(x => x.includes("unsupported")).length, 3);
});

test("liveness stays public and independent of missing partner configuration", async () => {
  process.env.MIAI_AUTH_MODE = "oidc";
  process.env.MIAI_MODEL_MODE = "azure";
  assert.equal(isPublicApiPath("/api/health/live"), true);
  assert.equal(isPublicApiPath("/api/health/private"), false);
  assert.equal(live().status, 200);
  assert.deepEqual(await live().json(), { status: "ok" });
});
