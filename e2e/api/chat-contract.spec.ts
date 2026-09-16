import { test, expect } from "@playwright/test";
import { SMOKE_AGENT_ID, postJson, postJsonWithRoles } from "../helpers";
import {
  E2E_SESSION_SKIP_REASON,
  MOCK_ROLES_SKIP_REASON,
  e2eSessionConfigured,
  sessionHeaders,
  targetAuthMode,
} from "../auth";

// /api/chat is a gated business API. Under OIDC the mock x-roles headers are ignored, so
// the contract is exercised with a minted business session (e2e/auth.ts); without the
// secret on an OIDC target those tests skip cleanly.
let oidcTarget = false;
test.beforeAll(async ({ request }) => {
  oidcTarget = (await targetAuthMode(request)) === "oidc";
});

test.describe("Chat API contract @functional @handover", () => {
  test.beforeEach(() => {
    test.skip(oidcTarget && !e2eSessionConfigured(), E2E_SESSION_SKIP_REASON);
  });

  test("rejects empty body with 400", async ({ request }) => {
    const { status, body } = await postJson<{ error?: string }>(
      request,
      "/api/chat",
      {},
      sessionHeaders(),
    );
    expect(status).toBe(400);
    expect(body.error || "").toMatch(/Invalid request body/i);
  });

  test("readonly role cannot chat", async ({ request }) => {
    // Mock identity is the only way to present a non-owner role headlessly.
    test.skip(oidcTarget, MOCK_ROLES_SKIP_REASON);
    const { status, body } = await postJsonWithRoles<{ error?: string }>(
      request,
      "/api/chat",
      { agentId: SMOKE_AGENT_ID, message: "hi" },
      "readonly",
    );
    expect(status).toBe(403);
    expect(JSON.stringify(body)).toMatch(/agent|role|forbidden|403/i);
  });

  test("happy path returns assistant message + correlation id", async ({ request }) => {
    test.setTimeout(90_000);
    const { status, body } = await postJson<{
      assistantMessage?: string;
      correlationId?: string;
      reply?: string;
    }>(
      request,
      "/api/chat",
      {
        agentId: SMOKE_AGENT_ID,
        message: "What are your support hours?",
        mode: "sandbox",
      },
      sessionHeaders(),
    );
    expect(status).toBe(200);
    const msg = body.assistantMessage || body.reply || "";
    expect(msg.length).toBeGreaterThanOrEqual(8);
    expect(body.correlationId).toBeTruthy();
  });
});
