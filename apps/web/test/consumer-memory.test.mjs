/**
 * Durable consumer memory: the tenant-scoped facts store (remember → dedupe → list → forget →
 * cross-tenant isolation) and the system-prompt block builder. File-backed store; no DATABASE_URL,
 * no network — the fallback path a dev/preview environment runs.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

const STORE = path.join(os.tmpdir(), `miai-memory-${process.pid}.json`);
const saved = {};
let mem;

// Memory owner: a person (consumerId) within a brand/workspace (tenantId).
const owner = (tenantId, consumerId) => ({ tenantId, consumerId });

before(async () => {
  for (const k of ["CONSUMER_MEMORY_STORE_PATH", "DATABASE_URL", "NODE_ENV"]) {
    saved[k] = process.env[k];
  }
  process.env.CONSUMER_MEMORY_STORE_PATH = STORE;
  delete process.env.DATABASE_URL;
  process.env.NODE_ENV = "test";
  mem = await import("../src/lib/consumer-memory-store.ts");
});

after(async () => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await fs.rm(STORE, { force: true });
});

describe("rememberFact + listMemories", () => {
  it("stores a fact, returns an id, and reads it back", async () => {
    const res = await mem.rememberFact(owner("miai", "alice"), {
      content: "vegetarian",
      category: "preferences",
    });
    assert.equal(res.remembered, true);
    assert.ok(res.id, "returns an id");

    const list = await mem.listMemories(owner("miai", "alice"));
    assert.equal(list.length, 1);
    assert.equal(list[0].content, "vegetarian");
    assert.equal(list[0].category, "preferences");
  });

  it("isolates consumers within a tenant", async () => {
    await mem.rememberFact(owner("miai", "bob"), { content: "lives in Lisbon" });
    const alice = await mem.listMemories(owner("miai", "alice"));
    const bob = await mem.listMemories(owner("miai", "bob"));
    assert.ok(!alice.some((m) => m.content === "lives in Lisbon"), "bob's fact is not alice's");
    assert.ok(bob.some((m) => m.content === "lives in Lisbon"));
  });

  it("isolates the SAME consumer id across tenants (B2B2C leak guard)", async () => {
    // The same phone number can be a Vodafone customer AND an MTN customer — separate memories.
    const phone = "27821234567";
    await mem.rememberFact(owner("vodafone", phone), { content: "Vodafone plan: red" });
    await mem.rememberFact(owner("mtn", phone), { content: "MTN plan: sky" });

    const voda = await mem.listMemories(owner("vodafone", phone));
    const mtn = await mem.listMemories(owner("mtn", phone));
    assert.deepEqual(voda.map((m) => m.content), ["Vodafone plan: red"]);
    assert.deepEqual(mtn.map((m) => m.content), ["MTN plan: sky"]);
    assert.ok(!voda.some((m) => m.content.includes("MTN")), "no cross-tenant bleed into Vodafone");
    assert.ok(!mtn.some((m) => m.content.includes("Vodafone")), "no cross-tenant bleed into MTN");
  });

  it("deduplicates on the normalized content prefix within an owner", async () => {
    const o = owner("miai", "alice");
    const first = await mem.rememberFact(o, { content: "vegetarian", category: "preferences" });
    const again = await mem.rememberFact(o, { content: "  Vegetarian ", category: "diet" });
    assert.equal(again.id, first.id, "same normalized content refreshes the same row");
    const veg = (await mem.listMemories(o)).filter(
      (m) => m.content.toLowerCase().trim() === "vegetarian",
    );
    assert.equal(veg.length, 1, "no duplicate row");
    assert.equal(veg[0].category, "diet", "category refreshed");
  });

  it("ignores empty content and an incomplete owner", async () => {
    assert.equal((await mem.rememberFact(owner("miai", "alice"), { content: "   " })).remembered, false);
    assert.equal((await mem.rememberFact(owner("miai", ""), { content: "x" })).remembered, false);
    assert.equal((await mem.rememberFact(owner("", "alice"), { content: "x" })).remembered, false);
  });

  it("forgets a fact by id", async () => {
    const o = owner("miai", "carol");
    const r = await mem.rememberFact(o, { content: "signs emails as 'Best, Carol'" });
    assert.equal(await mem.forgetMemory(o, r.id), true);
    assert.equal((await mem.listMemories(o)).length, 0);
    assert.equal(await mem.forgetMemory(o, r.id), false, "already gone");
  });
});

describe("buildMemoryBlock", () => {
  const rec = (content, category = "general", updatedAt = "2026-08-20T00:00:00.000Z") => ({
    id: content,
    category,
    content,
    source: "assistant",
    createdAt: updatedAt,
    updatedAt,
  });

  it("returns empty for no memories", () => {
    assert.equal(mem.buildMemoryBlock([], "anything"), "");
  });

  it("renders a header and bullets, labelling non-default categories", () => {
    const block = mem.buildMemoryBlock(
      [rec("vegetarian", "preferences"), rec("daughter is called Aya", "general")],
      "what should we cook",
    );
    assert.match(block, /What you remember about this person/);
    assert.match(block, /- \[preferences\] vegetarian/);
    assert.match(block, /- daughter is called Aya/, "default category is not labelled");
  });

  it("ranks items relevant to the message first", () => {
    const memories = [
      rec("daughter is called Aya", "family", "2026-08-01T00:00:00.000Z"),
      rec("allergic to peanuts", "health", "2026-07-01T00:00:00.000Z"),
    ];
    const block = mem.buildMemoryBlock(memories, "any snacks with peanuts around?");
    const lines = block.split("\n").filter((l) => l.startsWith("- "));
    assert.match(lines[0], /peanuts/, "the peanut memory surfaces first for a peanut question");
  });

  it("bounds the number of injected items", () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      rec(`fact number ${i}`, "general", `2026-08-20T00:00:${String(i).padStart(2, "0")}.000Z`),
    );
    const lines = mem.buildMemoryBlock(many, "fact").split("\n").filter((l) => l.startsWith("- "));
    assert.ok(lines.length <= 30, `capped at 30 items, got ${lines.length}`);
  });
});
