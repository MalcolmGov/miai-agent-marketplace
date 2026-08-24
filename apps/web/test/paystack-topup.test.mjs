/**
 * Paystack top-up rail — the security-critical bits: HMAC-SHA512 webhook signature
 * verification, USD→minor-unit conversion, and idempotent-by-reference crediting into
 * the token wallet. Runs against the mock wallet + file store (no DATABASE_URL), so it's
 * hermetic. Mirrors the aria (Zara) integration this was ported from.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { createHmac } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

// Deliberately NOT shaped like a real Paystack/Stripe key (no sk_/pk_ prefix) so the
// secret scanner never flags this test fixture. Any string works — it's only the HMAC key.
const SECRET = "test-hmac-key-not-a-real-secret-0123456789";
const STORE = path.join(os.tmpdir(), `miai-topup-${process.pid}.json`);
const saved = {};
let paystack;
let topup;
let wallet;

before(async () => {
  for (const k of ["PAYSTACK_SECRET_KEY", "PAYSTACK_CURRENCY", "RENTAL_STORE_PATH", "DATABASE_URL", "MIAI_WALLET_MODE", "NODE_ENV"]) {
    saved[k] = process.env[k];
  }
  process.env.PAYSTACK_SECRET_KEY = SECRET;
  delete process.env.PAYSTACK_CURRENCY;
  delete process.env.DATABASE_URL;
  delete process.env.MIAI_WALLET_MODE; // → mock adapter
  process.env.RENTAL_STORE_PATH = STORE;
  process.env.NODE_ENV = "test";
  paystack = await import("../src/lib/paystack.ts");
  topup = await import("../src/lib/topup.ts");
  wallet = await import("@miai/wallet-adapter");
  wallet.resetWalletAdapterForTests();
});

after(async () => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await fs.rm(STORE, { force: true });
});

describe("paystack client", () => {
  it("verifies a valid HMAC-SHA512 webhook signature and rejects a bad one", () => {
    const body = JSON.stringify({ event: "charge.success", data: { reference: "wtu_x" } });
    const sig = createHmac("sha512", SECRET).update(body, "utf8").digest("hex");
    assert.equal(paystack.verifyWebhookSignature(body, sig), true);
    assert.equal(paystack.verifyWebhookSignature(body, "deadbeef"), false);
    assert.equal(paystack.verifyWebhookSignature(body, ""), false);
    // A tampered body must not verify against the original signature.
    assert.equal(paystack.verifyWebhookSignature(body + " ", sig), false);
  });

  it("converts USD to minor units (cents) and defaults currency to USD", () => {
    assert.equal(paystack.toMinorUnits(5), 500);
    assert.equal(paystack.toMinorUnits(200), 20_000);
    assert.equal(paystack.currency(), "USD");
  });

  it("reports configured when a secret key is present", () => {
    assert.equal(paystack.isConfigured(), true);
  });
});

describe("wallet top-up crediting", () => {
  it("namespaces references and only routes wallet ones", () => {
    assert.equal(topup.isWalletReference("wtu_abc"), true);
    assert.equal(topup.isWalletReference("sub_abc"), false);
    assert.ok(topup.newTopupReference().startsWith("wtu_"));
  });

  it("credits the token wallet for a successful charge, idempotent by reference", async () => {
    const before = (await wallet.createWalletAdapter().getBalance("ws-credit")).tokens;
    const data = {
      reference: "wtu_credit_1",
      status: "success",
      metadata: { purpose: "wallet_topup", walletId: "ws-credit", packageId: "20", scope: "workspace" },
    };
    const first = await topup.applyTopupFromPaystack(data);
    assert.equal(first.credited, true);
    assert.equal(first.tokens - before, wallet.TOPUP_TOKENS["20"], "credited the $20 package tokens");

    // Webhook retry / return-URL race with the SAME reference must not double-credit.
    const again = await topup.applyTopupFromPaystack(data);
    assert.equal(again.tokens, first.tokens, "no double credit on retry");
  });

  it("ignores charges that aren't wallet top-ups or aren't successful", async () => {
    assert.equal(
      await topup.applyTopupFromPaystack({ reference: "sub_1", status: "success", metadata: {} }),
      null,
      "non-wallet reference is not our concern",
    );
    assert.equal(
      await topup.applyTopupFromPaystack({
        reference: "wtu_failed",
        status: "failed",
        metadata: { purpose: "wallet_topup", walletId: "ws-x", packageId: "10" },
      }),
      null,
      "unsuccessful charge does not credit",
    );
    assert.equal(
      await topup.applyTopupFromPaystack({
        reference: "wtu_nopkg",
        status: "success",
        metadata: { purpose: "wallet_topup", walletId: "ws-x" },
      }),
      null,
      "missing packageId does not credit",
    );
  });
});
