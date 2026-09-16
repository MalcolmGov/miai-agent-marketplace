/**
 * Live-channel knowledge regression: an unconfigured business profile must never echo the
 * catalogue example, and must never let the model invent a business of its own.
 *
 * A newly rented agent is seeded with the package's EXAMPLE knowledge ("Brightline Studio" in the
 * sales-closer template) so the try-it-now demo has something to ground on. That is fine while the
 * tenant has not touched it. Once the field is cleared, the live path must:
 *   1. not serve the example (its widget would introduce itself as a fictional business), and
 *   2. not call the model at all — an LLM told to be "the Sales Closer" with nothing to ground on
 *      invents a business ("Zanzibar Widget Works" was observed in production).
 *
 * Cleared + uploaded sources still runs the model, grounded on those sources only.
 *
 * Method: file-backed store (no DATABASE_URL) + a stub OpenAI-compatible gateway that records
 * every call it receives, so the assertion is about grounding, not model wording.
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
const KNOWLEDGE_TMP = path.join(os.tmpdir(), `miai-cleared-knowledge-src-${process.pid}.json`);
const CATALOG = path.resolve(here, "../../../data/catalog");
const CONSUMER_CAT = path.resolve(here, "../../../data/catalog-consumer");
const saved = {};
let store;
let channel;
let catalog;
let knowledgeStore;
let server;
let modelCalls = [];

before(async () => {
  for (const k of ["EMBED_KEY_SECRET", "RENTAL_STORE_PATH", "KNOWLEDGE_STORE_PATH", "DATABASE_URL", "MIAI_MODEL_MODE", "MIAI_MODEL_GATEWAY_URL", "MIAI_MODEL_GATEWAY_KEY", "MIAI_WALLET_MODE", "NODE_ENV", "CATALOG_DIR", "CONSUMER_CATALOG_DIR"]) {
    saved[k] = process.env[k];
  }

  // Stub model provider: records every system prompt it is asked to run, replies with a fixed message.
  server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        modelCalls.push((body.messages ?? []).find((m) => m.role === "system")?.content ?? "");
      } catch {
        modelCalls.push("");
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
  process.env.KNOWLEDGE_STORE_PATH = KNOWLEDGE_TMP;
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
  knowledgeStore = await import("../src/lib/knowledge.ts");
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await fs.rm(RENTAL_TMP, { force: true });
  await fs.rm(KNOWLEDGE_TMP, { force: true });
});

describe("live knowledge: an unconfigured profile never echoes or invents a business", () => {
  it("keeps the example only while untouched; clears to a deterministic reply; sources stand alone", async () => {
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

    const ask = async (sessionId, message = "What packages do you offer and what do they cost?") => {
      modelCalls = [];
      const out = await channel.runChannelTurn({
        channel: "embed",
        key,
        message,
        sessionId,
        rateLimitOk: true,
      });
      assert.equal(out.ok, true, out.ok ? "" : `turn failed: ${out.error}`);
      return { out, systems: [...modelCalls] };
    };

    // 1) Untouched rental: the example template still grounds the reply (try-it-now demo).
    const untouched = await ask("untouched-visitor");
    assert.equal(untouched.systems.length, 1, "untouched rentals still call the model");
    assert.match(
      untouched.systems.join("\n"),
      /Brightline/i,
      "untouched rentals keep the example-template fallback for demos",
    );

    // 2) Tenant clears the field (the studio's "Clear template" / save-empty path).
    await store.upsertWorkspaceAgent(ws, agent, { knowledge: "" });

    const cleared = await ask("cleared-visitor");
    assert.equal(cleared.systems.length, 0, "no model call when there is nothing to ground on");
    assert.match(cleared.out.assistantMessage, /isn't set up yet/i);
    assert.doesNotMatch(cleared.out.assistantMessage, /Brightline/i, "no example business reaches visitors");
    assert.equal(cleared.out.tokensDebited, 0, "an unconfigured reply is not billed");
    const clearedHistory = JSON.stringify(cleared.out.messages);
    assert.doesNotMatch(clearedHistory, /Brightline|R45,000/, "the transcript stays clean too");

    // 3) Cleared but with an uploaded/crawled source: the model runs on the source alone.
    await knowledgeStore.addKnowledgeSource({
      workspaceId: ws,
      agentId: agent,
      type: "website",
      title: "Tenant site",
      url: "https://tenant.example",
      content: "Acme Robotics builds warehouse robots in Rotterdam. Robots start at EUR 25,000.",
      status: "ready",
    });

    const sourced = await ask("sourced-visitor");
    assert.equal(sourced.systems.length, 1, "sources give the model something to ground on");
    const sourcedPrompt = sourced.systems.join("\n");
    assert.match(sourcedPrompt, /Acme Robotics/i);
    assert.doesNotMatch(sourcedPrompt, /Brightline/i, "the package example still never leaks");
    assert.doesNotMatch(sourcedPrompt, /R45,000/);

    // 4) Real knowledge restores normal grounding.
    await store.upsertWorkspaceAgent(ws, agent, {
      knowledge: "# Business knowledge\n\n## Business overview\nAcme Robotics sells warehouse robots.",
    });
    const restored = await ask("restored-visitor");
    assert.equal(restored.systems.length, 1);
    assert.match(restored.systems.join("\n"), /Acme Robotics/i);
    assert.doesNotMatch(restored.systems.join("\n"), /Brightline/i);
  });
});
