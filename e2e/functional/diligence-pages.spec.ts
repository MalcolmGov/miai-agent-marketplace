import { test, expect } from "@playwright/test";
import { dismissConsent } from "../helpers";
import { authenticateContext, e2eSessionConfigured, E2E_SESSION_SKIP_REASON } from "../auth";

// /insights, /ops and /my-agents are gated business console pages under OIDC (see
// apps/web/src/lib/public-paths.ts) — they need a minted session to render.
const GATED_PATHS = new Set(["/insights", "/ops", "/my-agents"]);

const PAGES = [
  { path: "/legal", re: /Legal|Privacy|policies|Terms/i },
  { path: "/cookies", re: /Cookie|local storage/i },
  { path: "/data-protection", re: /Data protection|DSAR|export|eras/i },
  { path: "/roadmap", re: /Roadmap|Go-live|OIDC|wallet|pilot/i },
  { path: "/history", re: /History|transcript|correlation|turn/i },
  { path: "/insights", re: /Insights|token|conversation|usage/i },
  { path: "/ops", re: /Ops|rented|tokens|Live/i },
  { path: "/my-agents", re: /agent|rent|workspace|My/i },
] as const;

test.describe("Diligence + ops pages @functional @handover", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    if (e2eSessionConfigured()) {
      await authenticateContext(context, baseURL ?? "http://127.0.0.1:3000");
    }
  });

  for (const p of PAGES) {
    test(`${p.path} loads`, async ({ page }) => {
      if (GATED_PATHS.has(p.path)) {
        test.skip(!e2eSessionConfigured(), E2E_SESSION_SKIP_REASON);
      }
      await dismissConsent(page);
      const res = await page.goto(p.path);
      expect(res?.status() ?? 0).toBeLessThan(400);
      await expect(page.getByText(p.re).first()).toBeVisible({ timeout: 20_000 });
    });
  }
});
