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
  TOPUP_PACKAGES,
  TOPUP_TOKENS,
  usdForPackage,
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
  // The fresh debit did not flag deduped; the replay does, so the caller can report tokensDebited:0
  // instead of overstating a charge the wallet never applied.
  assert.notEqual(a.deduped, true, "the first debit is a real charge, not a dedup");
  assert.equal(b.deduped, true, "the replay is flagged deduped (balance unchanged)");
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

test("top-up packages cover all six USD tiers, ascending", () => {
  assert.deepEqual(
    TOPUP_PACKAGES.map((p) => p.id),
    ["5", "10", "20", "50", "100", "200"],
  );
  // The numeric id IS the USD amount.
  for (const p of TOPUP_PACKAGES) {
    assert.equal(p.usd, usdForPackage(p.id));
    assert.equal(p.tokens, TOPUP_TOKENS[p.id]);
    assert.ok(p.tokens > 0);
  }
  // Bigger packages give a strictly better token-per-dollar rate (volume bonus).
  const rates = TOPUP_PACKAGES.map((p) => p.tokens / p.usd);
  for (let i = 1; i < rates.length; i++) assert.ok(rates[i] > rates[i - 1]);
});

test("mock top-up credits the package's tokens", async () => {
  const w = new MockWalletAdapter(0);
  for (const p of TOPUP_PACKAGES) {
    const before = (await w.getBalance("ws")).tokens;
    const after = await w.topUp({ workspaceId: "ws", packageId: p.id, usdAmount: p.usd });
    assert.equal(after.tokens - before, p.tokens);
  }
});

test("mock top-up is idempotent on the payment reference", async () => {
  const w = new MockWalletAdapter(0);
  const ref = "wtu_abc123";
  const a = await w.topUp({ workspaceId: "ws", packageId: "20", usdAmount: 20, idempotencyKey: ref });
  const b = await w.topUp({ workspaceId: "ws", packageId: "20", usdAmount: 20, idempotencyKey: ref });
  assert.equal(a.tokens, TOPUP_TOKENS["20"], "credited once");
  assert.equal(b.tokens, a.tokens, "retry with same reference does not double-credit");
  // A different reference still credits.
  const c = await w.topUp({ workspaceId: "ws", packageId: "20", usdAmount: 20, idempotencyKey: "wtu_other" });
  assert.equal(c.tokens, a.tokens + TOPUP_TOKENS["20"]);
});
