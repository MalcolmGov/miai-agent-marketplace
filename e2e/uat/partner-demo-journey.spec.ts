import { test, expect } from "@playwright/test";
import { SMOKE_AGENT_ID, postJson, openCatalogue } from "../helpers";
import {
  authHeaders,
  authenticateContext,
  e2eSessionConfigured,
  E2E_SESSION_SKIP_REASON,
} from "../auth";

/**
 * UAT · Partner demo acceptance journey
 * Mirrors what a buyer walks through in a live diligence session.
 */
test.describe("UAT · partner demo journey @uat", () => {
  // The full journey touches gated business surfaces (studio pages + rent API) under OIDC.
  test.beforeEach(async ({ context, baseURL }) => {
    if (e2eSessionConfigured()) {
      await authenticateContext(context, baseURL ?? "http://127.0.0.1:3000");
    }
  });

  test("browse → rent → try chat → install surface", async ({ page, request }) => {
    test.skip(!e2eSessionConfigured(), E2E_SESSION_SKIP_REASON);
    test.setTimeout(180_000);

    // 1. Catalogue proves scale (public browse hub at /agents)
    await openCatalogue(page);
    await expect(page.getByRole("link", { name: /Rent \/ setup|Setup/i }).first()).toBeVisible();

    // 2. Open hero agent studio
    await page.goto(`/agents/${SMOKE_AGENT_ID}`);
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 30_000 });

    // 3. Rent under mock rails (API — UI card flows vary by prior rent state)
    const rent = await postJson(request, "/api/rent", {
      agentId: SMOKE_AGENT_ID,
      plan: "standard",
    }, authHeaders());
    expect([200, 201, 409]).toContain(rent.status);

    // 4. Golden-path try: ask a grounded question
    await page.goto(`/agents/${SMOKE_AGENT_ID}?step=try`);
    await expect(page.locator("#sandbox-chat-input")).toBeVisible({ timeout: 30_000 });
    await page.locator("#sandbox-chat-input").fill("What are your support hours?");
    const send = page.getByRole("button", { name: /send|ask|submit/i }).first();
    if (await send.isVisible().catch(() => false)) {
      await send.click();
    } else {
      await page.locator("#sandbox-chat-input").press("Enter");
    }
    await expect(page.locator("#agent-chat")).toContainText(/.{8,}/, { timeout: 90_000 });

    // 5. Install surface available after rent
    await page.goto(`/agents/${SMOKE_AGENT_ID}?step=install`);
    await expect(page.getByText(/agent\.js|Copy|embed|App/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("Go-live 100 shortlist is demonstrable from /agents?pilot=1", async ({ page }) => {
    // Public — no session needed (the /agents hub deliberately stays open).
    await page.goto("/agents?pilot=1#catalogue");
    await expect(page.locator("#catalogue")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /Go-live 100/i })).toBeVisible();
    // At least one featured vertical present
    await expect(
      page.getByText(/Customer Support|Executive|Hotel|Dental|Sales/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });
});
