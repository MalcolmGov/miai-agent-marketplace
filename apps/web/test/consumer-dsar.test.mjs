/**
 * Consumer DSAR (subject-level export + erase) — file fallback, no Postgres required.
 * Verifies the erasure invariant: a right-to-erasure request clears the person EVERYWHERE — across
 * every brand/tenant namespace they have data under — while never touching a DIFFERENT person.
 * (Erasing only the request's brand would leave the person's data under other brands, a POPIA/GDPR
 * incomplete-erasure violation.) Run: pnpm --filter @miai/web test
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

  it("erases the target person across every brand, leaving other people intact", async () => {
    const mem = await import("../src/lib/consumer-memory-store.ts");
    const life = await import("../src/lib/consumer-lifegraph-store.ts");
    const { eraseConsumerData } = await import("../src/lib/consumer-dsar.ts");

    // Seed memory for all three owners; goal + person only for the target (TA).
    await mem.rememberFact(TA, { content: "TA likes tea" });
    await mem.rememberFact(TB, { content: "TB likes coffee" });
    await mem.rememberFact(UA, { content: "UA likes juice" });
    await life.setGoal(TA, { title: "run a marathon" });
    await life.rememberPerson(TA, { name: "Alex" });

    // Seed the in-process rolling session bag (created on import) directly for A and B.
    const bag = globalThis.__miaiConsumerSessions;
    bag.set("consumerA::agent1::default", [{ role: "user", content: "hi" }]);
    bag.set("consumerB::agent1::default", [{ role: "user", content: "hey" }]);

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
      "oauthTokens",
      "sessionHistories",
    ]) {
      assert.equal(typeof deleted[key], "number", `deleted.${key} should be a number`);
    }
    // Wallet balance must never appear in an erasure result.
    assert.ok(!("wallet" in deleted) && !("walletTokens" in deleted));

    // Target person wiped. memories = 2: consumerA's rows under BOTH tenantT (TA) and tenantU (UA)
    // are erased, because a deletion request clears the person across every brand namespace.
    assert.equal(deleted.memories, 2);
    assert.equal(deleted.goals, 1);
    assert.equal(deleted.people, 1);
    assert.equal((await mem.listMemories(TA)).length, 0);
    assert.equal((await life.listGoals(TA)).length, 0);
    assert.equal((await life.listPeople(TA)).length, 0);

    // Session history: A's rolling chat is cleared, B's is untouched.
    assert.equal(deleted.sessionHistories, 1);
    assert.equal(bag.has("consumerA::agent1::default"), false);
    assert.equal(bag.has("consumerB::agent1::default"), true);

    // A DIFFERENT person under the same brand is untouched...
    assert.equal((await mem.listMemories(TB)).length, 1);
    // ...but the SAME person under another brand IS erased (the fix: no data left behind anywhere).
    assert.equal((await mem.listMemories(UA)).length, 0);
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
    assert.ok(Array.isArray(payload.connectors));
    // Export is read-only: TB's memory is still there afterwards.
    const mem = await import("../src/lib/consumer-memory-store.ts");
    assert.equal((await mem.listMemories(TB)).length, 1);
  });
});
