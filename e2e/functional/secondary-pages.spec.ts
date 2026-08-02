import { test, expect } from "@playwright/test";

const PAGES = [
  { path: "/trust", name: /trust|security|compliance/i },
  { path: "/privacy", name: /privacy/i },
  { path: "/terms", name: /terms/i },
  { path: "/demo", name: /demo|pilot|go-live|catalogue/i },
  { path: "/install", name: /install|embed|agent\.js/i },
  { path: "/ask", name: /ask|assistant|marketplace/i },
] as const;

test.describe("Functional · secondary public pages @functional", () => {
  for (const p of PAGES) {
    test(`${p.path} loads with expected content`, async ({ page }) => {
      const res = await page.goto(p.path);
      expect(res?.ok() || res?.status() === 304).toBeTruthy();
      await expect(page.getByText(p.name).first()).toBeVisible({ timeout: 20_000 });
    });
  }
});
