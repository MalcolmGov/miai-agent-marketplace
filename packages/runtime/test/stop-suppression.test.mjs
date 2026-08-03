import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { STOP_SUPPRESSION_PATTERN, handleStopSuppression } from "../dist/workflows/stop-suppression.js";

describe("STOP_SUPPRESSION_PATTERN", () => {
  it("matches a leading stop (input is always pre-lowercased by callers)", () => {
    assert.equal(STOP_SUPPRESSION_PATTERN.test("stop"), true);
    assert.equal(STOP_SUPPRESSION_PATTERN.test("  stop"), true);
    assert.equal(STOP_SUPPRESSION_PATTERN.test("stop please"), true);
  });

  it("does not match a non-leading stop", () => {
    assert.equal(STOP_SUPPRESSION_PATTERN.test("please stop the noise outside"), false);
  });

  it("matches unsubscribe and don't text/message me anywhere in the string", () => {
    assert.equal(STOP_SUPPRESSION_PATTERN.test("please unsubscribe me from this"), true);
    assert.equal(STOP_SUPPRESSION_PATTERN.test("don't text me again"), true);
    assert.equal(STOP_SUPPRESSION_PATTERN.test("don't message me about this"), true);
  });

  it("does not match unrelated text", () => {
    assert.equal(STOP_SUPPRESSION_PATTERN.test("what time do you open"), false);
  });
});

describe("handleStopSuppression", () => {
  const mockExecute = (calls) => async (name, args) => {
    calls.push({ name, args });
    return { ok: true, data: { routed: true } };
  };

  it("returns null when the message is not a suppression request", async () => {
    const result = await handleStopSuppression({
      lower: "book me a table for two",
      user: "Book me a table for two",
      has: () => true,
      executeTool: mockExecute([]),
    });
    assert.equal(result, null);
  });

  it("fires handoff_to_human with stop_suppression reason and returns the default message", async () => {
    const calls = [];
    const result = await handleStopSuppression({
      lower: "stop",
      user: "STOP",
      has: () => true,
      executeTool: mockExecute(calls),
    });
    assert.ok(result);
    assert.equal(result.handled, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, "handoff_to_human");
    assert.equal(calls[0].args.reason, "stop_suppression");
    assert.equal(result.assistantMessage, "Understood — STOP acknowledged. Handing off so suppression is completed.");
  });

  it("uses a custom assistantMessage override when provided", async () => {
    const result = await handleStopSuppression({
      lower: "unsubscribe",
      user: "unsubscribe",
      has: () => true,
      executeTool: mockExecute([]),
      assistantMessage: "Custom copy for this family.",
    });
    assert.equal(result.assistantMessage, "Custom copy for this family.");
  });

  it("skips the tool call when handoff_to_human is unavailable, but still returns handled", async () => {
    const calls = [];
    const result = await handleStopSuppression({
      lower: "stop",
      user: "stop",
      has: () => false,
      executeTool: mockExecute(calls),
    });
    assert.equal(result.handled, true);
    assert.equal(calls.length, 0);
    assert.deepEqual(result.toolCalls, []);
  });

  it("truncates the handoff summary to 200 chars", async () => {
    const calls = [];
    const longMessage = "stop " + "x".repeat(500);
    await handleStopSuppression({
      lower: longMessage.toLowerCase(),
      user: longMessage,
      has: () => true,
      executeTool: mockExecute(calls),
    });
    assert.ok(calls[0].args.summary.length <= 200);
  });
});
