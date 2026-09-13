import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("knowledge guidance problem area mapping", () => {
  it("maps agentic-commerce and commerce category to Retail, E-Commerce & Autonomous Shopping", async () => {
    const { resolveProblemArea, BUSINESS_PROBLEM_MAP } = await import("../src/lib/knowledge-guidance.ts");

    const area = resolveProblemArea("commerce", "agentic-commerce", "Autonomous Shopping Agent");
    assert.equal(area.id, "commerce");
    assert.equal(area.title, "11. Retail, E-Commerce & Autonomous Shopping");
    assert.ok(area.problems.some((p) => /cart abandonment|autonomous shopping/i.test(p)));
    assert.ok(area.optimalSetup.recommendedConnectors.includes("Shopify"));
    assert.ok(area.optimalSetup.recommendedConnectors.includes("Stripe"));
    assert.ok(area.optimalSetup.operatingRules.some((r) => /Zero-PAN/i.test(r)));
  });

  it("maps general commerce and product search agents to commerce area", async () => {
    const { resolveProblemArea } = await import("../src/lib/knowledge-guidance.ts");

    assert.equal(resolveProblemArea("commerce", "product-finder").id, "commerce");
    assert.equal(resolveProblemArea("commerce", "returns-exchanges").id, "commerce");
    assert.equal(resolveProblemArea("commerce", "spaza-merchant").id, "commerce");
  });
});
