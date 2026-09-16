import { test, expect } from "@playwright/test";
import { dismissConsent } from "../helpers";
import { authenticateContext, e2eSessionConfigured, E2E_SESSION_SKIP_REASON } from "../auth";

/**
 * The fleet page's Delete action must open the in-app confirmation dialog — never the browser's
 * native `window.confirm` (unstyleable, one run-on sentence, leaks the host name). This spec also
 * pins the safety behaviour: Escape/Cancel leaves the workspace untouched.
 */
test.describe("My Agents · delete confirmation @uat @handover", () => {
  test.beforeEach(async ({ context, baseURL, page }) => {
    test.skip(!e2eSessionConfigured(), E2E_SESSION_SKIP_REASON);
    await authenticateContext(context, baseURL ?? "http://127.0.0.1:3000");
    // The consent banner is also role="dialog" — dismiss it so the assertions stay unambiguous.
    await dismissConsent(page);
  });

  test("opens the in-app dialog and Cancel keeps the agent", async ({ page }) => {
    let nativeDialogAppeared = false;
    page.on("dialog", async (dialog) => {
      nativeDialogAppeared = true;
      await dialog.dismiss();
    });

    await page.goto("/my-agents");
    const deleteButton = page.getByRole("button", { name: /^Delete$/ }).first();
    const hasFleet = await deleteButton
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!hasFleet, "This workspace has no rented agents to delete — run a rent first.");

    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    const dialog = page.getByRole("dialog", { name: "Delete agent?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Delete agent?" })).toBeVisible();
    await expect(dialog.getByText(/will be removed from this workspace/)).toBeVisible();
    await expect(dialog.getByText(/embed key stops working immediately/i)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Delete agent" })).toBeVisible();

    // The thing we replaced: no native confirm dialog may appear.
    expect(nativeDialogAppeared, "window.confirm must not be used anymore").toBe(false);

    // Escape cancels and the agent stays in the workspace.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(deleteButton).toBeVisible();
    expect(nativeDialogAppeared).toBe(false);
  });
});
