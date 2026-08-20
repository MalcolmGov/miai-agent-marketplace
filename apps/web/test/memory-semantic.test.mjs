/**
 * Semantic memory retrieval — getMemoryContext ranks a consumer's memories by embedding similarity
 * to the message, not just shared keywords. Runs offline against the runtime's deterministic
 * LocalHashEmbedder (RUNTIME_SEMANTIC_RETRIEVAL=local, no embedding API key), so it's hermetic.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

const STORE = path.join(os.tmpdir(), `miai-mem-sem-${process.pid}.json`);
const saved = {};
let mem;

const owner = (t, c) => ({ tenantId: t, consumerId: c });
const bullets = (block) => block.split("\n").filter((l) => l.startsWith("- "));

before(async () => {
  for (const k of [
    "CONSUMER_MEMORY_STORE_PATH", "DATABASE_URL", "NODE_ENV",
    "RUNTIME_SEMANTIC_RETRIEVAL", "EMBEDDING_API_KEY", "OPENAI_API_KEY",
  ]) {
    saved[k] = process.env[k];
  }
  process.env.CONSUMER_MEMORY_STORE_PATH = STORE;
  delete process.env.DATABASE_URL;
  process.env.NODE_ENV = "test";
  // Force the offline hashing embedder: semantic on, but no remote key.
  process.env.RUNTIME_SEMANTIC_RETRIEVAL = "local";
  delete process.env.EMBEDDING_API_KEY;
  delete process.env.OPENAI_API_KEY;
  mem = await import("../src/lib/consumer-memory-store.ts");
});

after(async () => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await fs.rm(STORE, { force: true });
});

describe("getMemoryContext (semantic)", () => {
  it("surfaces the memory closest in meaning to the message first", async () => {
    const o = owner("miai", "sem-user");
    await mem.rememberFact(o, { content: "allergic to peanuts", category: "health" });
    await mem.rememberFact(o, { content: "works at Acme Corporation", category: "work" });
    await mem.rememberFact(o, { content: "daughter is called Aya", category: "family" });

    const block = await mem.getMemoryContext(o, "are there any peanuts in this snack?");
    const lines = bullets(block);
    assert.ok(lines.length >= 1, "produced a memory block");
    assert.match(lines[0], /peanuts/, "the peanut memory ranks first for a peanut question");
  });

  it("returns empty when the owner has no memory", async () => {
    assert.equal(await mem.getMemoryContext(owner("miai", "nobody"), "hello"), "");
  });

  it("stays owner-scoped under semantic retrieval", async () => {
    await mem.rememberFact(owner("vodacom", "27821"), { content: "Vodacom plan: red" });
    await mem.rememberFact(owner("mtn", "27821"), { content: "MTN plan: sky" });
    const voda = await mem.getMemoryContext(owner("vodacom", "27821"), "what's my plan?");
    assert.match(voda, /Vodacom plan/);
    assert.ok(!voda.includes("MTN plan"), "no cross-tenant bleed under semantic retrieval");
  });
});
