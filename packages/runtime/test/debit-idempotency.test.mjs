import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { turnDebitKey, runTurn } from "../dist/index.js";

// P0-1 (double-charge) + P0-2 (workflow free-turn leak) from the 2026-08-27 hardening audit.

describe("turnDebitKey — deterministic, retry-safe debit key (P0-1)", () => {
  const base = {
    workspaceId: "ws1",
    agentId: "a1",
    messages: [{ role: "user", content: "hi" }],
    userMessage: "when is breakfast?",
  };

  it("is deterministic across calls — no Date.now() drift", () => {
    assert.equal(turnDebitKey(base), turnDebitKey({ ...base }));
  });

  it("carries no wall-clock timestamp (a retry re-derives the SAME key → wallet dedups)", () => {
    assert.doesNotMatch(turnDebitKey(base), /\d{13}/); // no ms-epoch component
  });

  it("differs for a different user message", () => {
    assert.notEqual(turnDebitKey(base), turnDebitKey({ ...base, userMessage: "when is lunch?" }));
  });

  it("differs for a later turn position (message count grows per turn)", () => {
    const next = { ...base, messages: [...base.messages, { role: "assistant", content: "x" }] };
    assert.notEqual(turnDebitKey(base), turnDebitKey(next));
  });

  it("differs across workspaces and agents", () => {
    assert.notEqual(turnDebitKey(base), turnDebitKey({ ...base, workspaceId: "ws2" }));
    assert.notEqual(turnDebitKey(base), turnDebitKey({ ...base, agentId: "a2" }));
  });

  it("honors an explicit caller-supplied idempotencyKey", () => {
    assert.equal(turnDebitKey({ ...base, idempotencyKey: "turn-abc-123" }), "turn-abc-123");
  });
});

describe("workflow debit path honors debit.ok — no free-turn leak (P0-2)", () => {
  const catalogRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/catalog");
  const pkg = JSON.parse(readFileSync(path.join(catalogRoot, "us-hotel-guest.agent.json"), "utf8"));

  function wallet(debitResult, balance = 1000) {
    return {
      async getBalance() {
        return { workspaceId: "ws", tokens: balance, currencyLabel: "tokens" };
      },
      async debit() {
        return debitResult;
      },
      async topUp() {
        return { workspaceId: "ws", tokens: balance, currencyLabel: "tokens" };
      },
    };
  }
  // Grounded hotel-guest turn does not need the model; stub it so nothing hits a provider.
  const model = { async complete() { return { content: "stub" }; } };

  function req() {
    return {
      workspaceId: "ws",
      agentId: "us-hotel-guest",
      pkg,
      messages: [],
      userMessage: "What time is breakfast?",
      model: "claude-sonnet",
      mode: "live",
      state: "rented",
    };
  }

  it("an insufficient-balance debit (ok:false) pauses the turn and charges nothing", async () => {
    const r = await runTurn(req(), {
      wallet: wallet({ ok: false, balance: 5, paused: false }),
      model,
    });
    assert.match(r.assistantMessage, /breakfast/i, "should still answer");
    assert.equal(r.paused, true, "must pause when the debit did not go through");
    assert.equal(r.tokensDebited, 0, "must not report a charge that never happened");
    assert.equal(r.state, "paused_no_tokens");
  });

  it("a successful debit (ok:true) is not paused and reports the charge", async () => {
    const r = await runTurn(req(), {
      wallet: wallet({ ok: true, balance: 900, paused: false }),
      model,
    });
    assert.match(r.assistantMessage, /breakfast/i);
    assert.equal(r.paused, false);
    assert.ok(r.tokensDebited > 0, "a live workflow turn should meter some tokens");
  });
});
