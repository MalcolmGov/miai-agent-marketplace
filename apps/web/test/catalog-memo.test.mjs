import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

// apps/web/test → repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("catalog memoization", () => {
  it("listCatalog returns cached result when index.json mtime is unchanged", async () => {
    process.env.CATALOG_DIR = path.join(repoRoot, "data/catalog");

    const { listCatalog } = await import("../src/lib/catalog.ts");

    const first = await listCatalog();
    const second = await listCatalog();

    assert.ok(Array.isArray(first));
    assert.ok(first.length > 0, "catalog should have entries");
    assert.equal(second, first, "second call should return same memoized array reference");
    assert.equal(first[0]?.id, second[0]?.id);
  });

  it("listFamilies uses memoized families.json when present", async () => {
    process.env.CATALOG_DIR = path.join(repoRoot, "data/catalog");

    const { listFamilies } = await import("../src/lib/catalog.ts");

    const first = await listFamilies();
    const second = await listFamilies();

    assert.ok(Array.isArray(first));
    assert.ok(first.length > 0, "families should have entries");
    assert.equal(first.length, second.length);
  });
});
