import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HttpResponseError,
  isRetryableHttpStatus,
  isRetryableError,
  withRetry,
} from "../dist/retry.js";

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
