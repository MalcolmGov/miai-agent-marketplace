import { test, expect } from "@playwright/test";

test.describe("App channel @smoke", () => {
  test("GET /app/v1 loads with smoke key", async ({ request }) => {
    const res = await request.get("/app/v1?key=mia_pk_smoke_test");
    expect(res.status()).toBe(200);
  });

  test("POST /api/app/chat rejects invalid public key", async ({ request }) => {
    // Default channel response is SSE (HTTP 200 + error event). JSON mode returns real 401.
    const res = await request.post("/api/app/chat", {
      headers: { accept: "application/json", "content-type": "application/json" },
      data: { key: "mia_pk_invalid", message: "hello" },
    });
    expect(res.status()).toBe(401);
  });
});
