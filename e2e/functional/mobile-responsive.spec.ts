import { test, expect } from "@playwright/test";
import { SMOKE_AGENT_ID, dismissConsent } from "../helpers";
import { authenticateContext, e2eSessionConfigured, E2E_SESSION_SKIP_REASON } from "../auth";

/** Chromium phone viewport — avoid device presets that switch to WebKit. */
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
});

test.describe("Mobile responsive @functional @handover", () => {
  test("catalogue hub has no horizontal overflow on a phone", async ({ page }) => {
    await dismissConsent(page);
    // The public catalogue browse surface is /agents (the homepage is the dashboard).
    await page.goto("/agents");
    await expect(page.locator("#catalogue")).toBeVisible({ timeout: 30_000 });

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      return {
        overflowX: Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth,
        menu: !!document.querySelector(".shell-menu-btn"),
        rent: !!document.querySelector('a[href*="/agents/"]'),
      };
    });
    expect(metrics.overflowX).toBeLessThanOrEqual(1);
    expect(metrics.menu).toBeTruthy();
    await expect(page.getByRole("link", { name: /Rent \/ setup|Setup/i }).first()).toBeVisible();
  });

  test("studio try chat fits phone viewport", async ({ page, context, baseURL }) => {
    // The studio is a gated business page under OIDC — needs a session (e2e/auth.ts).
    test.skip(!e2eSessionConfigured(), E2E_SESSION_SKIP_REASON);
    await authenticateContext(context, baseURL ?? "http://127.0.0.1:3000");
    await dismissConsent(page);
    await page.goto(`/agents/${SMOKE_AGENT_ID}?step=try`);
    await expect(page.locator("#sandbox-chat-input")).toBeVisible({ timeout: 30_000 });

    const metrics = await page.evaluate(() => {
      const chat = document.querySelector("#agent-chat");
      const r = chat?.getBoundingClientRect();
      return {
        overflowX:
          Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
          window.innerWidth,
        chatWidth: r?.width ?? 0,
        vw: window.innerWidth,
      };
    });
    expect(metrics.overflowX).toBeLessThanOrEqual(1);
    expect(metrics.chatWidth).toBeGreaterThan(200);
    expect(metrics.chatWidth).toBeLessThanOrEqual(metrics.vw + 1);
  });
});
