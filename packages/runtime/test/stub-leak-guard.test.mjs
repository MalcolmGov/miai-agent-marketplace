import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { runTurn } from "../dist/index.js";

// P0-3: in a genuine live turn, an unconnected connector returns a stub (ok:true, stubbed:true).
// The runtime must NOT present that stub to a customer as a completed booking/order/application.

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

/** A model that emits one tool call on the first turn, then returns fixed text on later rounds. */
function toolThenText(toolCall, followText) {
  let calls = 0;
  return {
    async complete() {
      calls += 1;
      if (calls === 1) return { content: "", toolCall, usage: { totalTokens: 5 } };
      return { content: followText, usage: { totalTokens: 5 } };
    },
  };
}

function pkgWithTools(tools) {
  return {
    format: "miai.agent-package/v1",
    manifest: {
      id: "stub-probe",
      name: "Stub Probe",
      category: "front-office",
      channels: ["web"],
      model: { primary: "claude-sonnet", fallback: "gpt-4o-mini", temperature: 0.2, max_output_tokens: 300 },
      version: "1.0.0",
    },
    system_prompt: "You are a test assistant.",
    knowledge: "## Knowledge base\nNothing relevant.",
    tools,
    guardrails: "Stay in role.",
    evals: [],
  };
}

const bookTool = {
  name: "book_table",
  description: "Book a table.",
  parameters: { type: "object", properties: { time: { type: "string" } }, required: [] },
  side_effects: "write",
};
const creditTool = {
  name: "credit_book",
  description: "Record a credit-book (ledger) entry.",
  parameters: {
    type: "object",
    properties: { action: { type: "string" }, customer: { type: "string" } },
    required: ["action", "customer"],
  },
  side_effects: "write",
};

function req(pkg, bindings, mode = "live") {
  return {
    workspaceId: "ws-stub",
    agentId: "stub-probe",
    pkg,
    messages: [],
    userMessage: "please do it",
    model: "claude-sonnet",
    mode,
    state: "live",
    replyLanguage: "en",
    bindings,
  };
}

describe("P0-3 — unconnected live connectors don't fabricate confirmations", () => {
  let saved;
  beforeEach(() => {
    saved = process.env.SANDBOX_MODE;
    delete process.env.SANDBOX_MODE;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.SANDBOX_MODE;
    else process.env.SANDBOX_MODE = saved;
  });

  it("real live: a stubbed booking is NOT reported as 'You're booked'", async () => {
    const r = await runTurn(
      req(pkgWithTools([bookTool]), [{ tool: "book_table", connector: "google_calendar" }], "live"),
      { wallet: fakeWallet(), model: toolThenText({ name: "book_table", args: { time: "7pm" } }, "unused") },
    );
    assert.doesNotMatch(r.assistantMessage, /you're booked|reference \*\*|BK-3391/i);
    // Honest decline. P0-5 makes an unconnected ACTION connector return ok:false at the source, so
    // the "couldn't reach the connected system" fallback fires (rather than the ok:true stub-gate
    // message) — both are honest and neither claims the booking happened.
    assert.match(
      r.assistantMessage,
      /couldn't complete that just now|flagged it so a teammate|fully set up|couldn't reach the connected system|hand this to a teammate/i,
    );
  });

  it("sandbox: the demo booking confirmation is preserved (gate is off)", async () => {
    process.env.SANDBOX_MODE = "1";
    const r = await runTurn(
      req(pkgWithTools([bookTool]), [{ tool: "book_table", connector: "google_calendar" }], "live"),
      { wallet: fakeWallet(), model: toolThenText({ name: "book_table", args: { time: "7pm" } }, "unused") },
    );
    assert.match(r.assistantMessage, /you're booked/i);
  });

  it("credit_book (a ledger write) is NOT mistaken for an appointment booking", async () => {
    // Sandbox so the stub-gate is off and we observe pure branch routing: credit_book must fall to
    // the model summary, never the book_ confirmation branch.
    process.env.SANDBOX_MODE = "1";
    const r = await runTurn(
      req(pkgWithTools([creditTool]), [{ tool: "credit_book", connector: "hubspot" }], "live"),
      {
        wallet: fakeWallet(),
        model: toolThenText(
          { name: "credit_book", args: { action: "credit_given", customer: "Sipho" } },
          "Recorded on Sipho's tab.",
        ),
      },
    );
    assert.doesNotMatch(r.assistantMessage, /you're booked/i);
  });
});
