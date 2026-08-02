import { test, expect } from "@playwright/test";
import { assertHealthyStaging, getJson } from "../helpers";

test.describe("API health @smoke", () => {
  test("GET /api/health reports non-failing staging", async ({ request }) => {
    const { status, body } = await getJson(request, "/api/health");
    expect(status).toBeLessThan(500);
    assertHealthyStaging(body);
    expect(body).toHaveProperty("authMode");
    expect(body).toHaveProperty("storeBackend");
  });
});
