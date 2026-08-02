import { test, expect } from "@playwright/test";
import { getJson } from "../helpers";

test.describe("Insights + history APIs @functional @handover", () => {
  test("GET /api/insights returns workspace KPIs", async ({ request }) => {
    const { status, body } = await getJson<{
      workspaceId?: string;
      kpis?: { tokensUsed?: number };
      byAgent?: unknown[];
      source?: string;
      tokensUsed?: number;
    }>(request, "/api/insights");
    expect(status).toBe(200);
    expect(body.workspaceId || body.kpis || body.byAgent).toBeTruthy();
  });

  test("GET /api/history/turns returns turn list", async ({ request }) => {
    const { status, body } = await getJson<{
      count?: number;
      turns?: unknown[];
      items?: unknown[];
    }>(request, "/api/history/turns?limit=10");
    expect(status).toBe(200);
    const turns = body.turns || body.items;
    expect(Array.isArray(turns)).toBeTruthy();
  });
});
