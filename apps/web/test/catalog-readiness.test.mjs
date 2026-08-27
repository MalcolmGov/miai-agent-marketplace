import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

// P0-6 (UI): the catalogue surfaces each agent's gated connector requirements (from the precomputed
// index.json annotation) so the listing/detail can badge "Needs setup" with zero per-request I/O.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("catalog connector-readiness annotation", () => {
  it("every catalog entry carries a requiresConnectors array; a connector-agent is non-empty, a read-only one empty", async () => {
    process.env.CATALOG_DIR = path.join(repoRoot, "data/catalog");
    const { listCatalog } = await import("../src/lib/catalog.ts");
    const catalog = await listCatalog();

    assert.ok(catalog.length > 0);
    assert.ok(
      catalog.every((e) => Array.isArray(e.requiresConnectors)),
      "requiresConnectors is always an array",
    );

    const withConnectors = catalog.filter((e) => e.requiresConnectors.length > 0);
    const without = catalog.filter((e) => e.requiresConnectors.length === 0);
    assert.ok(withConnectors.length > 0, "some agents require connectors");
    assert.ok(without.length > 0, "some agents require none (read-only / in-app)");

    // The accounting-practice desk books/writes via HubSpot — a stable known requirement.
    const accounting = catalog.find((e) => e.id === "africa-accounting-practice");
    assert.ok(accounting, "africa-accounting-practice exists");
    assert.deepEqual(accounting.requiresConnectors, ["hubspot"]);
  });

  it("listFamilies aggregates requiresConnectors across a family's agents", async () => {
    process.env.CATALOG_DIR = path.join(repoRoot, "data/catalog");
    const { listFamilies } = await import("../src/lib/catalog.ts");
    const families = await listFamilies();

    assert.ok(families.every((f) => Array.isArray(f.requiresConnectors)));
    assert.ok(
      families.some((f) => f.requiresConnectors.length > 0),
      "at least one family surfaces a connector requirement",
    );
    const accounting = families.find((f) => f.id === "accounting-practice");
    assert.ok(accounting, "accounting-practice family exists");
    assert.ok(accounting.requiresConnectors.includes("hubspot"));
  });
});
