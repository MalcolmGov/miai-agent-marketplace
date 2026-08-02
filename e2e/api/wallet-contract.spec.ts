import { test, expect } from "@playwright/test";
import { getJson, postJsonWithRoles } from "../helpers";

test.describe("Wallet API contract @functional @handover", () => {
  test("GET /api/wallet returns token balance", async ({ request }) => {
    const { status, body } = await getJson<{
      tokens?: number;
      balance?: { tokens?: number };
    }>(request, "/api/wallet");
    expect(status).toBe(200);
    const tokens = body.tokens ?? body.balance?.tokens;
    expect(typeof tokens).toBe("number");
  });

  test("readonly cannot top up", async ({ request }) => {
    const { status, body } = await postJsonWithRoles(
      request,
      "/api/wallet",
      { packageId: "10" },
      "readonly",
    );
    expect(status).toBe(403);
    expect(JSON.stringify(body)).toMatch(/admin|role|forbidden|403/i);
  });
});
