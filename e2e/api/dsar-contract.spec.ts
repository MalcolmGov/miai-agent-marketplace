import { test, expect } from "@playwright/test";
import { getJson, getJsonWithRoles, postJson } from "../helpers";
import {
  E2E_SESSION_SKIP_REASON,
  e2eSessionConfigured,
  sessionHeaders,
  targetAuthMode,
} from "../auth";

// DSAR routes are gated business APIs under OIDC — authenticated via minted session.
let oidcTarget = false;
test.beforeAll(async ({ request }) => {
  oidcTarget = (await targetAuthMode(request)) === "oidc";
});

test.describe("DSAR API contract @functional @handover", () => {
  test.beforeEach(() => {
    test.skip(oidcTarget && !e2eSessionConfigured(), E2E_SESSION_SKIP_REASON);
  });

  test("export succeeds without leaking OAuth tokens", async ({ request }) => {
    const res = await request.get("/api/dsar/export", { headers: sessionHeaders() });
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
    // Without auth this is a 401 under OIDC (accepted below); the mock path proves 403.
    const { status } = await getJsonWithRoles(request, "/api/dsar/export", "readonly");
    expect([401, 403]).toContain(status);
  });

  test("erase without confirm is rejected (no destructive erase on staging)", async ({
    request,
  }) => {
    const { status, body } = await postJson<{ error?: string }>(
      request,
      "/api/dsar/erase",
      {},
      sessionHeaders(),
    );
    expect(status).toBe(400);
    expect(JSON.stringify(body)).toMatch(/confirm/i);
  });
});
