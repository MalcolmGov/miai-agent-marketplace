import { test, expect } from "@playwright/test";
import { openCatalogue } from "../helpers";

test.describe("Functional · catalogue filters @functional", () => {
  test("market filter switches to EU and keeps rent CTAs", async ({ page }) => {
    await openCatalogue(page);
    await page.locator("#market-filter").selectOption("eu");
    await expect(page.locator("#market-filter")).toHaveValue("eu");
    await expect(page.getByRole("link", { name: /Rent \/ setup|Setup/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("Go-live 100 pilot filter activates", async ({ page }) => {
    await page.goto("/?pilot=1#catalogue");
    await expect(page.locator("#catalogue")).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/pilot=1/);
    const pilotChip = page.getByRole("button", { name: /Go-live 100/i });
    await expect(pilotChip).toBeVisible();
    await expect(page.getByRole("link", { name: /Rent \/ setup|Setup/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("Learn more opens capability detail dialog", async ({ page }) => {
    await openCatalogue(page);
    await page.getByRole("button", { name: /Learn more|Details/i }).first().click();
    await expect(page.locator('[aria-labelledby="agent-detail-title"]')).toBeVisible({
      timeout: 15_000,
    });
  });
});
