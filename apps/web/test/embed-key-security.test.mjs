/**
 * Embed-key security (audit B8 + B9): per-tenant key rotation, revocation, and domain lock.
 * Runs against the file-backed store (no DATABASE_URL) with a temp rentals path so it never
 * touches repo data.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

const TMP = path.join(os.tmpdir(), `miai-embed-test-${process.pid}.json`);
const saved = {};
let store;

before(async () => {
  for (const k of ["EMBED_KEY_SECRET", "OAUTH_TOKEN_SECRET", "RENTAL_STORE_PATH", "DATABASE_URL", "NODE_ENV"]) {
    saved[k] = process.env[k];
  }
  process.env.EMBED_KEY_SECRET = "test-embed-secret-0123456789abcdef";
  process.env.RENTAL_STORE_PATH = TMP;
  delete process.env.DATABASE_URL;
  process.env.NODE_ENV = "test";
  store = await import("../src/lib/store.ts");
});

after(async () => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await fs.rm(TMP, { force: true });
});

describe("embed key derivation", () => {
  it("is deterministic without a salt and changes with a salt", () => {
    const a = store.embedKeyFor("ws1", "agent1");
    assert.equal(a, store.embedKeyFor("ws1", "agent1"));
    assert.notEqual(a, store.embedKeyFor("ws1", "agent1", "somesalt"));
    assert.match(a, /^mia_pk_[A-Za-z0-9_-]+_[a-f0-9]{10}$/);
  });
});

describe("resolveEmbedKey: rotation + revocation", () => {
  it("resolves a legacy key and rejects a tampered MAC", async () => {
    const key = store.embedKeyFor("ws-a", "agent-a");
    assert.deepEqual(await store.resolveEmbedKey(key), { workspaceId: "ws-a", agentId: "agent-a" });
    const last = key.slice(-1);
    const tampered = key.slice(0, -1) + (last === "0" ? "1" : "0");
    assert.equal(await store.resolveEmbedKey(tampered), null);
  });

  it("rotation invalidates the old key and issues a working new one", async () => {
    const ws = "ws-rot";
    const agent = "agent-rot";
    const legacy = await store.upsertWorkspaceAgent(ws, agent, { state: "live" });
    assert.ok(await store.resolveEmbedKey(legacy.publicKey), "legacy key resolves before rotation");

    const rotated = await store.rotateEmbedKey(ws, agent);
    assert.ok(rotated);
    assert.notEqual(rotated.publicKey, legacy.publicKey);
    assert.deepEqual(await store.resolveEmbedKey(rotated.publicKey), { workspaceId: ws, agentId: agent });
    assert.equal(await store.resolveEmbedKey(legacy.publicKey), null, "old key is dead after rotation");
  });

  it("revocation rejects the key until un-revoked", async () => {
    const ws = "ws-rev";
    const agent = "agent-rev";
    const r = await store.upsertWorkspaceAgent(ws, agent, { state: "live" });
    assert.ok(await store.resolveEmbedKey(r.publicKey));

    await store.setEmbedRevoked(ws, agent, true);
    assert.equal(await store.resolveEmbedKey(r.publicKey), null);

    await store.setEmbedRevoked(ws, agent, false);
    assert.ok(await store.resolveEmbedKey(r.publicKey));
  });
});

describe("originAllowed (domain lock)", () => {
  it("matches exact host and wildcard, rejects mismatch and missing origin", () => {
    assert.equal(store.originAllowed("https://shop.example.com", null, ["shop.example.com"]), true);
    assert.equal(store.originAllowed("https://a.example.com", null, ["*.example.com"]), true);
    assert.equal(store.originAllowed("https://example.com", null, ["*.example.com"]), true);
    assert.equal(store.originAllowed("https://evil.com", null, ["shop.example.com"]), false);
    assert.equal(store.originAllowed(null, null, ["shop.example.com"]), false, "no origin is rejected");
    assert.equal(
      store.originAllowed(null, "https://shop.example.com/widget", ["https://shop.example.com"]),
      true,
      "falls back to Referer and strips scheme/path",
    );
  });
});
