import { test, expect } from "@playwright/test";
import { SMOKE_AGENT_ID, postJson } from "../helpers";

test.describe("Functional · studio setup journey @functional", () => {
  test.beforeEach(async ({ request }) => {
    await postJson(request, "/api/rent", {
      agentId: SMOKE_AGENT_ID,
      plan: "standard",
    });
  });

  test("knowledge → try → install steps are reachable", async ({ page }) => {
    await page.goto(`/agents/${SMOKE_AGENT_ID}?step=knowledge`);
    await expect(page.locator("#studio-knowledge")).toBeVisible({ timeout: 30_000 });

    await page.goto(`/agents/${SMOKE_AGENT_ID}?step=try`);
    await expect(page.locator("#agent-chat")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#sandbox-chat-input")).toBeVisible();

    await page.goto(`/agents/${SMOKE_AGENT_ID}?step=install`);
    await expect(page.getByText(/agent\.js|Copy code|embed|App link|Rent/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("model picker is present on knowledge step", async ({ page }) => {
    await page.goto(`/agents/${SMOKE_AGENT_ID}?step=knowledge`);
    await expect(page.locator("#studio-model")).toBeVisible({ timeout: 30_000 });
  });

  test("POST /api/configure persists knowledge draft", async ({ request }) => {
    const marker = `E2E functional knowledge ${Date.now()}`;
    const save = await postJson(request, "/api/configure", {
      agentId: SMOKE_AGENT_ID,
      knowledge: `## Key facts\n- ${marker}\n`,
      markRented: false,
    });
    expect([200, 201]).toContain(save.status);

    const read = await request.get(`/api/agents/${SMOKE_AGENT_ID}`);
    expect(read.status()).toBe(200);
    const json = (await read.json()) as {
      rental?: { knowledge?: string };
      knowledge?: string;
    };
    const kb = json.rental?.knowledge || json.knowledge || "";
    expect(kb).toContain(marker);
  });
});
