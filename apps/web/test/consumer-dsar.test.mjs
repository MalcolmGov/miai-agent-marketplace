/**
 * Consumer DSAR (subject-level export + erase) — file fallback, no Postgres required.
 * Verifies the isolation invariant: erasing one person's data never touches another person,
 * nor the same person under a different brand/tenant. Run: pnpm --filter @miai/web test
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("consumer-dsar", () => {
  /** @type {Record<string, string | undefined>} */
  let saved = {};
  const KEYS = [
    "DATABASE_URL",
    "DATA_DIR",
    "CONSUMER_MEMORY_STORE_PATH",
    "CONSUMER_GOALS_STORE_PATH",
    "CONSUMER_PEOPLE_STORE_PATH",
    "CONSUMER_REMINDERS_STORE_PATH",
    "BRIEF_STORE_PATH",
    "CONSUMER_TELEGRAM_STORE_PATH",
    "KNOWLEDGE_STORE_PATH",
    "TURN_TRANSCRIPTS_PATH",
  ];

  before(() => {
    const dir = mkdtempSync(join(tmpdir(), "miai-consumer-dsar-"));
    saved = {};
    for (const k of KEYS) saved[k] = process.env[k];
    delete process.env.DATABASE_URL; // force file-store fallback
    process.env.DATA_DIR = dir;
    process.env.CONSUMER_MEMORY_STORE_PATH = join(dir, "memory.json");
    process.env.CONSUMER_GOALS_STORE_PATH = join(dir, "goals.json");
    process.env.CONSUMER_PEOPLE_STORE_PATH = join(dir, "people.json");
    process.env.CONSUMER_REMINDERS_STORE_PATH = join(dir, "reminders.json");
    process.env.BRIEF_STORE_PATH = join(dir, "brief.json");
    process.env.CONSUMER_TELEGRAM_STORE_PATH = join(dir, "telegram.json");
    process.env.KNOWLEDGE_STORE_PATH = join(dir, "knowledge.json");
    process.env.TURN_TRANSCRIPTS_PATH = join(dir, "turns.json");
  });

  after(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  const TA = { tenantId: "tenantT", consumerId: "consumerA" };
  const TB = { tenantId: "tenantT", consumerId: "consumerB" };
  const UA = { tenantId: "tenantU", consumerId: "consumerA" };

  it("exports eraseConsumerData and exportConsumerData", async () => {
    const mod = await import("../src/lib/consumer-dsar.ts");
    assert.equal(typeof mod.eraseConsumerData, "function");
    assert.equal(typeof mod.exportConsumerData, "function");
  });

  it("erases only the target person, leaving other consumers and tenants intact", async () => {
    const mem = await import("../src/lib/consumer-memory-store.ts");
    const life = await import("../src/lib/consumer-lifegraph-store.ts");
    const { eraseConsumerData } = await import("../src/lib/consumer-dsar.ts");

    // Seed memory for all three owners; goal + person only for the target (TA).
    await mem.rememberFact(TA, { content: "TA likes tea" });
    await mem.rememberFact(TB, { content: "TB likes coffee" });
    await mem.rememberFact(UA, { content: "UA likes juice" });
    await life.setGoal(TA, { title: "run a marathon" });
    await life.rememberPerson(TA, { name: "Alex" });

    // Pre-conditions.
    assert.equal((await mem.listMemories(TA)).length, 1);
    assert.equal((await mem.listMemories(TB)).length, 1);
    assert.equal((await mem.listMemories(UA)).length, 1);

    const { deleted } = await eraseConsumerData(TA);

    // Shape: all keys numeric.
    for (const key of [
      "memories",
      "goals",
      "people",
      "reminders",
      "briefRecords",
      "telegramBindings",
      "conversationTurns",
      "knowledgeSources",
    ]) {
      assert.equal(typeof deleted[key], "number", `deleted.${key} should be a number`);
    }
    // Wallet balance must never appear in an erasure result.
    assert.ok(!("wallet" in deleted) && !("walletTokens" in deleted));

    // Target person wiped.
    assert.equal(deleted.memories, 1);
    assert.equal(deleted.goals, 1);
    assert.equal(deleted.people, 1);
    assert.equal((await mem.listMemories(TA)).length, 0);
    assert.equal((await life.listGoals(TA)).length, 0);
    assert.equal((await life.listPeople(TA)).length, 0);

    // Isolation: same brand different person, and same person different brand, both survive.
    assert.equal((await mem.listMemories(TB)).length, 1);
    assert.equal((await mem.listMemories(UA)).length, 1);
  });

  it("exports a person's own data without mutating it", async () => {
    const { exportConsumerData } = await import("../src/lib/consumer-dsar.ts");
    const payload = await exportConsumerData(TB);
    assert.equal(payload.exportType, "dsar_consumer_export");
    assert.equal(payload.tenantId, "tenantT");
    assert.equal(payload.consumerId, "consumerB");
    assert.equal(payload.memories.length, 1);
    assert.ok(payload.wallet && "tokens" in payload.wallet);
    assert.ok(Array.isArray(payload.conversationTurns));
    assert.ok(Array.isArray(payload.knowledge));
    // Export is read-only: TB's memory is still there afterwards.
    const mem = await import("../src/lib/consumer-memory-store.ts");
    assert.equal((await mem.listMemories(TB)).length, 1);
  });
});
