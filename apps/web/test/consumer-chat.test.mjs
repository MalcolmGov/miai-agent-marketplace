/**
 * Consumer line: identity → wallet mapping, agent allowlist, and metering onto the consumer's
 * own wallet. Runs against the file-backed store (no DATABASE_URL) with a temp rentals path and
 * the mock model + mock wallet, so it never touches repo data or spends tokens.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";

const TMP = path.join(os.tmpdir(), `miai-consumer-test-${process.pid}.json`);
// Repo-root/data/catalog, resolved from this file so the test is cwd-independent (catalogDir()
// otherwise assumes cwd is apps/web via a relative ../../data/catalog).
const CATALOG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../data/catalog");
const saved = {};
let consumer;
let turn;
let wallet;

before(async () => {
  for (const k of ["RENTAL_STORE_PATH", "DATABASE_URL", "MIAI_MODEL_MODE", "MIAI_WALLET_MODE", "NODE_ENV", "CATALOG_DIR"]) {
    saved[k] = process.env[k];
  }
  process.env.RENTAL_STORE_PATH = TMP;
  process.env.CATALOG_DIR = CATALOG;
  delete process.env.DATABASE_URL;
  delete process.env.MIAI_MODEL_MODE; // mock model
  delete process.env.MIAI_WALLET_MODE; // mock wallet
  process.env.NODE_ENV = "test";
  consumer = await import("../src/lib/consumer.ts");
  turn = await import("../src/lib/consumer-turn.ts");
  wallet = await import("@miai/wallet-adapter");
  wallet.resetWalletAdapterForTests();
});

after(async () => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await fs.rm(TMP, { force: true });
});

describe("consumer identity + wallet mapping", () => {
  it("maps a consumer to their own wallet id (the account id)", () => {
    assert.equal(consumer.walletIdForConsumer({ userId: "alice" }), "alice");
    assert.equal(consumer.walletIdForConsumer({ userId: "usr_123" }), "usr_123");
  });

  it("only vetted consumer agents are runnable", () => {
    assert.equal(consumer.isConsumerAgent("personal-assistant"), true);
    assert.equal(consumer.isConsumerAgent("front-desk"), false);
    assert.equal(consumer.isConsumerAgent("us-customer-support"), false);
    assert.ok(consumer.consumerAgentIds().includes("personal-assistant"));
    assert.equal(consumer.DEFAULT_CONSUMER_AGENT, "personal-assistant");
  });
});

describe("runConsumerTurn: gates", () => {
  it("rejects a non-consumer agent id with 403", async () => {
    const r = await turn.runConsumerTurn({
      consumerId: "u1",
      walletId: "u1",
      agentId: "front-desk",
      message: "hi",
      rateLimitOk: true,
    });
    assert.equal(r.ok, false);
    assert.equal(r.status, 403);
  });

  it("rejects an empty message with 400", async () => {
    const r = await turn.runConsumerTurn({
      consumerId: "u1",
      walletId: "u1",
      agentId: "personal-assistant",
      message: "   ",
      rateLimitOk: true,
    });
    assert.equal(r.ok, false);
    assert.equal(r.status, 400);
  });

  it("honours the rate-limit gate with 429", async () => {
    const r = await turn.runConsumerTurn({
      consumerId: "u1",
      walletId: "u1",
      agentId: "personal-assistant",
      message: "hi",
      rateLimitOk: false,
      rateLimitRetryAfterSec: 42,
    });
    assert.equal(r.ok, false);
    assert.equal(r.status, 429);
    assert.equal(r.retryAfterSec, 42);
  });
});

describe("runConsumerTurn: meters onto the consumer's wallet", () => {
  it("runs the personal assistant and debits the consumer-keyed wallet", async () => {
    wallet.resetWalletAdapterForTests();
    const walletId = "alice";
    const before = (await wallet.createWalletAdapter().getBalance(walletId)).tokens;

    const r1 = await turn.runConsumerTurn({
      consumerId: walletId,
      walletId,
      agentId: "personal-assistant",
      message: "Hey, can you help me today?",
      sessionId: "s1",
      rateLimitOk: true,
    });
    assert.equal(r1.ok, true, r1.ok ? "" : `turn failed: ${r1.error}`);
    assert.equal(typeof r1.assistantMessage, "string");
    assert.ok(r1.assistantMessage.length > 0, "assistant produced a reply");
    assert.equal(r1.walletId, walletId);
    assert.ok(r1.tokensDebited > 0, "usage was metered");

    const afterOne = (await wallet.createWalletAdapter().getBalance(walletId)).tokens;
    assert.ok(afterOne < before, "consumer wallet balance dropped after a turn");

    // A second turn debits further — proves ongoing metering onto the same consumer wallet.
    const r2 = await turn.runConsumerTurn({
      consumerId: walletId,
      walletId,
      agentId: "personal-assistant",
      message: "What's on my plate?",
      sessionId: "s1",
      rateLimitOk: true,
    });
    assert.equal(r2.ok, true);
    const afterTwo = (await wallet.createWalletAdapter().getBalance(walletId)).tokens;
    assert.ok(afterTwo < afterOne, "second turn debited the wallet again");
  });

  it("keeps two consumers' wallets independent", async () => {
    wallet.resetWalletAdapterForTests();
    const start = (await wallet.createWalletAdapter().getBalance("bob")).tokens;
    await turn.runConsumerTurn({
      consumerId: "carol",
      walletId: "carol",
      agentId: "personal-assistant",
      message: "hello",
      rateLimitOk: true,
    });
    // carol's turn must not touch bob's balance
    const bobAfter = (await wallet.createWalletAdapter().getBalance("bob")).tokens;
    assert.equal(bobAfter, start, "one consumer's usage never debits another's wallet");
  });
});
