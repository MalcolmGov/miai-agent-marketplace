import { test, expect } from "@playwright/test";
import { getJson } from "../helpers";

/**
 * Production-config boot GATE (@prod).
 *
 * Runs ONLY against an environment configured for FULL production — real OIDC + wallet + model,
 * no mock rails, fail-closed hardening, Postgres + Redis. It is tagged @prod so the default
 * staging/handover suites skip it (they run mock rails and would fail these strict assertions).
 *
 *   PLAYWRIGHT_BASE_URL=https://<prod-config-url> pnpm test:e2e:prod
 *
 * This is the go/no-go gate to clear BEFORE the authenticated E2E journeys (docs/PROD_E2E.md).
 */
const REAL_MODELS = ["azure", "gateway", "openai", "anthropic", "claude"];

test.describe("Production-config boot gate @prod", () => {
  test("platform is running in full production configuration", async ({ request }) => {
    const { status, body } = await getJson<Record<string, unknown>>(request, "/api/health");

    expect(status, "health must be 200").toBe(200);
    expect(body.status, "overall health status").toBe("ok");

    // Rails are real — no mock, no sandbox.
    expect(body.sandboxMode, "sandbox must be off").toBe(false);
    expect(body.mockRailsAllowed, "mock rails must be refused in prod").toBe(false);
    expect(body.hardening, "boot hardening must pass").toBe("ok");
    expect(body.authMode, "auth mode").toBe("oidc");
    expect(body.walletMode, "wallet mode").toBe("http");
    expect(REAL_MODELS, "model mode must be a real provider").toContain(body.modelMode);

    // Partner-supplied config is present.
    expect(body.oidcIssuer, "OIDC issuer configured").toBe("set");
    expect(body.walletUrl, "wallet API URL configured").toBe("set");
    expect(body.modelUrl, "model credentials configured").toBe("set");
    expect(body.config, "no incomplete config").not.toBe("incomplete");

    // Persistence + cache are real and reachable.
    expect(body.storeBackend, "store backend").toBe("postgres");
    expect(body.storePing, "store ping").toBe("ok");
    expect(body.redisConfigured, "redis configured (multi-replica rate limiting)").toBe(true);
    expect(body.redisPing, "redis ping").toBe("ok");

    expect(body.nodeEnv, "NODE_ENV").toBe("production");
  });
});
