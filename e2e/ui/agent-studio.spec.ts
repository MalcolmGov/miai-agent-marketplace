import { test, expect } from "@playwright/test";
import { SMOKE_AGENT_ID } from "../helpers";

test.describe("Agent Studio UI @smoke", () => {
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
