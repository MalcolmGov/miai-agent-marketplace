import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  signWebhookPayload,
  verifyWebhookSignature,
  timingSafeEqualString,
} from "../dist/webhook-sig.js";

describe("webhook-sig", () => {
  it("signs and verifies HMAC v1", () => {
    const secret = "test-secret-at-least-16";
    const body = JSON.stringify({ tool: "ping" });
    const ts = String(Date.now());
    const sig = signWebhookPayload(secret, ts, body);
    assert.match(sig, /^v1=[0-9a-f]+$/);
    assert.equal(
      verifyWebhookSignature({ secret, signature: sig, timestamp: ts, body }),
      true,
    );
  });

  it("rejects skewed timestamps", () => {
    const secret = "test-secret-at-least-16";
    const body = "{}";
    const ts = String(Date.now() - 10 * 60 * 1000);
    const sig = signWebhookPayload(secret, ts, body);
    assert.equal(
      verifyWebhookSignature({ secret, signature: sig, timestamp: ts, body }),
      false,
    );
  });

  it("accepts legacy raw secret when enabled", () => {
    const secret = "legacy-shared-secret";
    assert.equal(
      verifyWebhookSignature({
        secret,
        signature: secret,
        timestamp: null,
        body: "{}",
        allowLegacyRawSecret: true,
      }),
      true,
    );
  });

  it("timingSafeEqualString rejects length mismatch", () => {
    assert.equal(timingSafeEqualString("ab", "a"), false);
    assert.equal(timingSafeEqualString("ab", "ab"), true);
  });
});
