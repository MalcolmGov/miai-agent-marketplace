/**
 * P0-2 regression: the embed/app (B2B) channel must scope the derived wallet-debit idempotency key
 * per visitor session. `turnDebitKey` only folds in the session when the wrapper forwards it; the
 * consumer wrapper does, and the channel wrapper must too. Without it, two different embed visitors
 * whose first message is identical (e.g. a suggested opening prompt) derive the SAME key, and the
 * wallet dedups the second to a free turn — a systematic under-charge on the embed surface.
 *
 * This test drives two distinct-session channel turns with an identical first message and asserts
 * BOTH debit the workspace wallet. It fails on the pre-fix code (second turn deduped to 0).
 *
 * File-backed store (no DATABASE_URL), mock model + mock wallet, temp rentals path.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const RENTAL_TMP = path.join(os.tmpdir(), `miai-channel-meter-${process.pid}.json`);
const CATALOG = path.resolve(here, "../../../data/catalog");
const CONSUMER_CAT = path.resolve(here, "../../../data/catalog-consumer");
const saved = {};
let store;
let channel;
let wallet;

before(async () => {
  for (const k of ["EMBED_KEY_SECRET", "RENTAL_STORE_PATH", "DATABASE_URL", "MIAI_MODEL_MODE", "MIAI_WALLET_MODE", "NODE_ENV", "CATALOG_DIR", "CONSUMER_CATALOG_DIR"]) {
    saved[k] = process.env[k];
  }
  process.env.EMBED_KEY_SECRET = "test-embed-secret-0123456789abcdef";
  process.env.RENTAL_STORE_PATH = RENTAL_TMP;
  process.env.CATALOG_DIR = CATALOG;
  process.env.CONSUMER_CATALOG_DIR = CONSUMER_CAT;
  delete process.env.DATABASE_URL;
  delete process.env.MIAI_MODEL_MODE; // mock model
  delete process.env.MIAI_WALLET_MODE; // mock wallet
  process.env.NODE_ENV = "test";
  store = await import("../src/lib/store.ts");
  channel = await import("../src/lib/channel-turn.ts");
  wallet = await import("@miai/wallet-adapter");
  wallet.resetWalletAdapterForTests();
});

after(async () => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await fs.rm(RENTAL_TMP, { force: true });
});

describe("channel metering (P0-2): distinct visitor sessions are charged, not deduped to free", () => {
  it("charges a second visitor's identical first message instead of dedup-to-free", async () => {
    wallet.resetWalletAdapterForTests();
    const ws = "ws-embed";
    const agent = "africa-front-desk";
    const rental = await store.upsertWorkspaceAgent(ws, agent, { state: "live" });
    const key = rental.publicKey;
    assert.ok(key, "embed key minted");

    const w = wallet.createWalletAdapter();
    const start = (await w.getBalance(ws)).tokens;

    const opener = "What are your opening hours?";
    const send = (sessionId) =>
      channel.runChannelTurn({ channel: "embed", key, message: opener, sessionId, rateLimitOk: true });

    // Visitor 1 — first turn of a fresh session.
    const r1 = await send("visitor-1");
    assert.equal(r1.ok, true, r1.ok ? "" : `visitor 1 failed: ${r1.error}`);
    assert.ok(r1.tokensDebited > 0, "visitor 1 is metered");
    const afterOne = (await w.getBalance(ws)).tokens;
    assert.ok(afterOne < start, "the workspace wallet debited for visitor 1");

    // Visitor 2 — a DIFFERENT session, IDENTICAL first message. Must be charged, not deduped free.
    const r2 = await send("visitor-2");
    assert.equal(r2.ok, true, r2.ok ? "" : `visitor 2 failed: ${r2.error}`);
    assert.ok(
      r2.tokensDebited > 0,
      "a second visitor's identical first message is charged, not deduped to a free turn",
    );
    const afterTwo = (await w.getBalance(ws)).tokens;
    assert.ok(afterTwo < afterOne, "the workspace wallet debited again for visitor 2");
  });
});
