import { test, expect } from "@playwright/test";
import { getJson } from "../helpers";
import {
  E2E_SESSION_SKIP_REASON,
  e2eSessionConfigured,
  sessionHeaders,
  targetAuthMode,
} from "../auth";

// Insights + history are gated business APIs under OIDC — authenticated via minted session.
let oidcTarget = false;
test.beforeAll(async ({ request }) => {
  oidcTarget = (await targetAuthMode(request)) === "oidc";
});

test.describe("Insights + history APIs @functional @handover", () => {
  test.beforeEach(() => {
    test.skip(oidcTarget && !e2eSessionConfigured(), E2E_SESSION_SKIP_REASON);
  });

  test("GET /api/insights returns workspace KPIs", async ({ request }) => {
    const { status, body } = await getJson<{
      workspaceId?: string;
      kpis?: { tokensUsed?: number };
      byAgent?: unknown[];
      source?: string;
      tokensUsed?: number;
    }>(request, "/api/insights", sessionHeaders());
    expect(status).toBe(200);
    expect(body.workspaceId || body.kpis || body.byAgent).toBeTruthy();
  });

  test("GET /api/history/turns returns turn list", async ({ request }) => {
    const { status, body } = await getJson<{
      count?: number;
      turns?: unknown[];
      items?: unknown[];
    }>(request, "/api/history/turns?limit=10", sessionHeaders());
    expect(status).toBe(200);
    const turns = body.turns || body.items;
    expect(Array.isArray(turns)).toBeTruthy();
  });
});
