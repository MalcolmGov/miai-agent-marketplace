#!/usr/bin/env node
/**
 * Zero-LLM OAuth probes against a running app.
 *
 *   DEMO_BASE=https://miaiweb-production.up.railway.app pnpm proof:probe
 *
 * Calls POST /api/oauth/{connector}/test for each connected Phase-1 connector.
 * No Anthropic tokens. Tiny vendor API cost only.
 */
const BASE = (process.env.DEMO_BASE || process.env.PROOF_BASE || "").replace(/\/$/, "");
const WORKSPACE = process.env.PROOF_WORKSPACE || "demo-workspace";
const PROOF_HEADER = process.env.PROOF_HARNESS_SECRET || "";

const PROBE_ORDER = ["slack", "google_calendar", "hubspot", "email"];

async function j(pathname, init = {}) {
  const headers = {
    "content-type": "application/json",
    ...(PROOF_HEADER ? { "x-miai-proof": PROOF_HEADER } : {}),
    ...(init.headers || {}),
  };
  const res = await fetch(`${BASE}${pathname}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  if (!BASE) {
    console.error("Set DEMO_BASE (or PROOF_BASE) to the web app origin");
    process.exit(1);
  }
  console.log(`Wave 4 OAuth probes → ${BASE} (workspace=${WORKSPACE})\n`);

  const status = await j(`/api/oauth/status?workspaceId=${encodeURIComponent(WORKSPACE)}`);
  if (status.status >= 400) {
    console.error("oauth/status failed", status.status, status.body);
    process.exit(1);
  }

  const connected = new Set(status.body.connected || []);
  const oauth = Object.fromEntries((status.body.oauth || []).map((o) => [o.id, o]));

  console.log("Connected:", [...connected].join(", ") || "(none)");
  console.log("");

  const results = [];
  for (const id of PROBE_ORDER) {
    const meta = oauth[id] || {};
    if (!meta.configured) {
      console.log(`SKIP ${id} — env not configured`);
      results.push({ connector: id, status: "env_missing" });
      continue;
    }
    if (!connected.has(id)) {
      console.log(`SKIP ${id} — not connected`);
      results.push({ connector: id, status: "not_connected" });
      continue;
    }
    const out = await j(`/api/oauth/${id}/test`, {
      method: "POST",
      body: JSON.stringify({ workspaceId: WORKSPACE }),
    });
    const ok = Boolean(out.body?.ok);
    const mark = ok ? "OK" : "FAIL";
    console.log(
      `${mark} ${id}` +
        (out.body?.account ? ` — ${out.body.account}` : "") +
        (out.body?.detail ? ` (${out.body.detail})` : "") +
        (out.body?.error ? ` — ${out.body.error}` : ""),
    );
    results.push({
      connector: id,
      status: ok ? "ok" : "fail",
      account: out.body?.account,
      detail: out.body?.detail,
      error: out.body?.error,
      http: out.status,
    });
  }

  const reportDir = new URL("../docs/reports/", import.meta.url);
  const { writeFileSync, mkdirSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const dir = fileURLToPath(reportDir);
  mkdirSync(dir, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  const reportPath = `${dir}oauth-probes-${day}.json`;
  writeFileSync(
    reportPath,
    JSON.stringify({ at: new Date().toISOString(), base: BASE, workspace: WORKSPACE, results }, null, 2) +
      "\n",
  );
  console.log(`\nReport → ${reportPath}`);

  // Phase-1 core: Slack / Calendar / HubSpot. Email scope gaps are a warning
  // (often Calendar-only Google consent) — don't fail the whole probe job.
  const coreFailed = results.filter(
    (r) => r.status === "fail" && r.connector !== "email",
  );
  const emailFailed = results.find((r) => r.connector === "email" && r.status === "fail");
  if (emailFailed) {
    console.log(
      "\nNote: email probe failed (often missing Gmail scopes on the Google token). Re-Connect Google Email with gmail.send/readonly.",
    );
  }
  if (coreFailed.length) process.exitCode = 2;
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
