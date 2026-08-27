import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { streamChatTurn } from "../src/lib/chat-stream.ts";

// Journey #9 (graceful degradation). A turn-runner THROW — e.g. a session-store / persistence outage
// mid-turn — must never crash the stream: streamChatTurn catches it and emits an in-stream `error`
// frame while the HTTP status stays 200. The JSON consumer route now mirrors this with its own
// try/catch (a structured 500 carrying the correlationId) so NEITHER path leaks a raw unhandled crash
// on a dependency blip. This locks the SSE side of that contract.

function collector() {
  const frames = [];
  const send = (event, data) => frames.push({ event, data });
  return { frames, send };
}

describe("streamChatTurn — graceful degradation (Journey #9)", () => {
  it("a runner THROW becomes an in-stream error frame (status 500), not a crash", async () => {
    const { frames, send } = collector();
    await streamChatTurn(send, { channel: "consumer" }, async () => {
      throw new Error("session store down");
    });
    assert.deepEqual(
      frames.map((f) => f.event),
      ["meta", "error"],
      "meta then a single error frame — the throw did not propagate",
    );
    const err = frames.find((f) => f.event === "error");
    assert.equal(err.data.status, 500);
    assert.equal(err.data.error, "Chat failed");
    assert.match(err.data.detail, /session store down/);
  });

  it("a graceful !ok result surfaces its status in an error frame, no done frame", async () => {
    const { frames, send } = collector();
    await streamChatTurn(send, {}, async () => ({
      ok: false,
      error: "Rate limit exceeded",
      status: 429,
    }));
    const events = frames.map((f) => f.event);
    assert.deepEqual(events, ["meta", "error"]);
    assert.equal(frames.find((f) => f.event === "error").data.status, 429);
    assert.ok(!events.includes("done"), "a failed turn must not also emit done");
  });

  it("a successful result emits done with the reply and balance", async () => {
    const { frames, send } = collector();
    await streamChatTurn(send, {}, async () => ({
      ok: true,
      assistantMessage: "hi there",
      paused: false,
      balance: 42,
      correlationId: "c1",
    }));
    const done = frames.find((f) => f.event === "done");
    assert.ok(done, "a successful turn emits a done frame");
    assert.equal(done.data.reply, "hi there");
    assert.equal(done.data.balance, 42);
    assert.equal(done.data.paused, false);
  });
});
