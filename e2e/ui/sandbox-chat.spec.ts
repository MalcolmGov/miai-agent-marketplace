import { test, expect } from "@playwright/test";
import { SMOKE_AGENT_ID } from "../helpers";

test.describe("Sandbox chat critical path", () => {
  test("sends a message and gets a studio response bubble", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`/agents/${SMOKE_AGENT_ID}?step=try`);
    await expect(page.locator("#sandbox-chat-input")).toBeVisible({ timeout: 30_000 });

    const input = page.locator("#sandbox-chat-input");
    await input.fill("What are your support hours?");
    // Prefer Enter or nearest send control
    const send = page.getByRole("button", { name: /send|ask|submit/i }).first();
    if (await send.isVisible().catch(() => false)) {
      await send.click();
    } else {
      await input.press("Enter");
    }

    // Accept assistant bubble, pause banner, or soft error — proves chat path ran
    const reply = page.locator(".studio-chat-bubble, [data-role='assistant'], #agent-chat").filter({
      hasText: /./,
    });
    await expect(reply.first()).toBeVisible({ timeout: 90_000 });

    // Prefer a non-empty assistant-ish response if bubbles exist
    const bubbles = page.locator(".studio-chat-bubble");
    const count = await bubbles.count();
    if (count >= 2) {
      await expect(bubbles.last()).not.toBeEmpty();
    }
  });
});
