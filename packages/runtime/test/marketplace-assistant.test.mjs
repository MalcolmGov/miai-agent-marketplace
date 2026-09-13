import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isMarketplaceAssistant,
  runMarketplaceAssistantWorkflow,
} from "../dist/workflows/marketplace-assistant.js";

describe("marketplace-assistant workflow", () => {
  it("recognizes marketplace assistant agent ID", () => {
    assert.equal(isMarketplaceAssistant("marketplace-assistant"), true);
    assert.equal(isMarketplaceAssistant("us-dental-front-desk"), false);
  });

  it("recommends Autonomous Shopping Agent on shopping and commerce queries", async () => {
    const queries = [
      "Autonomous Shopping Agent",
      "Do you have an agent for shopping?",
      "Can an agent handle ecommerce checkout?",
      "autonomous commerce journeys",
    ];

    for (const q of queries) {
      const res = await runMarketplaceAssistantWorkflow({
        userMessage: q,
        executeTool: async () => ({ ok: true, data: {} }),
      });

      assert.equal(res.handled, true, `Query "${q}" should be handled`);
      assert.ok(
        res.assistantMessage.includes("/agents/agentic-commerce"),
        `Query "${q}" should recommend /agents/agentic-commerce`,
      );
      assert.ok(
        res.assistantMessage.includes("Autonomous Shopping Agent"),
        `Query "${q}" should mention Autonomous Shopping Agent`,
      );
    }
  });
});
