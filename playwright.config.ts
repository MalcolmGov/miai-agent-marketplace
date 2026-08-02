import { defineConfig, devices } from "@playwright/test";

const baseURL = (
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.BASE ||
  process.env.APP_BASE_URL ||
  "https://miaiweb-production.up.railway.app"
).replace(/\/$/, "");

/**
 * Platform automation — API + UI against staging by default.
 * Local: PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm test:e2e
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }], ["list"]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    extraHTTPHeaders: {
      "x-workspace-id": process.env.E2E_WORKSPACE_ID || "demo-workspace",
      "x-user-id": process.env.E2E_USER_ID || "e2e-user",
      "x-roles": process.env.E2E_ROLES || "owner,operator",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
