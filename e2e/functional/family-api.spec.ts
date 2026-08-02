import { test, expect } from "@playwright/test";
import { getJson } from "../helpers";

test.describe("Functional · family capabilities API @functional", () => {
  test("GET /api/catalog/family/customer-support returns capability brief", async ({
    request,
  }) => {
    const { status, body } = await getJson<{
      family?: { id?: string; name?: string };
      capabilities?: { familyId?: string; summary?: string; name?: string };
    }>(request, "/api/catalog/family/customer-support");
    expect(status).toBe(200);
    expect(body.family?.id || body.capabilities?.familyId).toBe("customer-support");
    expect(body.capabilities?.summary || body.family?.name).toBeTruthy();
  });
});
