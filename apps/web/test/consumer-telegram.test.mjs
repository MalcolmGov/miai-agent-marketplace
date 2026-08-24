/**
 * Telegram consumer channel — library unit tests.
 * Identity mapping, webhook verification, and messaging helpers.
 * Pure functions; no network or LLM.
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { createHmac } from "node:crypto";

let tg;

beforeEach(async () => {
  tg = await import("../src/lib/consumer-telegram.ts");
});

describe("consumerIdForTelegram", () => {
  it("maps a numeric chat id to a namespaced consumer id", () => {
    assert.equal(
      tg.consumerIdForTelegram(123456789),
      "telegram:123456789",
    );
  });

  it("maps a string chat id the same way", () => {
    assert.equal(
      tg.consumerIdForTelegram("987654321"),
      "telegram:987654321",
    );
  });

  it("never collides with an OIDC userId", () => {
    const tId = tg.consumerIdForTelegram(42);
    assert.ok(tId.startsWith("telegram:"), "has namespace prefix");
    assert.ok(!tId.startsWith("demo-"), "does not look like a workspace");
  });
});

describe("verifyTelegramWebhook", () => {
  const body = '{"update_id":1,"message":{"text":"hi"}}';
  const secret = "my-secret-token";

  it("returns true when no secret is configured", () => {
    assert.equal(tg.verifyTelegramWebhook("", body, "anything"), true);
  });

  it("returns true for a valid HMAC header", () => {
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    assert.equal(tg.verifyTelegramWebhook(secret, body, expected), true);
  });

  it("returns false for a wrong secret", () => {
    assert.equal(tg.verifyTelegramWebhook(secret, body, "deadbeef"), false);
  });

  it("returns false when header is empty but secret is set", () => {
    assert.equal(tg.verifyTelegramWebhook(secret, body, ""), false);
  });
});

describe("escapeTelegramHtml", () => {
  it("escapes ampersands", () => {
    assert.equal(tg.escapeTelegramHtml("A & B"), "A &amp; B");
  });

  it("escapes angle brackets", () => {
    assert.equal(tg.escapeTelegramHtml("<tag>"), "&lt;tag&gt;");
  });

  it("passes through safe text unchanged", () => {
    const safe = "Hello, world! It's a nice day — no markup needed.";
    assert.equal(tg.escapeTelegramHtml(safe), safe);
  });
});

describe("consumer identity + allowlist integration", () => {
  it("Telegram consumer id is a valid namespace but not a built-in tenant", () => {
    const id = tg.consumerIdForTelegram(111222333);
    assert.equal(id, "telegram:111222333");
    assert.ok(id.startsWith(tg.TELEGRAM_CONSUMER_PREFIX));
    assert.notEqual(id, tg.DEFAULT_TELEGRAM_TENANT);
  });
});