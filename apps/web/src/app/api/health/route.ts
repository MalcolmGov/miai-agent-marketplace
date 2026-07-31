import { NextResponse } from "next/server";
import { ensureStoreHydrated } from "@/lib/store";
import { telemetryMode } from "@/lib/telemetry";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {
    status: "ok",
    authMode: process.env.MIAI_AUTH_MODE ?? "mock",
    walletMode: process.env.MIAI_WALLET_MODE ?? "mock",
    modelMode: process.env.MIAI_MODEL_MODE ?? "mock",
    database: process.env.DATABASE_URL || process.env.MIAI_DATABASE_URL ? "configured" : "file-fallback",
    telemetry: telemetryMode(),
  };

  try {
    await ensureStoreHydrated();
    checks.store = "hydrated";
  } catch (err) {
    checks.store = "error";
    checks.storeError = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(checks, { status: 503 });
  }

  return NextResponse.json(checks);
}
