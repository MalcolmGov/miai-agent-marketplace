import { test, expect } from "@playwright/test";
import { postJson } from "../helpers";

test.describe("Consent API contract @functional @handover", () => {
  test("records essential choice", async ({ request }) => {
    const { status, body } = await postJson<{ ok?: boolean; choice?: string }>(
      request,
      "/api/consent",
      { choice: "essential" },
    );
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.choice).toBe("essential");
  });

  test("rejects invalid choice", async ({ request }) => {
    const { status } = await postJson(request, "/api/consent", { choice: "bogus" });
    expect(status).toBe(400);
  });
});
