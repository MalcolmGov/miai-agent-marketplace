import { test, expect } from "@playwright/test";
import { INDEXED_MARKETS, getJson, openCatalogue } from "../helpers";

test.describe("Markets + ZA⊂Africa @functional @uat @handover", () => {
  test("market filter lists 5 markets and no ZA chip", async ({ page }) => {
    await openCatalogue(page);
    const values = await page.locator("#market-filter option").evaluateAll((opts) =>
      opts.map((o) => (o as HTMLOptionElement).value),
    );
    expect(values[0]).toBe("all");
    expect(values.slice(1).sort()).toEqual([...INDEXED_MARKETS].sort());
    expect(values).not.toContain("za");
    const labels = await page.locator("#market-filter option").allTextContents();
    expect(labels.some((l) => /^ZA$/i.test(l.trim()))).toBeFalsy();
  });

  test("catalog API has no za pack; africa fold works", async ({ request }) => {
    const { body } = await getJson<{ packs?: Array<{ id: string }> }>(request, "/api/catalog");
    const packIds = (body.packs ?? []).map((p) => p.id).sort();
    expect(packIds).toEqual([...INDEXED_MARKETS].sort());
    expect(packIds).not.toContain("za");

    const africa = await getJson<{ count?: number; items?: Array<{ market?: string }> }>(
      request,
      "/api/catalog?view=agents&market=africa",
    );
    expect(africa.status).toBe(200);
    expect((africa.body.count ?? africa.body.items?.length) ?? 0).toBeGreaterThanOrEqual(90);

    const za = await getJson<{ count?: number; items?: Array<{ market?: string }> }>(
      request,
      "/api/catalog?view=agents&market=za",
    );
    // ZA may alias to africa or return empty/redirect-equivalent — never a 6th pack
    expect(za.status).toBe(200);
    const zaItems = za.body.items ?? [];
    for (const item of zaItems) {
      if (item.market) expect(["africa", "za"]).toContain(item.market);
    }
  });
});
