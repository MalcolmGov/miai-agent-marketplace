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

  test("Go-live pilot filter activates", async ({ page }) => {
    // Catalogue browse lives at /agents since the B2B dashboard pivot (homepage is the dashboard).
    await page.goto("/agents?pilot=1#catalogue");
    await expect(page.locator("#catalogue")).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/pilot=1/);
    // The toolbar facet is labelled "Go-live" (catalog.demo6) — the only Go-live button on the hub;
    // "Go-live 100" is the /demo shortlist copy. Assert it is genuinely engaged, not just visible.
    const pilotChip = page.getByRole("button", { name: /Go-live/i });
    await expect(pilotChip).toBeVisible();
    await expect(pilotChip).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("link", { name: /Rent \/ setup|Setup/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("Learn more opens capability detail dialog", async ({ page }) => {
    await openCatalogue(page);
    // Scope to #catalogue: the page also renders "Details" buttons in the hero/rails
    // above the grid, and an unscoped .first() matches those (they don't open the modal).
    // Retry the click until React hydration has wired the card handlers — Playwright's
    // actionability checks pass on the SSR button before onClick is attached, so a
    // single early click can be swallowed on a cold page.
    const detailsBtn = page.locator("#catalogue").getByRole("button", { name: /Learn more|Details/i }).first();
    await expect(async () => {
      await detailsBtn.click({ timeout: 5_000 });
      await expect(page.locator('[aria-labelledby="agent-detail-title"]')).toBeVisible({
        timeout: 5_000,
      });
    }).toPass({ timeout: 30_000 });
  });
});
