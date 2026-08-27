import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { turnDebitKey, runTurn } from "../dist/index.js";

// Wallet-path hardening from the 2026-08-27 audit: P0-1 (double-charge), P0-2 (free-turn leak),
// P0-3 (uncounted re-voice), P0-4 (fail open around the wallet gateway).

const catalogRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/catalog");
const hotelPkg = JSON.parse(readFileSync(path.join(catalogRoot, "us-hotel-guest.agent.json"), "utf8"));
// Grounded hotel-guest turns do not need a real model for the answer; stub one so nothing hits a
// provider. A plain object (not MockModelAdapter) also lets the #106 re-voice path run.
const stubModel = { async complete() { return { content: "stub" }; } };
function hotelReq(userMessage = "What time is breakfast?") {
  return {
    workspaceId: "ws",
    agentId: "us-hotel-guest",
    pkg: hotelPkg,
    messages: [],
    userMessage,
    model: "claude-sonnet",
    mode: "live",
    state: "rented",
  };
}

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
    assert.doesNotMatch(turnDebitKey(base), /\d{13}/);
  });
  it("differs for a different user message", () => {
    assert.notEqual(turnDebitKey(base), turnDebitKey({ ...base, userMessage: "when is lunch?" }));
  });
  it("differs for a later turn position", () => {
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

describe("turnDebitKey — session scope (Finding B: no cross-session free-turn leak)", () => {
  const base = {
    workspaceId: "ws1",
    agentId: "a1",
    messages: [],
    userMessage: "hi",
  };

  it("differs across DISTINCT sessions with an identical position + message", () => {
    // The core leak: two fresh sessions each sending 'hi' as the first message must be charged
    // separately, not collide onto one key that serves the second free.
    assert.notEqual(turnDebitKey({ ...base, sessionId: "s1" }), turnDebitKey({ ...base, sessionId: "s2" }));
  });
  it("re-processing the SAME session/turn re-derives the SAME key (retry/double-submit dedups)", () => {
    assert.equal(turnDebitKey({ ...base, sessionId: "s1" }), turnDebitKey({ ...base, sessionId: "s1" }));
  });
  it("a keyless request (no sessionId) keeps the pre-session-scope key shape — no empty segment", () => {
    const bare = turnDebitKey(base);
    assert.doesNotMatch(bare, /::/, "no empty session segment when sessionId is absent");
    assert.notEqual(bare, turnDebitKey({ ...base, sessionId: "s1" }), "a scoped key differs from the bare key");
  });
  it("an explicit idempotencyKey overrides session scoping entirely", () => {
    assert.equal(turnDebitKey({ ...base, sessionId: "s1", idempotencyKey: "k" }), "k");
    assert.equal(turnDebitKey({ ...base, sessionId: "s2", idempotencyKey: "k" }), "k");
  });
});

describe("deduped debit reports tokensDebited:0 (Finding A: no overstated charge on a replay)", () => {
  function wallet(debitResult, balance = 900) {
    return {
      async getBalance() { return { workspaceId: "ws", tokens: balance, currencyLabel: "tokens" }; },
      async debit(p) { return typeof debitResult === "function" ? debitResult(p) : debitResult; },
      async topUp() { return { workspaceId: "ws", tokens: balance, currencyLabel: "tokens" }; },
    };
  }

  it("a wallet dedup hit (deduped:true, balance unchanged) reports 0 charged and does not pause", async () => {
    const r = await runTurn(hotelReq(), {
      wallet: wallet({ ok: true, balance: 900, paused: false, deduped: true }),
      model: stubModel,
    });
    assert.match(r.assistantMessage, /breakfast/i, "the duplicate turn is still answered");
    assert.equal(r.tokensDebited, 0, "a replay subtracted nothing → report 0, not the full amount");
    assert.equal(r.paused, false, "a dedup hit with a positive balance must not pause");
    assert.equal(r.balance, 900, "reports the unchanged post-first-charge balance");
  });
  it("a fresh debit (no deduped flag) still reports the metered charge", async () => {
    const r = await runTurn(hotelReq(), {
      wallet: wallet((p) => ({ ok: true, balance: 1000 - p.amount, paused: false })),
      model: stubModel,
    });
    assert.ok(r.tokensDebited > 0, "a genuine first charge is still reported");
  });
});

describe("workflow debit path honors debit.ok — no free-turn leak (P0-2)", () => {
  function wallet(debitResult, balance = 1000) {
    return {
      async getBalance() { return { workspaceId: "ws", tokens: balance, currencyLabel: "tokens" }; },
      async debit() { return debitResult; },
      async topUp() { return { workspaceId: "ws", tokens: balance, currencyLabel: "tokens" }; },
    };
  }

  it("an insufficient-balance debit (ok:false) pauses the turn and charges nothing", async () => {
    const r = await runTurn(hotelReq(), { wallet: wallet({ ok: false, balance: 5, paused: false }), model: stubModel });
    assert.match(r.assistantMessage, /breakfast/i, "should still answer");
    assert.equal(r.paused, true, "must pause when the debit did not go through");
    assert.equal(r.tokensDebited, 0, "must not report a charge that never happened");
    assert.equal(r.state, "paused_no_tokens");
  });
  it("a successful debit (ok:true) is not paused and reports the charge", async () => {
    const r = await runTurn(hotelReq(), { wallet: wallet({ ok: true, balance: 900, paused: false }), model: stubModel });
    assert.match(r.assistantMessage, /breakfast/i);
    assert.equal(r.paused, false);
    assert.ok(r.tokensDebited > 0, "a live workflow turn should meter some tokens");
  });
});

describe("re-voice model call is metered (P0-3)", () => {
  // A French breakfast query is grounded-workflow-handled AND non-English, so it triggers the #106
  // localize re-voice in finishWorkflow; that call's usage must be ADDED to the debit, otherwise
  // every non-English grounded turn is under-billed by ~one model call.
  function modelWithUsage(total) {
    return {
      async complete() {
        return { content: "El desayuno se sirve de 7:00 a 10:30.", usage: { totalTokens: total } };
      },
    };
  }
  function recordingWallet(amounts) {
    return {
      async getBalance() { return { workspaceId: "ws", tokens: 100000, currencyLabel: "tokens" }; },
      async debit(p) { amounts.push(p.amount); return { ok: true, balance: 100000 - p.amount, paused: false }; },
      async topUp() { return { workspaceId: "ws", tokens: 100000, currencyLabel: "tokens" }; },
    };
  }

  it("adds the re-voice call's usage to tokensDebited", async () => {
    const a = [];
    const b = [];
    const r0 = await runTurn(hotelReq("À quelle heure est le petit-déjeuner ?"), { wallet: recordingWallet(a), model: modelWithUsage(0) });
    const r1 = await runTurn(hotelReq("À quelle heure est le petit-déjeuner ?"), { wallet: recordingWallet(b), model: modelWithUsage(137) });
    // Same re-voiced content in both runs → the character estimate is identical; the only
    // difference is the captured re-voice usage.
    assert.equal(a.length, 1);
    assert.equal(b.length, 1);
    assert.equal(b[0] - a[0], 137, "the 137-token re-voice call must be added to the debit amount");
    assert.equal(r1.tokensDebited - r0.tokensDebited, 137);
  });
});

describe("wallet failures fail OPEN, not crash (P0-4)", () => {
  it("a debit-gateway throw serves the answer instead of 500-ing", async () => {
    const wallet = {
      async getBalance() { return { workspaceId: "ws", tokens: 1000, currencyLabel: "tokens" }; },
      async debit() { throw new Error("Wallet API 503"); },
      async topUp() { return { workspaceId: "ws", tokens: 1000, currencyLabel: "tokens" }; },
    };
    const r = await runTurn(hotelReq(), { wallet, model: stubModel }); // must not throw
    assert.match(r.assistantMessage, /breakfast/i, "answer served despite the wallet outage");
    assert.equal(r.paused, false, "fail open — do not pause on a gateway blip after answering");
    assert.equal(r.balance, 1000, "reports the fallback balance");
  });

  it("a getBalance throw does not block the turn", async () => {
    const wallet = {
      async getBalance() { throw new Error("Wallet API 503"); },
      async debit() { return { ok: true, balance: 900, paused: false }; },
      async topUp() { return { workspaceId: "ws", tokens: 1000, currencyLabel: "tokens" }; },
    };
    const r = await runTurn(hotelReq(), { wallet, model: stubModel });
    assert.match(r.assistantMessage, /breakfast/i);
    assert.equal(r.paused, false, "unknown balance proceeds; the debit is the real gate");
  });
});
