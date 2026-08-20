import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runTurn } from "../dist/index.js";

// H4: wallet debits should use provider-reported usage tokens when the model returns them,
// and fall back to the character estimate only when it does not (e.g. the mock model).

function fakeWallet(start = 1_000_000) {
  let balance = start;
  const debits = [];
  return {
    debits,
    async getBalance() {
      return { workspaceId: "ws", tokens: balance, currencyLabel: "tokens" };
    },
    async debit({ amount }) {
      debits.push(amount);
      balance -= amount;
      return { ok: true, balance, paused: false };
    },
    async topUp() {
      return { workspaceId: "ws", tokens: balance, currencyLabel: "tokens" };
    },
  };
}

// No streamComplete → the runtime wraps complete() via streamFromComplete, which forwards usage.
function fakeModel(usage) {
  return {
    async complete() {
      return { content: "We're open Monday to Friday, 9am to 5pm.", usage };
    },
  };
}

const pkg = {
  format: "miai.agent-package/v1",
  manifest: {
    id: "metering-probe",
    name: "Metering Probe",
    category: "front-office",
    channels: ["web"],
    model: { primary: "claude-sonnet", fallback: "gpt-4o-mini", temperature: 0.3, max_output_tokens: 500 },
    version: "1.0.0",
  },
  system_prompt: "You are a helpful test assistant. Answer briefly.",
  knowledge: "## Knowledge base\nThe office is open Monday to Friday, 9am–5pm.",
  tools: [],
  guardrails: "Stay in role.",
  evals: [],
};

const baseReq = {
  workspaceId: "ws-metering",
  agentId: "metering-probe",
  pkg,
  messages: [],
  userMessage: "What are your opening hours?",
  model: "claude-sonnet",
  mode: "live",
  state: "live",
  replyLanguage: "en",
};

describe("wallet metering (H4)", () => {
  it("debits the provider-reported total tokens when the model reports usage", async () => {
    const wallet = fakeWallet();
    const r = await runTurn(baseReq, { wallet, model: fakeModel({ totalTokens: 1234 }) });
    assert.equal(r.tokensDebited, 1234);
    assert.deepEqual(wallet.debits, [1234]);
  });

  it("falls back to the character estimate when the model reports no usage", async () => {
    const wallet = fakeWallet();
    const r = await runTurn(baseReq, { wallet, model: fakeModel(undefined) });
    assert.ok(r.tokensDebited > 0, "should still meter something");
    assert.notEqual(r.tokensDebited, 1234, "must not be the usage figure when usage is absent");
  });
});
