import { test, expect } from "@playwright/test";
import { dismissConsent } from "../helpers";
import {
  authenticateContext,
  e2eSessionConfigured,
  sessionHeaders,
  targetAuthMode,
  E2E_SESSION_SKIP_REASON,
  MOCK_ROLES_SKIP_REASON,
} from "../auth";

// Onboarding writes (/api/onboarding) are gated under OIDC; the mock sign-in flow only
// exists on mock-auth targets. Public marketing/get-started shell tests run everywhere.
let oidcTarget = false;
test.beforeAll(async ({ request }) => {
  oidcTarget = (await targetAuthMode(request)) === "oidc";
});

test.describe("B2B onboarding @functional @uat @handover", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    if (e2eSessionConfigured()) {
      await authenticateContext(context, baseURL ?? "http://127.0.0.1:3000");
    }
  });

  test("marketing preview links For business into get-started", async ({ page }) => {
    await dismissConsent(page);
    await page.goto("/marketing");
    await expect(page.getByRole("heading", { name: /AI Access/i })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByTestId("marketing-for-business").click();
    await expect(page).toHaveURL(/\/get-started/);
    await expect(page.getByRole("heading", { name: /business workspace/i })).toBeVisible();
  });

  test("get-started wizard completes and shows catalogue checklist", async ({ page }) => {
    test.skip(oidcTarget && !e2eSessionConfigured(), E2E_SESSION_SKIP_REASON);
    test.setTimeout(90_000);
    await dismissConsent(page);

    await page.goto("/get-started");
    await expect(page.getByRole("heading", { name: /business workspace/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("get-started-wizard")).toHaveAttribute("data-hydrated", "1", {
      timeout: 30_000,
    });

    await page.getByTestId("onboarding-start").click();
    await expect(page.getByTestId("onboarding-company")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("onboarding-company").fill("UAT Demo Co");
    await page.getByTestId("onboarding-market").selectOption("us");
    await page.getByTestId("onboarding-industry").fill("Retail");
    await page.getByRole("button", { name: /^continue$/i }).click();

    await expect(page.getByTestId("onboarding-intent")).toBeVisible();
    await page.getByRole("button", { name: /customer support/i }).click();
    await page.getByRole("button", { name: /^continue$/i }).click();

    await page.getByTestId("onboarding-email").fill("uat-demo@example.com");
    await page.getByTestId("onboarding-finish").click();

    if (oidcTarget) {
      // External-login targets bounce "finish" to Google sign-in (the draft is persisted
      // to sessionStorage first — see GetStartedWizard.complete()). We hold a minted
      // session, so emulate the post-login return instead of completing consent:
      // landing on ?resume=1 auto-submits the persisted draft with the session cookie.
      await page.waitForURL(/accounts\.google\.com/, { timeout: 45_000 });
      await page.goto("/get-started?resume=1");
    }

    await expect(page).toHaveURL(/onboarding=1/, { timeout: 30_000 });
    await expect(page.getByTestId("onboarding-checklist")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("onboarding-step-market")).toBeVisible();

    // Business-mode shell: the sidebar renders with business nav ("My agents") and without
    // consumer-only items. (The explicit shell-mode toggle testid was removed in the
    // MyInstantAI-aligned redesign — #170 — this is the current mode signal.)
    await expect(page.getByTestId("app-sidebar")).toBeVisible();
    await expect(page.getByTestId("sidebar-nav").getByText(/my agents/i)).toBeVisible();
    await expect(page.getByTestId("sidebar-nav").getByText(/learn & earn/i)).toHaveCount(0);
  });

  test("mock sign-in accepts any credentials and lands on catalogue", async ({ page }) => {
    // The mock sign-in form only exists on mock/dev-auth targets.
    test.skip(oidcTarget, MOCK_ROLES_SKIP_REASON);
    await dismissConsent(page);
    await page.goto("/login");
    await expect(page.getByTestId("mock-login-form")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("login-username").fill("partner-demo");
    await page.getByTestId("login-password").fill("anything");
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL(/\/($|\?)/, { timeout: 30_000 });
    await expect(page.getByTestId("app-sidebar")).toBeVisible({ timeout: 30_000 });
  });

  test("auth handoff API is public and describes Agents product", async ({ request }) => {
    const res = await request.get("/api/auth/handoff");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.product).toBe("agents");
    expect(body.getStartedPath).toBe("/get-started");
    expect(["mock", "oidc"]).toContain(body.mode);
  });

  test("onboarding API persists checklist dismiss", async ({ request }) => {
    test.skip(oidcTarget && !e2eSessionConfigured(), E2E_SESSION_SKIP_REASON);
    const complete = await request.post("/api/onboarding", {
      headers: sessionHeaders(),
      data: {
        companyName: "API Co",
        market: "eu",
        industry: "SaaS",
        companySize: "11-50",
        intent: "hotel",
        contactEmail: "api@example.com",
      },
    });
    expect([200, 201]).toContain(complete.status());
    const created = await complete.json();
    expect(created.profile?.wizardCompleted).toBe(true);
    expect(created.redirect).toMatch(/onboarding=1/);

    const patch = await request.patch("/api/onboarding", {
      headers: sessionHeaders(),
      data: { checklist: { browse: true }, checklistDismissed: true },
    });
    expect(patch.ok()).toBeTruthy();
    const updated = await patch.json();
    expect(updated.profile?.checklist?.browse).toBe(true);
    expect(updated.profile?.checklistDismissed).toBe(true);
  });
});
