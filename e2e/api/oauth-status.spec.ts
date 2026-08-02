import { test, expect } from "@playwright/test";
import { getJson } from "../helpers";

test.describe("OAuth status @functional @handover", () => {
  test("GET /api/oauth/status returns workspace connector map", async ({ request }) => {
    const { status, body } = await getJson<{
      workspaceId?: string;
      callbackUrl?: string;
      oauth?: Array<{ id?: string; configured?: boolean; connected?: boolean }>;
      oauthConnectors?: unknown[];
      connected?: unknown;
    }>(request, "/api/oauth/status");
    expect(status).toBe(200);
    expect(body.workspaceId).toBeTruthy();
    expect(typeof body.callbackUrl).toBe("string");
    const list = body.oauth || body.oauthConnectors;
    expect(Array.isArray(list)).toBeTruthy();
  });
});
