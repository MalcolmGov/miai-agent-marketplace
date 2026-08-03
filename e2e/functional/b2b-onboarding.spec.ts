import { test, expect } from "@playwright/test";
import { dismissConsent } from "../helpers";

test.describe("B2B onboarding @functional @uat @handover", () => {
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

    await expect(page).toHaveURL(/onboarding=1/, { timeout: 30_000 });
    await expect(page.getByTestId("onboarding-checklist")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("onboarding-step-market")).toBeVisible();

    await expect(page.getByTestId("shell-mode-business")).toBeVisible();
    await expect(page.getByTestId("sidebar-nav").getByText(/my agents/i)).toBeVisible();
    await expect(page.getByTestId("sidebar-nav").getByText(/learn & earn/i)).toHaveCount(0);
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
    const complete = await request.post("/api/onboarding", {
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
      data: { checklist: { browse: true }, checklistDismissed: true },
    });
    expect(patch.ok()).toBeTruthy();
    const updated = await patch.json();
    expect(updated.profile?.checklist?.browse).toBe(true);
    expect(updated.profile?.checklistDismissed).toBe(true);
  });
});
