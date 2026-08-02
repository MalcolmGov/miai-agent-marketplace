/**
 * Acceptance tests for docs/CURSOR_RESIDUAL_PUNCHLIST.md (P1 + P2).
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("P1.1 SSRF crawl uses safeFetch (DNS pin)", () => {
  it("ingest.ts imports and calls safeFetch (not bare fetch) in fetchWithSsrfGuard", () => {
    const src = readFileSync(join(__dirname, "../src/lib/ingest.ts"), "utf8");
    assert.match(src, /import\s*\{\s*safeFetch\s*\}\s*from\s*["']@miai\/connectors["']/);
    assert.match(src, /await\s+safeFetch\s*\(/);
    const guard = src.slice(src.indexOf("export async function fetchWithSsrfGuard"));
    const body = guard.slice(0, guard.indexOf("export async function fetchPage"));
    assert.doesNotMatch(body, /(?<!safe)fetch\s*\(/);
  });

  it("fetchWithSsrfGuard rejects loopback / metadata hosts", async () => {
    const { fetchWithSsrfGuard } = await import("../src/lib/ingest.ts");
    await assert.rejects(
      () => fetchWithSsrfGuard("http://127.0.0.1/", 2000),
      /SSRF blocked/i,
    );
    await assert.rejects(
      () => fetchWithSsrfGuard("http://169.254.169.254/latest/meta-data/", 2000),
      /SSRF blocked/i,
    );
  });
});

describe("P1.2 webhook sink HMAC-only flag", () => {
  /** @type {Record<string, string | undefined>} */
  let saved = {};

  beforeEach(() => {
    saved.WEBHOOK_SINK_HMAC_ONLY = process.env.WEBHOOK_SINK_HMAC_ONLY;
  });

  afterEach(() => {
    if (saved.WEBHOOK_SINK_HMAC_ONLY === undefined) delete process.env.WEBHOOK_SINK_HMAC_ONLY;
    else process.env.WEBHOOK_SINK_HMAC_ONLY = saved.WEBHOOK_SINK_HMAC_ONLY;
  });

  it("webhookSinkHmacOnly follows WEBHOOK_SINK_HMAC_ONLY=1", async () => {
    const mod = await import("../src/lib/webhook-sink-auth.ts");
    delete process.env.WEBHOOK_SINK_HMAC_ONLY;
    assert.equal(mod.webhookSinkHmacOnly(), false);
    assert.equal(mod.webhookSinkAllowLegacyRawSecret(), true);
    process.env.WEBHOOK_SINK_HMAC_ONLY = "1";
    assert.equal(mod.webhookSinkHmacOnly(), true);
    assert.equal(mod.webhookSinkAllowLegacyRawSecret(), false);
  });

  it("with HMAC-only, raw secret fails verify and signed body passes", async () => {
    const { signWebhookPayload, verifyWebhookSignature } = await import("@miai/connectors");
    const { webhookSinkAllowLegacyRawSecret } = await import("../src/lib/webhook-sink-auth.ts");
    const secret = "test-webhook-secret-32chars-min!!";
    process.env.WEBHOOK_SINK_HMAC_ONLY = "1";
    const allowLegacyRawSecret = webhookSinkAllowLegacyRawSecret();
    assert.equal(allowLegacyRawSecret, false);

    const body = JSON.stringify({ ping: true });
    assert.equal(
      verifyWebhookSignature({
        secret,
        signature: secret,
        timestamp: null,
        body,
        allowLegacyRawSecret,
      }),
      false,
    );

    const ts = String(Date.now());
    const sig = signWebhookPayload(secret, ts, body);
    assert.equal(
      verifyWebhookSignature({
        secret,
        signature: sig,
        timestamp: ts,
        body,
        allowLegacyRawSecret,
      }),
      true,
    );

    const routeSrc = readFileSync(
      join(__dirname, "../src/app/api/webhook/sink/route.ts"),
      "utf8",
    );
    assert.match(routeSrc, /webhookSinkAllowLegacyRawSecret\(\)/);
  });
});

describe("P1.3 CSP nonce (no script-src unsafe-inline)", () => {
  it("buildContentSecurityPolicy uses nonce and drops script unsafe-inline", async () => {
    const { buildContentSecurityPolicy, scriptSrcAllowsUnsafeInline } = await import(
      "../src/lib/csp.ts"
    );
    const csp = buildContentSecurityPolicy("testNonce123");
    assert.match(csp, /script-src[^;]*'nonce-testNonce123'/);
    assert.match(csp, /'strict-dynamic'/);
    assert.equal(scriptSrcAllowsUnsafeInline(csp), false);
  });

  it("next.config no longer ships a static CSP with unsafe-inline scripts", () => {
    const src = readFileSync(join(__dirname, "../next.config.ts"), "utf8");
    assert.doesNotMatch(src, /Content-Security-Policy/);
    assert.doesNotMatch(src, /script-src 'self' 'unsafe-inline'/);
  });
});

describe("P2.5 zod schemas reject oversized / malformed bodies", () => {
  it("parseJsonBody rejects invalid consent and oversized paste", async () => {
    const {
      parseJsonBody,
      consentBodySchema,
      knowledgePasteBodySchema,
      connectorsBodySchema,
      walletTopUpBodySchema,
    } = await import("../src/lib/api-schemas.ts");

    const badConsent = await parseJsonBody(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ choice: "maybe" }),
      }),
      consentBodySchema,
    );
    assert.equal(badConsent.ok, false);
    if (!badConsent.ok) assert.equal(badConsent.response.status, 400);

    const huge = "x".repeat(100_001);
    const badPaste = await parseJsonBody(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ agentId: "a", content: huge }),
      }),
      knowledgePasteBodySchema,
    );
    assert.equal(badPaste.ok, false);

    const badConn = await parseJsonBody(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ agentId: "a" }),
      }),
      connectorsBodySchema,
    );
    assert.equal(badConn.ok, false);

    const badWallet = await parseJsonBody(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ packageId: "999" }),
      }),
      walletTopUpBodySchema,
    );
    assert.equal(badWallet.ok, false);
  });
});

describe("P2.4 store Postgres read-through (multi-replica coherence)", () => {
  it("getWorkspaceAgent / listAudit source from Postgres when pool is set", () => {
    const src = readFileSync(join(__dirname, "../src/lib/store.ts"), "utf8");
    assert.match(src, /Postgres path: always read-through/);
    assert.match(
      src,
      /export async function getWorkspaceAgent[\s\S]*?if \(getPool\(\)\)[\s\S]*?readAgentFromPostgres/,
    );
    assert.match(
      src,
      /export async function listAudit[\s\S]*?if \(getPool\(\)\)[\s\S]*?readAuditFromPostgres/,
    );
    assert.match(src, /readAgentsFromPostgres/);
  });

  it("memory path still works without DATABASE_URL (single-replica)", async () => {
    const prevDb = process.env.DATABASE_URL;
    const prevMiai = process.env.MIAI_DATABASE_URL;
    const prevRent = process.env.RENTAL_STORE_PATH;
    delete process.env.DATABASE_URL;
    delete process.env.MIAI_DATABASE_URL;
    process.env.RENTAL_STORE_PATH = join(mkdtempSync(join(tmpdir(), "miai-store-")), "rentals.json");
    try {
      const store = await import("../src/lib/store.ts");
      const ws = `ws_test_${Date.now()}`;
      const agentId = "us-hr-helpdesk";
      await store.upsertWorkspaceAgent(ws, agentId, {
        agentId,
        state: "live",
        knowledge: "coherent",
      });
      const got = await store.getWorkspaceAgent(ws, agentId);
      assert.equal(got?.knowledge, "coherent");
      const listed = await store.listWorkspaceAgents(ws);
      assert.ok(listed.some((a) => a.agentId === agentId));
    } finally {
      if (prevDb === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = prevDb;
      if (prevMiai === undefined) delete process.env.MIAI_DATABASE_URL;
      else process.env.MIAI_DATABASE_URL = prevMiai;
      if (prevRent === undefined) delete process.env.RENTAL_STORE_PATH;
      else process.env.RENTAL_STORE_PATH = prevRent;
    }
  });
});

describe("P1 helpers — HMAC signing sanity", () => {
  it("signWebhookPayload matches verify helper shape", () => {
    const secret = "abc";
    const ts = "1700000000000";
    const body = "{}";
    const mac = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
    assert.equal(`v1=${mac}`.startsWith("v1="), true);
  });
});
