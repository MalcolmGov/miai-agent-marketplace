/**
 * Connector OAuth state single-use. The signed state is stateless (HMAC + ~15-min TTL), so a captured
 * state could be replayed until it expires. consumeOAuthStateNonce records each nonce so the callback
 * rejects a replay before the provider token exchange runs. File/in-memory fallback (no DATABASE_URL),
 * mirroring the Telegram setup-nonce single-use test.
 */
import assert from "node:assert/strict";
import { test, before, after } from "node:test";

const saved = {};
let store;

before(async () => {
  for (const k of ["DATABASE_URL", "NODE_ENV"]) saved[k] = process.env[k];
  delete process.env.DATABASE_URL; // exercise the in-memory ledger fallback
  process.env.NODE_ENV = "test";
  store = await import("../src/lib/oauth-state-store.ts");
});
after(() => {
  for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
});

test("first use returns true, an immediate replay returns false", async () => {
  const exp = Date.now() + 15 * 60 * 1000;
  assert.equal(await store.consumeOAuthStateNonce("nonce-A", exp), true, "first use accepted");
  assert.equal(await store.consumeOAuthStateNonce("nonce-A", exp), false, "replay rejected");
  assert.equal(await store.consumeOAuthStateNonce("nonce-A", exp), false, "still rejected");
});

test("a distinct nonce is independent", async () => {
  const exp = Date.now() + 15 * 60 * 1000;
  assert.equal(await store.consumeOAuthStateNonce("nonce-B", exp), true);
  assert.equal(await store.consumeOAuthStateNonce("nonce-C", exp), true, "a different flow is not blocked");
});

test("an empty nonce is rejected", async () => {
  assert.equal(await store.consumeOAuthStateNonce("", Date.now() + 1000), false);
});

test("an expired nonce is pruned, so re-minting the same id later works (no permanent lockout)", async () => {
  const past = Date.now() - 1000; // already expired
  assert.equal(await store.consumeOAuthStateNonce("nonce-exp", past), true, "recorded (even if already past)");
  // A later consume with a fresh expiry prunes the expired row and treats it as first-use again.
  assert.equal(await store.consumeOAuthStateNonce("nonce-exp", Date.now() + 15 * 60 * 1000), true);
});
