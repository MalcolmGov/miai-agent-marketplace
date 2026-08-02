import { test, expect } from "@playwright/test";
import { INDEXED_MARKETS, getJson } from "../helpers";

test.describe("API catalog @smoke", () => {
  test("GET /api/catalog exposes 500 agents across 5 markets", async ({ request }) => {
    const { status, body } = await getJson<{
      totalAgents?: number;
      packs?: Array<{ id: string }>;
      agentCount?: number;
      familyCount?: number;
    }>(request, "/api/catalog");
    expect(status).toBe(200);
    expect(body.totalAgents ?? body.agentCount).toBe(500);
    const packIds = (body.packs ?? []).map((p) => p.id).sort();
    expect(packIds).toEqual([...INDEXED_MARKETS].sort());
  });

  test("GET /api/catalog?view=agents&market=us returns ~100 SKUs", async ({ request }) => {
    const { status, body } = await getJson<{
      count?: number;
      items?: unknown[];
      totalAgents?: number;
    }>(request, "/api/catalog?view=agents&market=us");
    expect(status).toBe(200);
    const n = body.count ?? body.items?.length ?? 0;
    expect(n).toBeGreaterThanOrEqual(90);
    expect(n).toBeLessThanOrEqual(110);
  });
});
