/**
 * Fail closed independent of NODE_ENV. A prod image booted WITHOUT NODE_ENV=production used to pass
 * boot hardening yet still resolve a mock identity from x-user-id / x-workspace-id / x-roles headers
 * = anonymous cross-tenant access. resolveAuth now refuses the header-trusted mock identity whenever
 * real production rails are present without an explicit mock-rails acknowledgment — regardless of
 * NODE_ENV. Local dev, the SANDBOX_MODE demo, and staging's dual-acked mock rails stay working.
 */
import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";

const KEYS = [
  "MIAI_AUTH_MODE", "MIAI_WALLET_MODE", "DATABASE_URL", "MIAI_DATABASE_URL", "PAYSTACK_SECRET_KEY",
  "ALLOW_MOCK_RAILS", "I_UNDERSTAND_MOCK_RAILS_IN_PROD", "SANDBOX_MODE", "ALLOW_SANDBOX_IN_PROD",
  "I_UNDERSTAND_SANDBOX_IN_PROD", "NODE_ENV",
];
let saved;
beforeEach(() => { saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]])); for (const k of KEYS) delete process.env[k]; });
afterEach(() => { for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

async function trustworthy() {
  const m = await import("../src/lib/security-flags.ts");
  return m.mockRailsTrustworthy();
}
async function resolve(headers = {}, url = "https://app.test/api/rent") {
  const { resolveAuth } = await import("../src/lib/auth.ts");
  return resolveAuth(new Request(url, { headers }));
}

test("mockRailsTrustworthy: no rails → true (local dev)", async () => {
  assert.equal(await trustworthy(), true);
});

test("mockRailsTrustworthy: a real rail signal without ack → false, EVEN with NODE_ENV unset/development", async () => {
  process.env.MIAI_WALLET_MODE = "http"; // a production rail signal
  process.env.NODE_ENV = "development";
  assert.equal(await trustworthy(), false, "NODE_ENV plays no part — real rails without ack are untrusted");
});

test("mockRailsTrustworthy: real rail + dual mock-rails ack → true (staging)", async () => {
  process.env.DATABASE_URL = "postgres://user@db.example.com:5432/app"; // remote → a signal
  process.env.ALLOW_MOCK_RAILS = "1";
  process.env.I_UNDERSTAND_MOCK_RAILS_IN_PROD = "1";
  assert.equal(await trustworthy(), true);
});

test("mockRailsTrustworthy: SANDBOX_MODE + real rail + sandbox dual-ack → true", async () => {
  process.env.MIAI_WALLET_MODE = "http";
  process.env.SANDBOX_MODE = "1";
  process.env.ALLOW_SANDBOX_IN_PROD = "1";
  process.env.I_UNDERSTAND_SANDBOX_IN_PROD = "1";
  assert.equal(await trustworthy(), true);
});

test("resolveAuth: real rails + mock auth + no ack → refuses (headers ignored), NODE_ENV=development", async () => {
  process.env.MIAI_AUTH_MODE = "mock";
  process.env.MIAI_WALLET_MODE = "http";
  process.env.NODE_ENV = "development";
  await assert.rejects(
    () => resolve({ "x-user-id": "attacker", "x-workspace-id": "ws-victim", "x-roles": "owner,operator" }),
    (e) => e.status === 503 && /Mock auth refused/.test(e.message),
  );
});

test("resolveAuth: local dev (no rails) resolves the mock identity as before", async () => {
  process.env.MIAI_AUTH_MODE = "mock";
  const ctx = await resolve();
  assert.equal(ctx.mode, "mock");
  assert.deepEqual(ctx.roles, ["owner", "operator"]); // elevated default preserved for genuine dev
});

test("resolveAuth: staging dual-acked mock rails in production still resolves (path preserved)", async () => {
  process.env.MIAI_AUTH_MODE = "mock";
  process.env.DATABASE_URL = "postgres://user@db.example.com:5432/app";
  process.env.ALLOW_MOCK_RAILS = "1";
  process.env.I_UNDERSTAND_MOCK_RAILS_IN_PROD = "1";
  process.env.NODE_ENV = "production";
  const ctx = await resolve();
  assert.equal(ctx.mode, "mock");
  assert.deepEqual(ctx.roles, ["owner", "operator"]);
});
