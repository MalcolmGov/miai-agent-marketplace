import { test, expect } from "@playwright/test";

test.describe("Security headers @smoke @handover", () => {
  test("home response carries hardening headers + CSP nonce", async ({ request }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
    const h = res.headers();
    expect(h["x-content-type-options"]).toMatch(/nosniff/i);
    expect(h["x-frame-options"]).toMatch(/SAMEORIGIN|DENY/i);
    expect(h["referrer-policy"]).toBeTruthy();
    expect(h["permissions-policy"] || "").toMatch(/camera=\(\)/);
    expect(h["strict-transport-security"] || "").toMatch(/max-age=/i);
    const csp = h["content-security-policy"] || "";
    expect(csp).toMatch(/nonce-/);
    expect(csp).toMatch(/strict-dynamic/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });
});
