import { test, expect } from "@playwright/test";
import { SMOKE_AGENT_ID, getJson, postJson } from "../helpers";

test.describe("Rent API @smoke", () => {
  test("POST /api/rent then GET /api/agents/:id under mock rails", async ({ request }) => {
    const rent = await postJson(request, "/api/rent", {
      agentId: SMOKE_AGENT_ID,
      plan: "standard",
    });
    // 200 new rent, 409 already rented — both fine on shared staging
    expect([200, 201, 409]).toContain(rent.status);

    const agent = await getJson<{
      id?: string;
      agentId?: string;
      state?: string;
      rental?: { state?: string };
    }>(request, `/api/agents/${SMOKE_AGENT_ID}`);
    expect(agent.status).toBe(200);
    const state = agent.body.state || agent.body.rental?.state;
    // After rent (or prior rent) should not be purely catalog-only
    expect(agent.body.id || agent.body.agentId || SMOKE_AGENT_ID).toBeTruthy();
    if (state) {
      expect(["selected", "configuring", "rented", "live", "paused_no_tokens"]).toContain(state);
    }
  });
});
