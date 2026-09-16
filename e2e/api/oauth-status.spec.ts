import { test, expect } from "@playwright/test";
import { getJson } from "../helpers";
import {
  E2E_SESSION_SKIP_REASON,
  e2eSessionConfigured,
  sessionHeaders,
  targetAuthMode,
} from "../auth";

// /api/oauth/status is a gated business API under OIDC — authenticated via minted session.
let oidcTarget = false;
test.beforeAll(async ({ request }) => {
  oidcTarget = (await targetAuthMode(request)) === "oidc";
});

test.describe("OAuth status @functional @handover", () => {
  test.beforeEach(() => {
    test.skip(oidcTarget && !e2eSessionConfigured(), E2E_SESSION_SKIP_REASON);
  });

  test("GET /api/oauth/status returns workspace connector map", async ({ request }) => {
    const { status, body } = await getJson<{
      workspaceId?: string;
      callbackUrl?: string;
      oauth?: Array<{ id?: string; configured?: boolean; connected?: boolean }>;
      oauthConnectors?: unknown[];
      connected?: unknown;
    }>(request, "/api/oauth/status", sessionHeaders());
    expect(status).toBe(200);
    expect(body.workspaceId).toBeTruthy();
    expect(typeof body.callbackUrl).toBe("string");
    const list = body.oauth || body.oauthConnectors;
    expect(Array.isArray(list)).toBeTruthy();
  });
});
