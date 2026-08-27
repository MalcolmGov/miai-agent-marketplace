import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runTurn, MODEL_PROVIDER_SOFT_ERROR } from "../dist/index.js";

// A zero-usage provider soft-error (a 401 / network blip / exhausted fallbacks) must:
//  (a) charge NOTHING — the turn delivered no answer and reported no usage; and
//  (b) NOT claim the turn's idempotency slot — otherwise a same-message retry that DOES reach the
//      model gets deduped by the wallet and served free.
// Regression guard: the fix must SKIP the debit call (not pass amount:0 — a 0-amount debit still
// records the idempotency key and re-poisons the retry).

// Wallet that dedups on idempotencyKey exactly like MockWalletAdapter / the http gateway header.
function idempotentWallet(start = 1_000_000) {
  let balance = start;
  const debits = [];
  const seen = new Set();
  return {
    debits,
    balanceNow: () => balance,
    async getBalance() {
      return { workspaceId: "ws", tokens: balance, currencyLabel: "tokens" };
    },
    async debit({ amount, idempotencyKey }) {
      if (idempotencyKey && seen.has(idempotencyKey)) {
        return { ok: true, balance, paused: false }; // dedup: no decrement
      }
      debits.push(amount);
      balance -= amount;
      if (idempotencyKey) seen.add(idempotencyKey);
      return { ok: true, balance, paused: false };
    },
    async topUp() {
      return { workspaceId: "ws", tokens: balance, currencyLabel: "tokens" };
    },
  };
}

// complete()-only model (runtime wraps it via streamFromComplete, forwarding content + usage).
function softErrorModel() {
  return {
    async complete() {
      return { content: MODEL_PROVIDER_SOFT_ERROR, usage: undefined };
    },
  };
}
function okModel(usage) {
  return {
    async complete() {
      return { content: "17 multiplied by 23 is 391, and the capital of Australia is Canberra.", usage };
    },
  };
}

const pkg = {
  format: "miai.agent-package/v1",
  manifest: {
    id: "soft-error-probe",
    name: "Soft Error Probe",
    category: "front-office",
    channels: ["web"],
    model: { primary: "gpt-4o", fallback: "gpt-4o-mini", temperature: 0.3, max_output_tokens: 500 },
    version: "1.0.0",
  },
  system_prompt: "You are a helpful test assistant. Answer briefly.",
  knowledge: "## Knowledge base\nThe office is open Monday to Friday, 9am-5pm.",
  tools: [],
  guardrails: "Stay in role.",
  evals: [],
};

// Fresh request each call — a real client resends the same history snapshot on retry, so both turns
// produce the SAME turnDebitKey (content-derived from messages.length + userMessage).
function makeReq() {
  return {
    workspaceId: "ws-soft-error",
    agentId: "soft-error-probe",
    pkg,
    messages: [],
    userMessage: "What is 17 multiplied by 23, and what is the capital of Australia?",
    model: "gpt-4o",
    mode: "live",
    state: "live",
    replyLanguage: "en",
  };
}

describe("provider soft-error metering", () => {
  it("charges nothing and never calls debit on a zero-usage soft-error", async () => {
    const wallet = idempotentWallet();
    const r = await runTurn(makeReq(), { wallet, model: softErrorModel() });
    assert.equal(r.assistantMessage, MODEL_PROVIDER_SOFT_ERROR, "returns the soft-error message");
    assert.equal(r.tokensDebited, 0, "a failed, no-usage turn must charge nothing");
    assert.deepEqual(wallet.debits, [], "must not call debit at all (a 0-amount debit still claims the idempotency slot)");
    assert.equal(wallet.balanceNow(), 1_000_000, "balance unchanged");
    assert.equal(r.paused, false, "a provider blip must not pause the agent as if out of tokens");
  });

  it("lets a same-message retry after a soft-error bill its real usage (slot not poisoned)", async () => {
    const wallet = idempotentWallet();
    // Turn 1: soft-error — with the fix, no debit call, so the idempotency slot stays open.
    await runTurn(makeReq(), { wallet, model: softErrorModel() });
    // Turn 2: identical request now succeeds — must debit its real usage, not be deduped to free.
    const r2 = await runTurn(makeReq(), { wallet, model: okModel({ totalTokens: 812 }) });
    assert.equal(r2.tokensDebited, 812, "the successful retry must bill its real usage, not 0");
    assert.deepEqual(wallet.debits, [812], "exactly one real debit — from the successful retry");
    assert.equal(wallet.balanceNow(), 1_000_000 - 812, "balance reflects the one real charge");
  });

  it("still charges a successful turn on its real usage (no over-broad skip)", async () => {
    const wallet = idempotentWallet();
    const r = await runTurn(makeReq(), { wallet, model: okModel({ totalTokens: 500 }) });
    assert.equal(r.tokensDebited, 500);
    assert.deepEqual(wallet.debits, [500]);
  });
});
