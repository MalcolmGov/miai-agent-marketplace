import { test, expect } from "@playwright/test";
import { assertHealthyStaging, getJson } from "../helpers";

test.describe("Health B+ hardening @smoke @handover", () => {
  test("exposes ops fields required for partner staging bar", async ({ request }) => {
    const { status, body } = await getJson<Record<string, unknown>>(request, "/api/health");
    expect(status).toBeLessThan(500);
    assertHealthyStaging(body);
    expect(body.storeBackend).toBe("postgres");
    expect(typeof body.mockRailsAllowed).toBe("boolean");
    expect(body.authMode).toBeTruthy();
    expect(body.walletMode).toBeTruthy();
    expect(body.modelMode).toBeTruthy();
    if (body.hardening != null) {
      expect(["ok", "warn", "failing"]).toContain(body.hardening);
      expect(body.hardening).not.toBe("failing");
    }
    if (body.redisConfigured === true) {
      expect(body.redisPing).toBe("ok");
    } else if (body.redisPing != null) {
      expect(["ok", "not_configured"]).toContain(body.redisPing);
    }
  });
});
