/**
 * Mock + HttpWalletAdapter contract tests (no live MIAI credentials).
 * Run: pnpm --filter @miai/wallet-adapter test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MockWalletAdapter,
  HttpWalletAdapter,
  estimateTurnTokens,
} from "../dist/index.js";

test("mock debit insufficient → paused", async () => {
  const w = new MockWalletAdapter(100);
  const r = await w.debit({
    workspaceId: "ws",
    amount: 200,
    idempotencyKey: "k1",
    reason: "test",
  });
  assert.equal(r.ok, false);
  assert.equal(r.paused, true);
  assert.equal(r.balance, 100);
});

test("mock debit idempotent", async () => {
  const w = new MockWalletAdapter(1_000);
  const req = {
    workspaceId: "ws",
    amount: 100,
    idempotencyKey: "same",
    reason: "test",
  };
  const a = await w.debit(req);
  const b = await w.debit(req);
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.equal(a.balance, b.balance);
  assert.equal((await w.getBalance("ws")).tokens, 900);
});

test("http debit 402 → paused DebitResult (no throw)", async () => {
  const fetchImpl = async () =>
    new Response(JSON.stringify({ balance: 12, error: "Insufficient tokens" }), {
      status: 402,
      headers: { "content-type": "application/json" },
    });
  const w = new HttpWalletAdapter("https://wallet.test", "key", fetchImpl);
  const r = await w.debit({
    workspaceId: "ws",
    amount: 50,
    idempotencyKey: "i1",
    reason: "chat",
  });
  assert.equal(r.ok, false);
  assert.equal(r.paused, true);
  assert.equal(r.balance, 12);
});

test("http debit 500 throws", async () => {
  const fetchImpl = async () => new Response("nope", { status: 500 });
  const w = new HttpWalletAdapter("https://wallet.test", "key", fetchImpl);
  await assert.rejects(
    () =>
      w.debit({
        workspaceId: "ws",
        amount: 1,
        idempotencyKey: "i2",
        reason: "chat",
      }),
    /Wallet API 500/,
  );
});

test("estimateTurnTokens scales by model", () => {
  const flash = estimateTurnTokens("gemini-flash", 400, 400);
  const opus = estimateTurnTokens("claude-opus", 400, 400);
  assert.ok(opus > flash);
});
