import { test, expect } from "@playwright/test";
import { GOLIVE_HERO_AGENT_IDS, dismissConsent } from "../helpers";
import { authenticateContext, e2eSessionConfigured, E2E_SESSION_SKIP_REASON } from "../auth";

// The studio (/agents/:id) is a gated business page under OIDC — minted session required.
test.describe("UAT · Go-live hero studio matrix @uat @handover", () => {
  test.skip(!e2eSessionConfigured(), E2E_SESSION_SKIP_REASON);

  test.beforeEach(async ({ context, baseURL }) => {
    await authenticateContext(context, baseURL ?? "http://127.0.0.1:3000");
  });

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
