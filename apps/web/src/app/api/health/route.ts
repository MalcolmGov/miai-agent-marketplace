import { NextResponse } from "next/server";
import { ensureStoreHydrated, pingStore } from "@/lib/store";
import { telemetryMode } from "@/lib/telemetry";

export const dynamic = "force-dynamic";

export async function GET() {
  const authMode = process.env.MIAI_AUTH_MODE ?? "mock";
  const walletMode = process.env.MIAI_WALLET_MODE ?? "mock";
  const modelMode = process.env.MIAI_MODEL_MODE ?? "mock";

  const checks: Record<string, string | boolean> = {
    status: "ok",
    authMode,
    walletMode,
    modelMode,
    database: process.env.DATABASE_URL || process.env.MIAI_DATABASE_URL ? "configured" : "file-fallback",
    telemetry: telemetryMode(),
    oidcIssuer: authMode === "oidc" ? (process.env.MIAI_OIDC_ISSUER ? "set" : "missing") : "n/a",
    walletUrl: walletMode === "http" ? (process.env.MIAI_WALLET_API_URL ? "set" : "missing") : "n/a",
    modelUrl:
      modelMode === "gateway"
        ? process.env.MIAI_MODEL_GATEWAY_URL
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

  const ping = await pingStore();
  checks.storeBackend = ping.backend;
  checks.storePing = ping.ok ? "ok" : "error";
  if (ping.error) checks.storePingError = ping.error;

  if (!ping.ok) {
    checks.status = "degraded";
    return NextResponse.json(checks, { status: 503 });
  }

  try {
    await ensureStoreHydrated();
    checks.store = "hydrated";
  } catch (err) {
    checks.store = "error";
    checks.storeError = err instanceof Error ? err.message : "unknown";
    checks.status = "degraded";
    return NextResponse.json(checks, { status: 503 });
  }

  const configMissing =
    (authMode === "oidc" && !process.env.MIAI_OIDC_ISSUER) ||
    (walletMode === "http" && !process.env.MIAI_WALLET_API_URL) ||
    (modelMode === "gateway" && !process.env.MIAI_MODEL_GATEWAY_URL);

  if (configMissing) {
    checks.status = "degraded";
    checks.config = "incomplete";
    // Still 200 so CA liveness does not flap on missing partner creds during bring-up;
    // readiness operators should inspect status/config fields.
  }

  return NextResponse.json(checks);
}
