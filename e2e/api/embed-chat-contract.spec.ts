import { test, expect } from "@playwright/test";

test.describe("Embed chat contract @functional @handover", () => {
  test("invalid key returns 401 JSON", async ({ request }) => {
    const res = await request.post("/api/embed/chat", {
      headers: { accept: "application/json", "content-type": "application/json" },
      data: { key: "mia_pk_invalid", message: "hi" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(/Invalid key|401/i);
  });

  test("missing key returns 400", async ({ request }) => {
    const res = await request.post("/api/embed/chat", {
      headers: { accept: "application/json", "content-type": "application/json" },
      data: { message: "hi" },
    });
    expect(res.status()).toBe(400);
  });

  test("OPTIONS preflight returns 204", async ({ request }) => {
    const res = await request.fetch("/api/embed/chat", { method: "OPTIONS" });
    expect([204, 200]).toContain(res.status());
  });

  test("v1 embed chat invalid key returns 401", async ({ request }) => {
    const res = await request.post("/api/v1/embed/chat", {
      headers: { accept: "application/json", "content-type": "application/json" },
      data: { key: "mia_pk_invalid", message: "hi" },
    });
    expect(res.status()).toBe(401);
  });
});
