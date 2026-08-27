#!/usr/bin/env node
/**
 * Production-config boot-hardening GATE.
 *
 * Curls <BASE_URL>/api/health and asserts the platform is running in FULL production
 * configuration — real OIDC + wallet + model, no mock rails, fail-closed boot hardening,
 * Postgres + Redis. This is the GO / NO-GO gate to clear BEFORE the authenticated E2E
 * journeys (see docs/PROD_E2E.md). It needs no credentials — just the URL.
 *
 *   node scripts/prod-e2e-gate.mjs https://your-prod-config-url
 *   BASE_URL=https://... node scripts/prod-e2e-gate.mjs
 *
 * Exit 0 when every gate passes; 1 when any fails; 2 on usage / unreachable.
 */
let raw = (process.argv[2] || process.env.BASE_URL || process.env.APP_BASE_URL || "").trim();
while (raw.endsWith("/")) raw = raw.slice(0, -1);
if (!raw) {
  console.error("Usage: node scripts/prod-e2e-gate.mjs <BASE_URL>");
  process.exit(2);
}

// Validate the operator-supplied URL before any network use (http/https origin only).
let origin;
try {
  const parsed = new URL(raw);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("protocol must be http or https");
  }
  origin = parsed.origin;
} catch (err) {
  console.error(`Invalid BASE_URL "${raw}": ${err instanceof Error ? err.message : err}`);
  process.exit(2);
}

const url = `${origin}/api/health`;
let res, body;
try {
  res = await fetch(url, { headers: { accept: "application/json" } });
  body = await res.json();
} catch (err) {
  console.error(`\n✗ could not reach ${url}\n  ${err instanceof Error ? err.message : err}\n`);
  process.exit(2);
}

const REAL_MODELS = ["azure", "gateway", "openai", "anthropic", "claude"];
const checks = [
  ["HTTP 200", res.status === 200, `status ${res.status}`],
  ["health status = ok", body.status === "ok", `status=${body.status}`],
  ["sandbox mode OFF", body.sandboxMode === false, `sandboxMode=${body.sandboxMode}`],
  ["no mock rails permitted", body.mockRailsAllowed === false, `mockRailsAllowed=${body.mockRailsAllowed}`],
  ["boot hardening = ok", body.hardening === "ok", `hardening=${body.hardening}`],
  ["auth mode = oidc", body.authMode === "oidc", `authMode=${body.authMode}`],
  ["wallet mode = http", body.walletMode === "http", `walletMode=${body.walletMode}`],
  ["model mode = real", REAL_MODELS.includes(body.modelMode), `modelMode=${body.modelMode}`],
  ["OIDC issuer set", body.oidcIssuer === "set", `oidcIssuer=${body.oidcIssuer}`],
  ["wallet API URL set", body.walletUrl === "set", `walletUrl=${body.walletUrl}`],
  ["model credentials set", body.modelUrl === "set", `modelUrl=${body.modelUrl}`],
  ["store backend = postgres", body.storeBackend === "postgres", `storeBackend=${body.storeBackend}`],
  ["store ping = ok", body.storePing === "ok", `storePing=${body.storePing}`],
  ["redis configured", body.redisConfigured === true, `redisConfigured=${body.redisConfigured}`],
  ["redis ping = ok", body.redisPing === "ok", `redisPing=${body.redisPing}`],
  ["config not incomplete", body.config !== "incomplete", `config=${body.config ?? "ok"}`],
  ["NODE_ENV = production", body.nodeEnv === "production", `nodeEnv=${body.nodeEnv}`],
];

console.log(`\nProduction-config boot gate\n  ${url}\n`);
let failed = 0;
for (const [name, ok, detail] of checks) {
  const suffix = ok ? "" : `  — ${detail}`;
  console.log(`  ${ok ? "✓" : "✗"} ${name}${suffix}`);
  if (!ok) failed += 1;
}
console.log("");
if (failed) {
  console.error(`✗ ${failed}/${checks.length} gate(s) failed — NOT production-ready. Fix config, redeploy, re-run.\n`);
  if (Array.isArray(body.hardeningErrors) && body.hardeningErrors.length) {
    console.error("  boot-hardening errors:");
    for (const e of body.hardeningErrors) console.error(`   - ${e}`);
    console.error("");
  }
  process.exit(1);
}
console.log(`✓ all ${checks.length} gates passed — full production configuration verified.\n`);
