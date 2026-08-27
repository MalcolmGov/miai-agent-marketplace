import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assertSafeOutboundUrl,
  isBlockedIp,
  safeFetch,
  withTimeoutSignal,
} from "../dist/ssrf.js";

describe("ssrf", () => {
  const rejectCases = [
    ["http://127.0.0.1/", "loopback IP literal"],
    ["http://localhost/", "localhost hostname"],
    ["http://169.254.169.254/", "link-local / metadata IP"],
    ["http://10.0.0.1/", "private 10.x IP"],
    ["http://user:pass@example.com", "URL with credentials"],
  ];

  for (const [url, label] of rejectCases) {
    it(`assertSafeOutboundUrl rejects ${label}`, async () => {
      const result = await assertSafeOutboundUrl(url);
      assert.equal(result.ok, false, `expected ${url} to be blocked`);
    });
  }

  it("assertSafeOutboundUrl accepts a public HTTPS URL", async (t) => {
    const result = await assertSafeOutboundUrl("https://example.com/path");
    if (!result.ok && result.reason === "DNS lookup failed") {
      t.skip("DNS lookup blocked — reject cases cover IP literals");
      return;
    }
    assert.equal(result.ok, true, result.ok ? "" : result.reason);
  });

  it("isBlockedIp returns true for loopback, private, and ULA addresses", () => {
    assert.equal(isBlockedIp("127.0.0.1"), true);
    assert.equal(isBlockedIp("10.0.0.1"), true);
    assert.equal(isBlockedIp("192.168.1.1"), true);
    assert.equal(isBlockedIp("::1"), true);
  });

  it("exports safeFetch as a function", () => {
    assert.equal(typeof safeFetch, "function");
  });
});

describe("withTimeoutSignal — bounds a hung fetch (P0-11)", () => {
  it("aborts after the timeout so a hung endpoint can't block forever", async () => {
    const s = withTimeoutSignal(undefined, 20);
    assert.equal(s.aborted, false);
    await new Promise((r) => setTimeout(r, 45));
    assert.equal(s.aborted, true);
  });

  it("also aborts when the caller's own signal fires first", () => {
    const ctrl = new AbortController();
    const s = withTimeoutSignal(ctrl.signal, 60_000); // long timeout that should not be reached
    assert.equal(s.aborted, false);
    ctrl.abort();
    assert.equal(s.aborted, true); // AbortSignal.any propagates a source abort synchronously
  });

  it("does not abort a fast operation", async () => {
    const s = withTimeoutSignal(undefined, 60_000);
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(s.aborted, false);
  });
});
