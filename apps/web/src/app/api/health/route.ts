import { missingRuntimeConfig } from "@/lib/readiness-config";
import { ensureStoreHydrated, pingStore } from "@/lib/store";
import { pingRedis } from "@/lib/redis";
import { telemetryMode } from "@/lib/telemetry";
import { checkBootHardening, mockRailsAllowed } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  const authMode = process.env.MIAI_AUTH_MODE ?? "mock";
  const walletMode = process.env.MIAI_WALLET_MODE ?? "mock";
  const modelMode = process.env.MIAI_MODEL_MODE ?? "mock";

  const hardening = checkBootHardening();
  const checks: Record<string, string | boolean | string[]> = {
    status: "ok",
    authMode,
    walletMode,
    modelMode,
    mockRailsAllowed: mockRailsAllowed(),
    sandboxMode: process.env.SANDBOX_MODE === "1",
    nodeEnv: process.env.NODE_ENV ?? "unset",
    hardening: hardening.ok ? "ok" : "fail",
    database: process.env.DATABASE_URL || process.env.MIAI_DATABASE_URL ? "configured" : "file-fallback",
    telemetry: telemetryMode(),
    oidcIssuer: authMode === "oidc" ? (process.env.MIAI_OIDC_ISSUER ? "set" : "missing") : "n/a",
    walletUrl: walletMode === "http" ? (process.env.MIAI_WALLET_API_URL ? "set" : "missing") : "n/a",
    modelUrl:
      (modelMode === "gateway" || modelMode === "http")
        ? process.env.MIAI_MODEL_GATEWAY_URL
          ? "set"
          : "missing"
        : modelMode === "azure"
          ? process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT
            ? "set"
            : "missing"
          : modelMode === "openai"
            ? process.env.OPENAI_API_KEY
              ? "set"
              : "missing"
            : modelMode === "anthropic" || modelMode === "claude"
              ? process.env.ANTHROPIC_API_KEY
                ? "set"
                : "missing"
              : "n/a",
  };

  if (!hardening.ok) {
    checks.status = "failing";
    checks.hardeningErrors = hardening.errors;
    return Response.json(checks, { status: 503 });
  }

  const missing = missingRuntimeConfig();
  if (missing.length) {
    checks.status = "degraded";
    checks.config = "incomplete";
    checks.missingConfig = missing;
    return Response.json(checks, { status: 503 });
  }

  const ping = await pingStore();
  checks.storeBackend = ping.backend;
  checks.storePing = ping.ok ? "ok" : "error";
  if (ping.error) checks.storePingError = "store unavailable";

  if (!ping.ok) {
    checks.status = "degraded";
    return Response.json(checks, { status: 503 });
  }

  try {
    await ensureStoreHydrated();
    checks.store = "hydrated";
  } catch (err) {
    checks.store = "error";
    console.error("[health] store hydration failed", err);
    checks.storeError = "store initialization failed";
    checks.status = "degraded";
    return Response.json(checks, { status: 503 });
  }

  // Redis is optional for single-replica; when configured, surface ping for B+ ops bar.
  const redis = await pingRedis();
  checks.redisConfigured = redis.configured;
  checks.redisBackend = redis.backend;
  checks.redisPing = redis.configured ? (redis.ok ? "ok" : "error") : "not_configured";
  if (redis.configured && !redis.ok) {
    checks.redisPingError = "redis unavailable";
    // Configured-but-broken Redis is degraded (rate-limit/sessions fail closed).
    checks.status = "degraded";
  }

  return Response.json(checks, { status: checks.status === "ok" ? 200 : 503 });
}
