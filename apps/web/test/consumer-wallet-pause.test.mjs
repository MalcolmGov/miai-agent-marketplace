/**
 * P0-1 regression: the consumer line must not serve unlimited free turns at a positive-but-
 * insufficient "dust" balance. The runtime only auto-pauses at balance <= 0, so once a wallet
 * settles above 0 but below one turn's cost, each turn's debit fails (deducting nothing) yet the
 * answer is still served. B2B bounds that to one free answer by persisting paused_no_tokens; this
 * test proves the consumer line now does too — one grace answer, then hard-pause until a top-up.
 *
 * Runs on the file-backed stores (no DATABASE_URL) with the mock model + mock wallet, and points the
 * pause store at a temp file so it never touches repo data or spends tokens.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const RENTAL_TMP = path.join(os.tmpdir(), `miai-pause-rental-${process.pid}.json`);
const PAUSE_TMP = path.join(os.tmpdir(), `miai-pause-marker-${process.pid}.json`);
const CATALOG = path.resolve(here, "../../../data/catalog");
const CONSUMER_CAT = path.resolve(here, "../../../data/catalog-consumer");
const saved = {};
let turn;
let wallet;
let pause;

before(async () => {
  for (const k of ["RENTAL_STORE_PATH", "CONSUMER_WALLET_PAUSE_STORE_PATH", "DATABASE_URL", "MIAI_MODEL_MODE", "MIAI_WALLET_MODE", "NODE_ENV", "CATALOG_DIR", "CONSUMER_CATALOG_DIR"]) {
    saved[k] = process.env[k];
  }
  process.env.RENTAL_STORE_PATH = RENTAL_TMP;
  process.env.CONSUMER_WALLET_PAUSE_STORE_PATH = PAUSE_TMP;
  process.env.CATALOG_DIR = CATALOG;
  process.env.CONSUMER_CATALOG_DIR = CONSUMER_CAT;
  delete process.env.DATABASE_URL;
  delete process.env.MIAI_MODEL_MODE; // mock model
  delete process.env.MIAI_WALLET_MODE; // mock wallet
  process.env.NODE_ENV = "test";
  turn = await import("../src/lib/consumer-turn.ts");
  wallet = await import("@miai/wallet-adapter");
  pause = await import("../src/lib/consumer-wallet-pause-store.ts");
  wallet.resetWalletAdapterForTests();
});

after(async () => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await fs.rm(RENTAL_TMP, { force: true });
  await fs.rm(PAUSE_TMP, { force: true });
});

describe("consumer wallet pause (P0-1): one free answer at a dust balance, then hard-pause", () => {
  it("serves once, records the pause, hard-pauses the next turn, and lifts on top-up", async () => {
    wallet.resetWalletAdapterForTests();
    const w = wallet.createWalletAdapter();
    const walletId = "dust-user";
    const agentId = "personal-assistant";

    // Drain to a positive-but-insufficient dust balance (10 > 0, so the runtime's own <=0 gate does
    // not fire — this exercises the new marker path, not the empty-wallet path).
    const start = (await w.getBalance(walletId)).tokens;
    await w.debit({ workspaceId: walletId, amount: start - 10, idempotencyKey: "drain", reason: "test-drain" });
    assert.equal((await w.getBalance(walletId)).tokens, 10, "drained to a dust balance");
    assert.equal(await pause.getWalletPausedBalance(walletId), null, "not paused yet");

    const send = (message, sessionId) =>
      turn.runConsumerTurn({ consumerId: walletId, walletId, agentId, message, sessionId, rateLimitOk: true });

    // Turn 1: the model runs, the debit can't be covered -> one grace answer, paused, nothing debited.
    const r1 = await send("can you help me?", "d1");
    assert.equal(r1.ok, true, r1.ok ? "" : `turn 1 failed: ${r1.error}`);
    assert.equal(r1.paused, true, "an unaffordable turn pauses");
    assert.equal(r1.tokensDebited, 0, "a failed debit deducts nothing");
    assert.ok(r1.assistantMessage.length > 0, "one grace answer is served");
    assert.equal((await w.getBalance(walletId)).tokens, 10, "balance is unchanged by the failed debit");
    assert.equal(await pause.getWalletPausedBalance(walletId), 10, "the pause is recorded at the dust balance");

    // Turn 2 (SAME dust balance): must hard-pause up front — no model call, no new turn in history.
    const r2 = await send("are you there?", "d1");
    assert.equal(r2.paused, true, "still paused at the dust balance");
    assert.equal(r2.tokensDebited, 0, "nothing debited while paused");
    assert.equal(r2.messages.length, r1.messages.length, "hard-pause added no new turn to the transcript");
    assert.equal((await w.getBalance(walletId)).tokens, 10, "balance still unchanged");

    // Even a brand-new session (fresh history) stays paused — the marker is per-wallet, not per-session.
    const r2b = await send("hello from a new tab", "d2");
    assert.equal(r2b.paused, true, "a new session does not reset the pause");
    assert.equal(r2b.tokensDebited, 0, "no free turn via a fresh session");

    // Top up: the pause lifts and turns are metered again.
    await w.topUp({ workspaceId: walletId, usdAmount: 20, packageId: "20" });
    assert.ok((await w.getBalance(walletId)).tokens > 10, "top-up credited the wallet");
    const r3 = await send("thanks, let's continue", "d1");
    assert.equal(r3.ok, true, r3.ok ? "" : `post-topup turn failed: ${r3.error}`);
    assert.equal(r3.paused, false, "the top-up lifts the pause");
    assert.ok(r3.tokensDebited > 0, "turns are metered again after top-up");
    assert.equal(await pause.getWalletPausedBalance(walletId), null, "the pause marker is cleared after top-up");
  });
});
