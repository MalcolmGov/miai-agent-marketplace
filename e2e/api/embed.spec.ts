import { test, expect } from "@playwright/test";
import { getJson } from "../helpers";

test.describe("Embed surface @smoke", () => {
  test("GET /agents/v1/agent.js serves script with integrity header", async ({ request }) => {
    const res = await request.get("/agents/v1/agent.js");
    expect(res.status()).toBe(200);
    const ct = res.headers()["content-type"] || "";
    expect(ct).toMatch(/javascript|ecmascript/i);
    const body = await res.text();
    expect(body.length).toBeGreaterThan(200);
    expect(body).toMatch(/\/api\/embed\/chat/);
    const integrity = res.headers()["x-miai-script-integrity"];
    expect(integrity, "x-miai-script-integrity").toBeTruthy();
  });

  test("GET /api/embed/sri returns integrity", async ({ request }) => {
    const { status, body } = await getJson<{ integrity?: string }>(request, "/api/embed/sri");
    expect(status).toBe(200);
    expect(body.integrity).toMatch(/^sha\d+-/);
  });
});
