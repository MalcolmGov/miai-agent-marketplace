import { test, expect } from "@playwright/test";
import { getJson, postJsonWithRoles } from "../helpers";
import {
  E2E_SESSION_SKIP_REASON,
  MOCK_ROLES_SKIP_REASON,
  e2eSessionConfigured,
  sessionHeaders,
  targetAuthMode,
} from "../auth";

// /api/wallet is a gated business API under OIDC — authenticated via minted session.
let oidcTarget = false;
test.beforeAll(async ({ request }) => {
  oidcTarget = (await targetAuthMode(request)) === "oidc";
});

test.describe("Wallet API contract @functional @handover", () => {
  test.beforeEach(() => {
    test.skip(oidcTarget && !e2eSessionConfigured(), E2E_SESSION_SKIP_REASON);
  });

  test("GET /api/wallet returns token balance", async ({ request }) => {
    const { status, body } = await getJson<{
      tokens?: number;
      balance?: { tokens?: number };
    }>(request, "/api/wallet", sessionHeaders());
    expect(status).toBe(200);
    const tokens = body.tokens ?? body.balance?.tokens;
    expect(typeof tokens).toBe("number");
  });

  test("readonly cannot top up", async ({ request }) => {
    // Mock identity is the only way to present a non-owner role headlessly.
    test.skip(oidcTarget, MOCK_ROLES_SKIP_REASON);
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
