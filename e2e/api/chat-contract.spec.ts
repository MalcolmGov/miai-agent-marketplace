import { test, expect } from "@playwright/test";
import { SMOKE_AGENT_ID, postJson, postJsonWithRoles } from "../helpers";

test.describe("Chat API contract @functional @handover", () => {
  test("rejects empty body with 400", async ({ request }) => {
    const { status, body } = await postJson<{ error?: string }>(request, "/api/chat", {});
    expect(status).toBe(400);
    expect(body.error || "").toMatch(/Invalid request body/i);
  });

  test("readonly role cannot chat", async ({ request }) => {
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
    }>(request, "/api/chat", {
      agentId: SMOKE_AGENT_ID,
      message: "What are your support hours?",
      mode: "sandbox",
    });
    expect(status).toBe(200);
    const msg = body.assistantMessage || body.reply || "";
    expect(msg.length).toBeGreaterThanOrEqual(8);
    expect(body.correlationId).toBeTruthy();
  });
});
