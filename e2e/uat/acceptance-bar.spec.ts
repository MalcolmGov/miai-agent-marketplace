import { test, expect } from "@playwright/test";
import { INDEXED_MARKETS, assertHealthyStaging, getJson } from "../helpers";

/**
 * UAT · Engineering acceptance bar (automated subset of pilot production bar).
 * Human sign-off checklist: docs/UAT_CHECKLIST.md
 */
test.describe("UAT · acceptance bar @uat", () => {
  test("staging meets B+ operational bar", async ({ request }) => {
    const { status, body } = await getJson<Record<string, unknown>>(request, "/api/health");
    expect(status).toBeLessThan(500);
    assertHealthyStaging(body);
    expect(["postgres", "file"]).toContain(body.storeBackend);
    // Redis preferred for B+; allow not_configured but not error
    if (body.redisPing != null) {
      expect(["ok", "not_configured"]).toContain(body.redisPing);
    }
  });

  test("licence entitlement: 515 indexed SKUs × 5 markets", async ({ request }) => {
    const { body } = await getJson<{
      totalAgents?: number;
      agentCount?: number;
      packs?: Array<{ id: string }>;
    }>(request, "/api/catalog");
    expect(body.totalAgents ?? body.agentCount).toBe(515);
    expect((body.packs ?? []).map((p) => p.id).sort()).toEqual([...INDEXED_MARKETS].sort());
  });

  test("embed channel is install-ready (script + SRI)", async ({ request }) => {
    const script = await request.get("/agents/v1/agent.js");
    expect(script.status()).toBe(200);
    expect(script.headers()["x-miai-script-integrity"]).toBeTruthy();

    const { status, body } = await getJson<{ integrity?: string }>(request, "/api/embed/sri");
    expect(status).toBe(200);
    expect(body.integrity).toMatch(/^sha\d+-/);
  });

  test("legal surfaces exist for diligence leave-behind", async ({ page }) => {
    for (const path of ["/privacy", "/terms", "/trust"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBeLessThan(400);
      await expect(page.locator("body")).not.toBeEmpty();
    }
  });
});
