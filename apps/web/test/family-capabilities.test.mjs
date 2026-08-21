/**
 * Learn-more capability briefs — every family pack must yield useful detail.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAgentPackage } from "@miai/agent-protocol";

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalogDir = join(__dirname, "../../../data/catalog");

describe("family capabilities (Learn more)", () => {
  it("buildFamilyCapabilities returns canDo / willNot / tools / examples for coding pack", async () => {
    const { buildFamilyCapabilities } = await import("../src/lib/family-capabilities.ts");
    const raw = JSON.parse(
      readFileSync(join(catalogDir, "us-ai-coding-assistant.agent.json"), "utf8"),
    );
    const pkg = loadAgentPackage(raw);
    const caps = buildFamilyCapabilities(pkg, "ai-coding-assistant");
    assert.ok(caps.overview.length > 80);
    assert.ok(caps.canDo.length >= 3);
    assert.ok(caps.willNot.some((l) => /not an IDE|push code|repositories/i.test(l)));
    assert.ok(caps.tools.some((t) => t.name === "search_engineering_docs"));
    assert.ok(caps.exampleAsks.length >= 1);
    assert.equal(caps.howItWorks.length, 4);
  });

  it("strips the fictional example-tenant clause from customer-facing copy", async () => {
    const { buildFamilyCapabilities } = await import("../src/lib/family-capabilities.ts");
    // These packs used to read "… for <made-up company> (<city>) — …". The catalog is resold
    // white-label across businesses, so the copy must describe the role, not a specific company.
    const cases = [
      ["us-accounting-practice.agent.json", "accounting-practice", /Ledgerline|Austin/i, /CPA front desk/i],
      ["us-clinic-front-desk.agent.json", "clinic-front-desk", /Rivergate|Denver/i, /clinic front desk/i],
    ];
    for (const [file, familyId, forbidden, keeps] of cases) {
      const pkg = loadAgentPackage(JSON.parse(readFileSync(join(catalogDir, file), "utf8")));
      const caps = buildFamilyCapabilities(pkg, familyId);
      assert.ok(!forbidden.test(caps.summary), `${file}: example company/city removed from summary`);
      assert.ok(!forbidden.test(caps.overview), `${file}: example company/city removed from overview`);
      assert.match(caps.summary, keeps, `${file}: keeps the generic role`);
    }

    // No US family should leak a "for <Business> (<City>) —" tenant clause in its one-line summary.
    const tenantClause = /\bfor\s+[A-Z][^—–]*?\([^)]*\)\s*[—–-]/;
    const files = readdirSync(catalogDir).filter(
      (f) => f.startsWith("us-") && f.endsWith(".agent.json"),
    );
    for (const f of files) {
      const pkg = loadAgentPackage(JSON.parse(readFileSync(join(catalogDir, f), "utf8")));
      const caps = buildFamilyCapabilities(pkg, f.replace(/^us-/, "").replace(/\.agent\.json$/, ""));
      assert.ok(!tenantClause.test(caps.summary), `${f}: summary still has a 'for <Business> (<City>)' clause`);
    }
  });

  it("covers all US family packs without throwing", async () => {
    const { buildFamilyCapabilities } = await import("../src/lib/family-capabilities.ts");
    const files = readdirSync(catalogDir).filter(
      (f) => f.startsWith("us-") && f.endsWith(".agent.json"),
    );
    assert.ok(files.length >= 90, `expected ~100 US packs, got ${files.length}`);
    let withTools = 0;
    for (const f of files) {
      const raw = JSON.parse(readFileSync(join(catalogDir, f), "utf8"));
      const pkg = loadAgentPackage(raw);
      const familyId = f.replace(/^us-/, "").replace(/\.agent\.json$/, "");
      const caps = buildFamilyCapabilities(pkg, familyId);
      assert.ok(caps.canDo.length >= 2, `${f} canDo`);
      assert.ok(caps.willNot.length >= 2, `${f} willNot`);
      assert.ok(caps.overview.length > 40, `${f} overview`);
      if (caps.tools.length) withTools += 1;
    }
    assert.ok(withTools >= 90);
  });
});
