/**
 * Live-channel knowledge fallback regression.
 *
 * A newly rented agent is seeded with the package's EXAMPLE knowledge ("Brightline Studio" in the
 * sales-closer template) so the try-it-now demo has something to ground on. That is fine for
 * untouched/legacy rentals. It is NOT fine once a tenant deliberately clears the field: the widget
 * embedded on the tenant's own site would introduce itself as the fictional example business.
 *
 * Pre-fix: clearing the field wrote "" and `rental.knowledge || pkg.knowledge` fell straight back to
 * the template, so live visitors still heard the example. Post-fix: cleared means cleared — the
 * agent runs on the not-configured notice (no example name, no example prices).
 *
 * Method: file-backed store (no DATABASE_URL) + a stub OpenAI-compatible gateway that captures the
 * system prompt the turn actually runs with, so the assertion is about grounding, not model wording.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const RENTAL_TMP = path.join(os.tmpdir(), `miai-cleared-knowledge-${process.pid}.json`);
const CATALOG = path.resolve(here, "../../../data/catalog");
const CONSUMER_CAT = path.resolve(here, "../../../data/catalog-consumer");
const saved = {};
let store;
let channel;
let catalog;
let server;
let lastSystem = "";

before(async () => {
  for (const k of ["EMBED_KEY_SECRET", "RENTAL_STORE_PATH", "DATABASE_URL", "MIAI_MODEL_MODE", "MIAI_MODEL_GATEWAY_URL", "MIAI_MODEL_GATEWAY_KEY", "MIAI_WALLET_MODE", "NODE_ENV", "CATALOG_DIR", "CONSUMER_CATALOG_DIR"]) {
    saved[k] = process.env[k];
  }

  // Stub model provider: records the system prompt, replies with a fixed message.
  server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        lastSystem = (body.messages ?? []).find((m) => m.role === "system")?.content ?? "";
      } catch {
        lastSystem = "";
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          choices: [{ message: { role: "assistant", content: "stub model reply" } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      );
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  process.env.EMBED_KEY_SECRET = "test-embed-secret-0123456789abcdef";
  process.env.RENTAL_STORE_PATH = RENTAL_TMP;
  process.env.CATALOG_DIR = CATALOG;
  process.env.CONSUMER_CATALOG_DIR = CONSUMER_CAT;
  delete process.env.DATABASE_URL;
  delete process.env.MIAI_WALLET_MODE; // mock wallet
  process.env.NODE_ENV = "test";
  process.env.MIAI_MODEL_MODE = "http";
  process.env.MIAI_MODEL_GATEWAY_URL = `http://127.0.0.1:${port}/v1`;
  process.env.MIAI_MODEL_GATEWAY_KEY = "test-key";

  store = await import("../src/lib/store.ts");
  channel = await import("../src/lib/channel-turn.ts");
  catalog = await import("../src/lib/catalog.ts");
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await fs.rm(RENTAL_TMP, { force: true });
});

describe("live knowledge: a cleared business profile never serves the package example", () => {
  it("keeps the template only while untouched, then serves the notice once cleared", async () => {
    const ws = "ws-cleared-knowledge";
    const agent = "us-sales-closer";
    // Rent the way /api/rent does: the package's example knowledge is seeded into the rental.
    const pkg = await catalog.getAgentPackage(agent);
    const rental = await store.upsertWorkspaceAgent(ws, agent, {
      state: "live",
      knowledge: pkg.knowledge,
    });
    const key = rental.publicKey;
    assert.ok(key, "embed key minted");

    const ask = async (sessionId) => {
      lastSystem = "";
      const out = await channel.runChannelTurn({
        channel: "embed",
        key,
        message: "What packages do you offer and what do they cost?",
        sessionId,
        rateLimitOk: true,
      });
      assert.equal(out.ok, true, out.ok ? "" : `turn failed: ${out.error}`);
      return lastSystem;
    };

    // 1) Untouched rental: the example template still grounds the reply (try-it-now demo).
    const untouchedSystem = await ask("untouched-visitor");
    assert.match(
      untouchedSystem,
      /Brightline/i,
      "untouched rentals keep the example-template fallback for demos",
    );

    // 2) Tenant clears the field (the studio's "Clear template" / save-empty path).
    await store.upsertWorkspaceAgent(ws, agent, { knowledge: "" });

    const clearedSystem = await ask("cleared-visitor");
    assert.doesNotMatch(
      clearedSystem,
      /Brightline/i,
      "a cleared profile must not introduce the widget as the example business",
    );
    assert.doesNotMatch(clearedSystem, /R45,000/, "no example pricing reaches live visitors");
    assert.match(
      clearedSystem,
      /Not configured: the workspace owner has not provided business knowledge/i,
      "the agent runs on the not-configured notice instead",
    );
    assert.match(
      clearedSystem,
      /## Knowledge status/,
      "and is told not to invent or reuse example content",
    );

    // 3) Real knowledge restores normal grounding.
    await store.upsertWorkspaceAgent(ws, agent, {
      knowledge: "# Business knowledge\n\n## Business overview\nAcme Robotics sells warehouse robots.",
    });
    const restoredSystem = await ask("restored-visitor");
    assert.match(restoredSystem, /Acme Robotics/i);
    assert.doesNotMatch(restoredSystem, /Brightline/i);
  });
});
