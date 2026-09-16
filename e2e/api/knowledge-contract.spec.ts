import { test, expect } from "@playwright/test";
import { SMOKE_AGENT_ID, getJson, postJson } from "../helpers";
import {
  E2E_SESSION_SKIP_REASON,
  e2eSessionConfigured,
  sessionHeaders,
  targetAuthMode,
} from "../auth";

// Knowledge routes are gated business APIs under OIDC — authenticated via minted session.
let oidcTarget = false;
test.beforeAll(async ({ request }) => {
  oidcTarget = (await targetAuthMode(request)) === "oidc";
});

test.describe("Knowledge API contract @functional @handover", () => {
  test.beforeEach(() => {
    test.skip(oidcTarget && !e2eSessionConfigured(), E2E_SESSION_SKIP_REASON);
  });

  test("GET without agentId fails", async ({ request }) => {
    const { status, body } = await getJson<{ error?: string }>(
      request,
      "/api/knowledge",
      sessionHeaders(),
    );
    expect(status).toBe(400);
    expect(JSON.stringify(body)).toMatch(/agentId/i);
  });

  test("GET with agentId returns sources", async ({ request }) => {
    const { status, body } = await getJson<{
      sources?: unknown[];
      composedChars?: number;
    }>(request, `/api/knowledge?agentId=${SMOKE_AGENT_ID}`, sessionHeaders());
    expect(status).toBe(200);
    expect(Array.isArray(body.sources)).toBeTruthy();
  });

  test("paste creates a knowledge source", async ({ request }) => {
    const marker = `E2E paste ${Date.now()}`;
    const { status, body } = await postJson<{
      ok?: boolean;
      source?: { id?: string };
      id?: string;
    }>(
      request,
      "/api/knowledge/paste",
      {
        agentId: SMOKE_AGENT_ID,
        content: `## Notes\n- ${marker}\n`,
        title: "e2e-handover",
      },
      sessionHeaders(),
    );
    expect([200, 201]).toContain(status);
    expect(body.ok || body.source?.id || body.id).toBeTruthy();
  });
});
