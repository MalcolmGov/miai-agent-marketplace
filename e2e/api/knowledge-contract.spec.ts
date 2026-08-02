import { test, expect } from "@playwright/test";
import { SMOKE_AGENT_ID, getJson, postJson } from "../helpers";

test.describe("Knowledge API contract @functional @handover", () => {
  test("GET without agentId fails", async ({ request }) => {
    const { status, body } = await getJson<{ error?: string }>(request, "/api/knowledge");
    expect(status).toBe(400);
    expect(JSON.stringify(body)).toMatch(/agentId/i);
  });

  test("GET with agentId returns sources", async ({ request }) => {
    const { status, body } = await getJson<{
      sources?: unknown[];
      composedChars?: number;
    }>(request, `/api/knowledge?agentId=${SMOKE_AGENT_ID}`);
    expect(status).toBe(200);
    expect(Array.isArray(body.sources)).toBeTruthy();
  });

  test("paste creates a knowledge source", async ({ request }) => {
    const marker = `E2E paste ${Date.now()}`;
    const { status, body } = await postJson<{
      ok?: boolean;
      source?: { id?: string };
      id?: string;
    }>(request, "/api/knowledge/paste", {
      agentId: SMOKE_AGENT_ID,
      content: `## Notes\n- ${marker}\n`,
      title: "e2e-handover",
    });
    expect([200, 201]).toContain(status);
    expect(body.ok || body.source?.id || body.id).toBeTruthy();
  });
});
