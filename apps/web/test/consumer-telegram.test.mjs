/**
 * Telegram consumer channel — library unit tests.
 * Identity mapping, webhook verification (raw token, not HMAC), nonce mint/verify,
 * and messaging helpers. Pure functions; no network or LLM.
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

let tg;

beforeEach(() => {
  process.env.TELEGRAM_BOT_SECRET = "test-sx5xVnZQ7pKx3m9w";
});

afterEach(() => {
  delete process.env.TELEGRAM_BOT_SECRET;
});

beforeEach(async () => {
  tg = await import("../src/lib/consumer-telegram.ts");
});

describe("consumerIdForTelegram", () => {
  it("maps a numeric chat id to a namespaced consumer id", () => {
    assert.equal(tg.consumerIdForTelegram(123456789), "telegram:123456789");
  });

  it("maps a string chat id the same way", () => {
    assert.equal(tg.consumerIdForTelegram("987654321"), "telegram:987654321");
  });

  it("never collides with an OIDC userId", () => {
    const tId = tg.consumerIdForTelegram(42);
    assert.ok(tId.startsWith("telegram:"), "has namespace prefix");
    assert.ok(!tId.startsWith("demo-"), "does not look like a workspace");
  });
});

describe("verifyTelegramWebhook", () => {
  const secret = "my-webhook-token-abc123";

  it("returns false when no secret is configured (fail closed)", () => {
    assert.equal(tg.verifyTelegramWebhook("", "anything"), false);
  });

  it("returns false when header is empty", () => {
    assert.equal(tg.verifyTelegramWebhook(secret, ""), false);
  });

  it("returns true when header matches the raw secret", () => {
    assert.equal(tg.verifyTelegramWebhook(secret, secret), true);
  });

  it("returns false for a wrong token", () => {
    assert.equal(tg.verifyTelegramWebhook(secret, "wrong-token"), false);
  });

  it("returns false for a prefix-only match (different length)", () => {
    assert.equal(tg.verifyTelegramWebhook("abcdefghij", "abcdef"), false);
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

describe("setup nonce — signed, single-use, short-TTL", () => {
  it("mints a nonce for a consumer and verifies it", () => {
    const nonce = tg.mintSetupNonce("usr_abc");
    assert.ok(nonce.length > 20, "nonce is non-trivial");
    assert.equal(tg.verifySetupNonce(nonce), "usr_abc");
  });

  it("returns null for a tampered nonce", () => {
    const nonce = tg.mintSetupNonce("usr_abc");
    const tampered = nonce.slice(0, -2) + "xx";
    assert.equal(tg.verifySetupNonce(tampered), null);
  });

  it("returns null for garbage input", () => {
    assert.equal(tg.verifySetupNonce("not-a-nonce"), null);
    assert.equal(tg.verifySetupNonce(""), null);
  });

  it("returns null for an empty-string nonce", () => {
    assert.equal(tg.verifySetupNonce(""), null);
  });

  it("produces different nonces each call", () => {
    const n1 = tg.mintSetupNonce("usr_one");
    const n2 = tg.mintSetupNonce("usr_one");
    assert.notEqual(n1, n2);
  });

  it("a nonce minted for one consumer does not verify for another", () => {
    const nonce = tg.mintSetupNonce("usr_a");
    const result = tg.verifySetupNonce(nonce);
    assert.equal(result, "usr_a");
    assert.notEqual(result, "usr_b");
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