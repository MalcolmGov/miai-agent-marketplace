/**
 * Embed origin-lock save API (PUT /api/agents/[id]/domains): owner/admin-gated, workspace-pinned,
 * domains normalised, and the lock actually enforces via originAllowed. Empty domains = unlocked
 * (the pre-existing, non-breaking behaviour). File-backed store with a temp path.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

const TMP = path.join(os.tmpdir(), `miai-domains-${process.pid}.json`);
const saved = {};
let store;
let route;

const WS = "ws-lock";
const AGENT = "africa-front-desk";

function put(body, headers = {}) {
  return route.PUT(
    new Request(`https://app.test/api/agents/${AGENT}/domains`, {
      method: "PUT",
      headers: { "content-type": "application/json", "x-workspace-id": WS, ...headers },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: AGENT }) },
  );
}

before(async () => {
  for (const k of ["EMBED_KEY_SECRET", "RENTAL_STORE_PATH", "DATABASE_URL", "MIAI_AUTH_MODE", "NODE_ENV"]) {
    saved[k] = process.env[k];
  }
  process.env.EMBED_KEY_SECRET = "test-embed-secret-0123456789abcdef";
  process.env.RENTAL_STORE_PATH = TMP;
  delete process.env.DATABASE_URL;
  delete process.env.MIAI_AUTH_MODE; // mock auth: identity from x-workspace-id / x-roles
  process.env.NODE_ENV = "test";
  store = await import("../src/lib/store.ts");
  route = await import("../src/app/api/agents/[id]/domains/route.ts");
});

after(async () => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await fs.rm(TMP, { force: true });
});

describe("PUT /api/agents/[id]/domains — embed origin lock", () => {
  it("404s when the agent isn't activated in the workspace", async () => {
    const res = await put({ domains: ["example.com"] });
    assert.equal(res.status, 404);
  });

  it("sets and normalises the lock for an activated agent, and originAllowed then enforces it", async () => {
    await store.upsertWorkspaceAgent(WS, AGENT, { state: "live" });
    const res = await put({ domains: ["https://Shop.Example.com/widget", "  *.example.com  ", ""] });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.approvedDomains, ["shop.example.com", "*.example.com"], "normalised: lowercase, scheme/path stripped, blanks dropped");
    const rental = await store.getWorkspaceAgent(WS, AGENT);
    assert.deepEqual(rental.approvedDomains, ["shop.example.com", "*.example.com"], "persisted on the rental");
    // The lock is real: a lifted key from a script (no origin) or a foreign site is rejected.
    assert.equal(store.originAllowed("https://shop.example.com", null, rental.approvedDomains), true);
    assert.equal(store.originAllowed("https://app.example.com", null, rental.approvedDomains), true, "wildcard subdomain");
    assert.equal(store.originAllowed("https://evil.com", null, rental.approvedDomains), false);
    assert.equal(store.originAllowed(null, null, rental.approvedDomains), false, "no origin (script) is rejected");
  });

  it("clearing the domains unlocks again (non-breaking default)", async () => {
    const res = await put({ domains: [] });
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).approvedDomains, []);
    assert.deepEqual((await store.getWorkspaceAgent(WS, AGENT)).approvedDomains, []);
  });

  it("rejects a non-admin with 403 and leaves the lock untouched", async () => {
    await put({ domains: ["shop.example.com"] });
    // A non-member user: in mock mode the default demo-user is auto-seeded as owner, whose member
    // row would override the header role. A stranger has no row, so x-roles is what counts.
    const res = await put({ domains: ["attacker.com"] }, { "x-user-id": "stranger", "x-roles": "readonly" });
    assert.equal(res.status, 403);
    assert.deepEqual((await store.getWorkspaceAgent(WS, AGENT)).approvedDomains, ["shop.example.com"]);
  });

  it("400s on a malformed body", async () => {
    const res = await put({ domains: "not-an-array" });
    assert.equal(res.status, 400);
  });
});
