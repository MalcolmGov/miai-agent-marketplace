import { test, expect } from "@playwright/test";
import { getJson, getJsonWithRoles, postJson } from "../helpers";

test.describe("DSAR API contract @functional @handover", () => {
  test("export succeeds without leaking OAuth tokens", async ({ request }) => {
    const res = await request.get("/api/dsar/export");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).not.toMatch(/accessToken|refreshToken|"access_token"|"refresh_token"/);
    const body = JSON.parse(text) as {
      exportType?: string;
      workspaceId?: string;
    };
    expect(body.exportType || body.workspaceId).toBeTruthy();
  });

  test("readonly cannot export", async ({ request }) => {
    const { status } = await getJsonWithRoles(request, "/api/dsar/export", "readonly");
    expect([403, 401]).toContain(status);
  });

  test("erase without confirm is rejected (no destructive erase on staging)", async ({
    request,
  }) => {
    const { status, body } = await postJson<{ error?: string }>(request, "/api/dsar/erase", {});
    expect(status).toBe(400);
    expect(JSON.stringify(body)).toMatch(/confirm/i);
  });
});
