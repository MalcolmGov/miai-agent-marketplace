import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HttpResponseError,
  isRetryableHttpStatus,
  isRetryableError,
  withRetry,
  backoffWithJitter,
} from "../dist/retry.js";

describe("backoffWithJitter (P2-8)", () => {
  it("stays within [0, min(maxDelay, base·2^attempt)) and spreads (not constant)", () => {
    const samples = Array.from({ length: 200 }, () => backoffWithJitter(3, 400, 20_000));
    const cap = Math.min(20_000, 400 * 2 ** 3); // 3200
    for (const s of samples) {
      assert.ok(s >= 0, `sample ${s} below 0`);
      assert.ok(s < cap, `sample ${s} not below cap ${cap}`);
    }
    assert.ok(new Set(samples).size > 1, "jitter should not produce a constant delay");
  });

  it("honours the max cap at high attempt counts", () => {
    for (let i = 0; i < 100; i++) {
      assert.ok(backoffWithJitter(20, 400, 5_000) < 5_000);
    }
  });
});

describe("retry", () => {
  it("isRetryableHttpStatus matches 429 and 5xx only", () => {
    assert.equal(isRetryableHttpStatus(429), true);
    assert.equal(isRetryableHttpStatus(500), true);
    assert.equal(isRetryableHttpStatus(503), true);
    assert.equal(isRetryableHttpStatus(401), false);
    assert.equal(isRetryableHttpStatus(403), false);
    assert.equal(isRetryableHttpStatus(404), false);
  });

  it("isRetryableError treats HttpResponseError and network TypeError as retryable", () => {
    assert.equal(isRetryableError(new HttpResponseError(503, "down")), true);
    assert.equal(isRetryableError(new HttpResponseError(401, "auth")), false);
    assert.equal(isRetryableError(new TypeError("fetch failed")), true);
    assert.equal(isRetryableError(new Error("other")), false);
  });

  it("withRetry succeeds on first attempt", async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      return "ok";
    });
    assert.equal(result, "ok");
    assert.equal(calls, 1);
  });

  it("withRetry retries retryable errors then succeeds", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new HttpResponseError(503, "busy");
        return "done";
      },
      { maxRetries: 2, baseDelayMs: 1 },
    );
    assert.equal(result, "done");
    assert.equal(calls, 3);
  });

  it("withRetry does not retry non-retryable HttpResponseError", async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        withRetry(
          async () => {
            calls++;
            throw new HttpResponseError(401, "unauthorized");
          },
          { maxRetries: 2, baseDelayMs: 1 },
        ),
      /unauthorized/,
    );
    assert.equal(calls, 1);
  });
});
