/**
 * DELETE /api/agents/[id] — deleting an agent must take its data with it.
 *
 * The pop-up promises that the agent, its configuration and the knowledge files uploaded for it
 * are removed and that the embed key stops working. This pins the server side of that promise:
 * the rental record goes, the tenant's ingested knowledge goes with it (no orphans that would
 * silently re-attach if the same agent is rented again), another agent's data is untouched, and a
 * second delete is a clean 404. File-backed stores, mock auth via headers — no Postgres.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

const RENTAL_TMP = path.join(os.tmpdir(), `miai-delete-rentals-${process.pid}.json`);
const KNOWLEDGE_TMP = path.join(os.tmpdir(), `miai-delete-knowledge-${process.pid}.json`);
const saved = {};
let store;
let knowledge;
let route;

const WS = "ws-delete";
const AGENT = "africa-front-desk";
const OTHER = "us-customer-support";

function del(id = AGENT) {
  return route.DELETE(
    new Request(`https://app.test/api/agents/${id}`, {
      method: "DELETE",
      headers: { "x-workspace-id": WS, "x-roles": "owner,admin" },
    }),
    { params: Promise.resolve({ id }) },
  );
}

before(async () => {
  for (const k of ["EMBED_KEY_SECRET", "RENTAL_STORE_PATH", "KNOWLEDGE_STORE_PATH", "DATABASE_URL", "MIAI_AUTH_MODE", "NODE_ENV"]) {
    saved[k] = process.env[k];
  }
  process.env.EMBED_KEY_SECRET = "test-embed-secret-0123456789abcdef";
  process.env.RENTAL_STORE_PATH = RENTAL_TMP;
  process.env.KNOWLEDGE_STORE_PATH = KNOWLEDGE_TMP;
  delete process.env.DATABASE_URL;
  delete process.env.MIAI_AUTH_MODE; // mock auth: identity from x-workspace-id / x-roles
  process.env.NODE_ENV = "test";
  store = await import("../src/lib/store.ts");
  knowledge = await import("../src/lib/knowledge.ts");
  route = await import("../src/app/api/agents/[id]/route.ts");
});

after(async () => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await fs.rm(RENTAL_TMP, { force: true });
  await fs.rm(KNOWLEDGE_TMP, { force: true });
});

describe("DELETE /api/agents/[id] — removes the agent and its tenant data", () => {
  it("deletes the rental and its knowledge sources, leaves other agents alone, 404s on repeat", async () => {
    await store.upsertWorkspaceAgent(WS, AGENT, { state: "live" });
    await store.upsertWorkspaceAgent(WS, OTHER, { state: "live" });
    await knowledge.addKnowledgeSource({
      workspaceId: WS,
      agentId: AGENT,
      type: "website",
      title: "Tenant site",
      url: "https://tenant.example",
      content: "Acme policy: instalments from local currency 12,500.",
      status: "ready",
    });
    await knowledge.addKnowledgeSource({
      workspaceId: WS,
      agentId: OTHER,
      type: "paste",
      title: "Other notes",
      content: "Another agent's knowledge — must survive.",
      status: "ready",
    });

    assert.ok(await store.getWorkspaceAgent(WS, AGENT), "precondition: the rental exists before deleting");

    const res = await del();
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.deleted, true);
    assert.equal(body.knowledgeSources, 1, "the agent's uploaded knowledge is reported as removed");

    assert.ok(!(await store.getWorkspaceAgent(WS, AGENT)), "the rental record is gone");
    assert.equal(
      (await knowledge.listKnowledgeSources(WS, AGENT)).length,
      0,
      "the agent's knowledge sources are gone (no orphans)",
    );
    assert.equal(
      (await knowledge.listKnowledgeSources(WS, OTHER)).length,
      1,
      "another agent's knowledge is untouched",
    );

    const again = await del();
    assert.equal(again.status, 404, "deleting again is a 404, not a second success");
  });
});
