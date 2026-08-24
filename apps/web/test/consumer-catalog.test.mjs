import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

// apps/web/test → repo root (house pattern; the runner's cwd is the repo root)
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
process.env.CONSUMER_CATALOG_DIR = path.join(repoRoot, "data/catalog-consumer");

const { listPersonalAgents, getPersonalAgent } = await import("../src/lib/consumer-catalog.ts");

describe("consumer catalog (personal agents space)", () => {
  it("lists at least the study-coach launch entry", async () => {
    const items = await listPersonalAgents();
    assert.ok(items.length >= 1, "expected at least one personal agent");
    const ids = items.map((e) => e.id);
    assert.ok(ids.includes("study-coach"), `study-coach missing from ${ids}`);
  });

  it("every entry is audience=personal with badges, languages and session SKUs", async () => {
    const items = await listPersonalAgents();
    for (const e of items) {
      assert.equal(e.audience, "personal", `${e.id} audience`);
      assert.ok(Array.isArray(e.badges) && e.badges.length > 0, `${e.id} badges`);
      assert.ok(Array.isArray(e.languages) && e.languages.length > 0, `${e.id} languages`);
      assert.ok(Array.isArray(e.skus), `${e.id} skus`);
      assert.ok(e.evals > 0, `${e.id} must ship with evals`);
      // capacity is sold in sessions/outcomes, never tokens (prepaid-cards spec)
      for (const sku of e.skus) assert.ok(!/token/i.test(sku), `${e.id} SKU priced in tokens: ${sku}`);
    }
  });

  it("carries a boolean certified flag: 4 certified live + the rest in certification", async () => {
    const items = await listPersonalAgents();
    for (const e of items) assert.equal(typeof e.certified, "boolean", `${e.id} certified must be boolean`);
    const certified = items.filter((e) => e.certified).map((e) => e.id);
    const inCert = items.filter((e) => !e.certified);
    for (const id of ["study-coach", "english-coach", "exam-prep-coach", "private-confidant"])
      assert.ok(certified.includes(id), `${id} should be certified`);
    assert.ok(inCert.length >= 1, "expected some in-certification families");
    // certified families sort ahead of in-certification ones
    const firstUncertIdx = items.findIndex((e) => !e.certified);
    const lastCertIdx = items.map((e) => e.certified).lastIndexOf(true);
    if (firstUncertIdx !== -1) assert.ok(lastCertIdx < firstUncertIdx, "certified must lead the list");
  });

  it("getPersonalAgent returns null for unknown ids", async () => {
    assert.equal(await getPersonalAgent("does-not-exist"), null);
    const sc = await getPersonalAgent("study-coach");
    assert.equal(sc?.name, "Study Coach");
  });

  it("the bundled package file for each entry exists and parses", async () => {
    const { readFile } = await import("node:fs/promises");
    const items = await listPersonalAgents();
    for (const e of items) {
      const p = path.join(repoRoot, "data/catalog-consumer", `${e.id}.agent.json`);
      const bundle = JSON.parse(await readFile(p, "utf8"));
      assert.equal(bundle.manifest.id, e.id);
      assert.ok(bundle.system_prompt.length > 500, `${e.id} prompt too short`);
      assert.ok(bundle.guardrails.length > 500, `${e.id} guardrails too short`);
    }
  });
});
