import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import zlib from "node:zlib";
import {
  assertSafeOutboundUrl,
  isBlockedIp,
  pinnedRequest,
  safeFetch,
  withTimeoutSignal,
} from "../dist/ssrf.js";

/** Local server used to exercise the pinned request path (hostname is fake; the pin hits 127.0.0.1). */
function withServer(handler, fn) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", async () => {
      const port = server.address().port;
      try {
        resolve(await fn(port));
      } catch (err) {
        reject(err);
      } finally {
        server.close();
      }
    });
  });
}

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

  it("isBlockedIp blocks IPv6 transition prefixes that can embed a private/metadata IPv4 (P2-3)", () => {
    // NAT64 64:ff9b::/96 embedding 169.254.169.254 (cloud metadata) and 192.168.0.1.
    assert.equal(isBlockedIp("64:ff9b::a9fe:a9fe"), true);
    assert.equal(isBlockedIp("64:ff9b::c0a8:1"), true);
    // 6to4 2002::/16 embedding a private v4.
    assert.equal(isBlockedIp("2002:c0a8:0001::"), true);
    // A genuine public IPv6 is still allowed.
    assert.equal(isBlockedIp("2606:4700:4700::1111"), false);
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

describe("pinnedRequest — the DNS-pinned fetch used by every outbound connector call", () => {
  // Regression: production shipped without undici (standalone image), so the old hidden dynamic
  // import made webhooks, MCP calls, vendor APIs and website crawls fail with "SSRF blocked:
  // undici unavailable". The pinned path now uses node's own http/https client.
  const target = (port, path = "/") => new URL(`http://internal.example.test:${port}${path}`);

  it("GET returns the body, status and headers, and keeps Host on the real hostname", async () => {
    let seenHost = "";
    await withServer(
      (req, res) => {
        seenHost = req.headers.host ?? "";
        res.writeHead(200, { "content-type": "text/plain", "x-test": "yes" });
        res.end("hello pinned world");
      },
      async (port) => {
        const res = await pinnedRequest(target(port, "/page"), "127.0.0.1", 4);
        assert.equal(res.status, 200);
        assert.equal(await res.text(), "hello pinned world");
        assert.equal(res.headers.get("x-test"), "yes");
        assert.equal(seenHost, `internal.example.test:${port}`);
      },
    );
  });

  it("decodes gzip responses transparently", async () => {
    await withServer(
      (req, res) => {
        const compressed = zlib.gzipSync("compressed payload");
        res.writeHead(200, { "content-encoding": "gzip", "content-type": "text/plain" });
        res.end(compressed);
      },
      async (port) => {
        const res = await pinnedRequest(target(port), "127.0.0.1", 4);
        assert.equal(await res.text(), "compressed payload");
        assert.equal(res.headers.get("content-encoding"), null);
      },
    );
  });

  it("sends a POST body with its content type (webhook / MCP / vendor APIs)", async () => {
    let seenBody = "";
    let seenType = "";
    await withServer(
      (req, res) => {
        seenType = req.headers["content-type"] ?? "";
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => {
          seenBody = Buffer.concat(chunks).toString("utf8");
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        });
      },
      async (port) => {
        const res = await pinnedRequest(target(port, "/tools/call"), "127.0.0.1", 4, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "create_ticket" }),
        });
        assert.equal(res.status, 200);
        assert.deepEqual(await res.json(), { ok: true });
        assert.equal(seenBody, '{"name":"create_ticket"}');
        assert.equal(seenType, "application/json");
      },
    );
  });

  it("never follows redirects — the caller must see the Location (manual mode)", async () => {
    await withServer(
      (req, res) => {
        res.writeHead(302, { location: "http://169.254.169.254/latest/meta-data/" });
        res.end();
      },
      async (port) => {
        const res = await pinnedRequest(target(port), "127.0.0.1", 4, { redirect: "manual" });
        assert.equal(res.status, 302);
        assert.equal(res.headers.get("location"), "http://169.254.169.254/latest/meta-data/");
        assert.equal(await res.text(), "");
      },
    );
  });

  it("aborts when the caller's signal fires (timeout protection stays intact)", async () => {
    await withServer(
      () => {
        /* never responds */
      },
      async (port) => {
        const ctrl = new AbortController();
        const pending = pinnedRequest(target(port), "127.0.0.1", 4, { signal: ctrl.signal });
        ctrl.abort();
        await assert.rejects(pending);
      },
    );
  });

  it("returns an empty body for 204 responses", async () => {
    await withServer(
      (req, res) => {
        res.writeHead(204);
        res.end();
      },
      async (port) => {
        const res = await pinnedRequest(target(port), "127.0.0.1", 4);
        assert.equal(res.status, 204);
        assert.equal(await res.text(), "");
      },
    );
  });
});
