import { test, expect } from "@playwright/test";
import { GOLIVE_HERO_AGENT_IDS, dismissConsent } from "../helpers";

test.describe("UAT · Go-live hero studio matrix @uat @handover", () => {
  for (const id of GOLIVE_HERO_AGENT_IDS) {
    test(`${id} studio + try shell`, async ({ page }) => {
      await dismissConsent(page);
      await page.goto(`/agents/${id}`);
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 30_000 });

      await page.goto(`/agents/${id}?step=try`);
      await expect(page.locator("#sandbox-chat-input")).toBeVisible({ timeout: 30_000 });
    });
  }
});
