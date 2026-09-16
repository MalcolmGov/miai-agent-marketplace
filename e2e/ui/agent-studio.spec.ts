import { test, expect } from "@playwright/test";
import { SMOKE_AGENT_ID } from "../helpers";
import { authenticateContext, e2eSessionConfigured, E2E_SESSION_SKIP_REASON } from "../auth";

// The studio (/agents/:id) is a gated business page under OIDC — these tests run with a
// minted business session (e2e/auth.ts) and skip cleanly when no session secret is set.
test.describe("Agent Studio UI @smoke", () => {
  test.skip(!e2eSessionConfigured(), E2E_SESSION_SKIP_REASON);

  test.beforeEach(async ({ context, baseURL }) => {
    await authenticateContext(context, baseURL ?? "http://127.0.0.1:3000");
  });

  test("agent detail loads studio shell", async ({ page }) => {
    await page.goto(`/agents/${SMOKE_AGENT_ID}`);
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 30_000 });
    // Setup / model controls or chat region present
    const studio = page.locator("#studio-model, #agent-chat, #studio-knowledge").first();
    await expect(studio).toBeVisible({ timeout: 30_000 });
  });

  test("try step deep-link shows sandbox chat", async ({ page }) => {
    await page.goto(`/agents/${SMOKE_AGENT_ID}?step=try`);
    await expect(page.locator("#agent-chat")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#sandbox-chat-input")).toBeVisible();
  });
});
