/**
 * PII redaction unit tests.
 * Run: pnpm --filter @miai/web test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("redactPii", () => {
  it("redacts email addresses", async () => {
    const { redactPii } = await import("../src/lib/pii-redact.ts");
    assert.equal(
      redactPii("Contact me at alice@example.com please"),
      "Contact me at [EMAIL] please",
    );
  });

  it("redacts phone-like numbers", async () => {
    const { redactPii } = await import("../src/lib/pii-redact.ts");
    assert.equal(redactPii("Call +27 82 123 4567"), "Call [PHONE]");
    assert.equal(redactPii("US: (555) 123-4567"), "US: [PHONE]");
  });

  it("redacts card-like digit sequences", async () => {
    const { redactPii } = await import("../src/lib/pii-redact.ts");
    assert.equal(redactPii("Card 4111-1111-1111-1111"), "Card [CARD]");
    assert.equal(redactPii("4111 1111 1111 1111"), "[CARD]");
  });

  it("redacts OTP and code patterns", async () => {
    const { redactPii } = await import("../src/lib/pii-redact.ts");
    assert.equal(redactPii("OTP is 123456"), "OTP is [CODE]");
    assert.equal(redactPii("code: 1234"), "code: [CODE]");
    assert.equal(redactPii("PIN is 9876"), "PIN is [CODE]");
  });

  it("leaves benign text unchanged", async () => {
    const { redactPii } = await import("../src/lib/pii-redact.ts");
    const text = "Hello, how can I help with HR policy?";
    assert.equal(redactPii(text), text);
  });
});
