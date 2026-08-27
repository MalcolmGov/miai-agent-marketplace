import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { runTurn, checkInputGuardrails } from "../dist/index.js";
import { runPharmacyWorkflow } from "../dist/workflows/pharmacy.js";

// P0-7 / P0-9: safety guardrails must apply to the grounded-workflow turns and to the streaming
// output path — not only to the main model path. Before this fix, the ~20 per-archetype workflows
// were dispatched BEFORE the input guardrails ran, so a workflow-handled message bypassed the
// safety net entirely; and the output scrub only ran on the full non-workflow reply, so a leaked
// card / OTP could be streamed token-by-token before it was redacted.

function fakeWallet() {
  let balance = 1_000_000;
  return {
    async getBalance() {
      return { workspaceId: "ws", tokens: balance, currencyLabel: "tokens" };
    },
    async debit({ amount }) {
      balance -= amount;
      return { ok: true, balance, paused: false };
    },
    async topUp() {
      return { workspaceId: "ws", tokens: balance, currencyLabel: "tokens" };
    },
  };
}

/** A model that would leak the given content verbatim (no streamComplete → runtime paces deltas). */
function leakingModel(content) {
  return {
    async complete() {
      return { content, usage: { totalTokens: 12 } };
    },
  };
}

function pkg(id, toolNames) {
  return {
    format: "miai.agent-package/v1",
    manifest: {
      id,
      name: "Test Agent",
      category: "front-office",
      channels: ["web"],
      model: { primary: "claude-sonnet", fallback: "gpt-4o-mini", temperature: 0.2, max_output_tokens: 300 },
      version: "1.0.0",
    },
    system_prompt: "You are a test assistant.",
    knowledge: "## Knowledge base\nPanado R25.",
    tools: toolNames.map((name) => ({
      name,
      description: name,
      parameters: { type: "object", properties: {} },
      side_effects: "read",
    })),
    guardrails: "Stay in role.",
    evals: [],
  };
}

function req(agentId, userMessage, toolNames = [], model = "claude-sonnet") {
  return {
    workspaceId: "ws-guard",
    agentId,
    pkg: pkg(agentId, toolNames),
    messages: [],
    userMessage,
    model,
    mode: "live",
    state: "live",
    replyLanguage: "en",
    bindings: [],
  };
}

describe("P0-7 — input guardrails run BEFORE the workflow dispatch", () => {
  it("a workflow that would echo a card number is pre-empted by the input guardrail", async () => {
    const PAN = "Do you have 5500 0000 0000 0004 in stock?";

    // The pharmacy stock workflow, on its own, WOULD handle this and echo the digits back — the
    // pre-fix leak path. (Its card check only matches "card"/"cvv"/"4111", not a bare number.)
    const wf = await runPharmacyWorkflow({
      agentId: "us-pharmacy",
      userMessage: PAN,
      messages: [],
      toolNames: ["check_stock", "handoff_to_human"],
      executeTool: async () => ({ ok: true, data: { available: true, level: "in_stock", price: "R25" } }),
    });
    assert.equal(wf.handled, true, "pharmacy workflow claims this message");
    assert.match(wf.assistantMessage, /5500|0004/, "and would echo the card digits");

    // …but runTurn now serves the input guardrail's card refusal, so the workflow never runs and
    // the number is never echoed to the customer.
    const r = await runTurn(req("us-pharmacy", PAN, ["check_stock", "handoff_to_human"]), {
      wallet: fakeWallet(),
      model: leakingModel("unused"),
    });
    assert.match(r.assistantMessage, /can't take card details|secure payment/i);
    assert.doesNotMatch(r.assistantMessage.replace(/\s/g, ""), /5500000000000004/);
  });
});

describe("P0-7 — output scrub runs INSIDE finishWorkflow", () => {
  let saved;
  beforeEach(() => {
    saved = process.env.SANDBOX_MODE;
    process.env.SANDBOX_MODE = "1"; // keep the demo stock confirmation flowing so the echo occurs
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.SANDBOX_MODE;
    else process.env.SANDBOX_MODE = saved;
  });

  it("a PIN echoed into a grounded workflow answer is scrubbed before it reaches the customer", async () => {
    const MSG = "Do you have pin=4821 in stock?";
    // The input net deliberately does NOT catch this (no card/otp keyword), so the turn reaches the
    // workflow, which echoes "pin=4821" into its stock answer. finishWorkflow's output scrub catches it.
    assert.equal(checkInputGuardrails(MSG, "sys", []), null, "input net lets this through to the workflow");

    const r = await runTurn(req("us-pharmacy", MSG, ["check_stock", "handoff_to_human"]), {
      wallet: fakeWallet(),
      model: leakingModel("unused"),
    });
    assert.match(r.assistantMessage, /never share (otp|.*pin)|passwords/i);
    assert.doesNotMatch(r.assistantMessage, /4821/);
  });
});

describe("P0-9 — the streaming path never emits a leak token-by-token", () => {
  it("a card number the model streams is withheld; the final reply is the redaction", async () => {
    // Long enough that a safe prefix streams while the PAN (near the end) stays in the withheld tail.
    const content =
      "Thanks for waiting. I've pulled up your account and everything looks good on our side. " +
      "Your card on file is 4111 1111 1111 1111 and it is active.";
    const deltas = [];
    // Benign message: the input net must clear it so the model path (and its stream) runs.
    const r = await runTurn(req("stub-probe", "Can you read my details back to me?", []), {
      wallet: fakeWallet(),
      model: leakingModel(content),
      onDelta: (t) => deltas.push(t),
    });
    const streamed = deltas.join("");
    // Some safe prefix did stream (proves streaming is live, not disabled)…
    assert.match(streamed, /Thanks for waiting/);
    // …but the full PAN was never streamed to the user.
    assert.doesNotMatch(streamed.replace(/\s/g, ""), /4111111111111111/);
    // The authoritative final reply is the card redaction.
    assert.match(r.assistantMessage, /can't (take|repeat) card numbers|secure payment/i);
    assert.doesNotMatch(r.assistantMessage.replace(/\s/g, ""), /4111111111111111/);
  });
});
