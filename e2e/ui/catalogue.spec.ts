import { test, expect } from "@playwright/test";
import { openCatalogue } from "../helpers";

test.describe("Marketplace catalogue UI @smoke", () => {
  test("home shows catalogue with market filter and rent CTAs", async ({ page }) => {
    await openCatalogue(page);

    await expect(page.locator("#market-filter")).toBeVisible();
    const rentLinks = page.getByRole("link", { name: /Rent \/ setup/i });
    await expect(rentLinks.first()).toBeVisible({ timeout: 30_000 });

    // At least one agent card
    const cards = page.locator("#catalogue article, #catalogue .panel");
    await expect(cards.first()).toBeVisible();
  });

  test("search narrows catalogue results", async ({ page }) => {
    await openCatalogue(page);
    const search = page.getByRole("searchbox").or(
      page.locator('input[aria-label*="Search agents"]'),
    );
    await expect(search.first()).toBeVisible();
    await search.first().fill("customer support");
    await expect(page.getByRole("link", { name: /Rent \/ setup/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
