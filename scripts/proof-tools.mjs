#!/usr/bin/env node
/**
 * Scripted live tool sweep — bypasses the LLM (no Anthropic tokens).
 *
 *   DEMO_BASE=https://… pnpm proof:tools --golive100
 *   DEMO_BASE=https://… pnpm proof:tools --golive18 --auto-record
 *   DEMO_BASE=https://… pnpm proof:tools --only=us-salon-booking,us-executive-assistant
 *
 * Default: read-only calendar checks only.
 * Add --writes to also fire Slack handoff / HubSpot capture (side effects).
 *
 * Requires deployed POST /api/proof/tool (+ mock-rails or PROOF_HARNESS_SECRET).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { recordProof } from "./lib/wave4-record.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const catalogDir = path.join(root, "data/catalog");
const mondayPath = path.join(root, "apps/web/src/lib/monday-pilot.ts");

const BASE = (process.env.DEMO_BASE || process.env.PROOF_BASE || "").replace(/\/$/, "");
const WORKSPACE = process.env.PROOF_WORKSPACE || "demo-workspace";
const PROOF_HEADER = process.env.PROOF_HARNESS_SECRET || "";

const doAutoRecord = process.argv.includes("--auto-record");
const allowWrites = process.argv.includes("--writes");
const golive100 = process.argv.includes("--golive100");
const golive18 = process.argv.includes("--golive18");

function argValue(flag) {
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function onlyFilter() {
  const raw = argValue("--only");
  if (!raw) return null;
  return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
}

function loadFamilyFilter() {
  if (!golive100 && !golive18) return null;
  const src = fs.readFileSync(mondayPath, "utf8");
  const key = golive18 ? "GO_LIVE_18_FAMILY_IDS" : "MONDAY_PILOT_FAMILY_IDS";
  const m = src.match(new RegExp(`export const ${key} = \\[([\\s\\S]*?)\\] as const`));
  if (!m) return null;
  return new Set([...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
}

function bindingForTool(toolName) {
  const t = toolName;
  if (t === "handoff_to_human" || t === "notify_team") return "slack";
  if (
    t.includes("book") ||
    t.includes("availability") ||
    t.includes("reschedule") ||
    t.includes("cancel") ||
    t === "check_table_availability" ||
    t === "check_calendar" ||
    t === "schedule_meeting" ||
    t === "set_reminder"
  ) {
    return "google_calendar";
  }
  if (t.includes("ticket") || t.includes("lead") || t.includes("capture")) return "hubspot";
  return null;
}

/** Prefer a read-only tool for each Phase-1 connector. */
function pickToolPlan(tools) {
  const names = new Set(tools);
  const plan = [];

  const calRead = ["check_availability", "check_calendar", "check_table_availability"].find((t) =>
    names.has(t),
  );
  if (calRead) {
    plan.push({
      tool: calRead,
      connector: "google_calendar",
      write: false,
      args: { date: new Date(Date.now() + 86400000).toISOString().slice(0, 10) },
    });
  }

  if (allowWrites) {
    if (names.has("handoff_to_human")) {
      plan.push({
        tool: "handoff_to_human",
        connector: "slack",
        write: true,
        args: {
          reason: "Wave4 scripted proof (no LLM) — ignore",
          summary: "Automated connector assurance sweep",
          urgency: "low",
        },
      });
    }
    if (names.has("capture_lead")) {
      plan.push({
        tool: "capture_lead",
        connector: "hubspot",
        write: true,
        args: {
          email: `wave4.proof+${Date.now()}@example.com`,
          phone: "512-555-0100",
          company_size: "10",
          need: "Wave4 scripted proof",
          notes: "Automated — safe to delete",
        },
      });
    } else if (names.has("create_ticket")) {
      plan.push({
        tool: "create_ticket",
        connector: "hubspot",
        write: true,
        args: {
          subject: "Wave4 scripted proof",
          description: "Automated connector assurance — safe to close",
          requester_email: `wave4.proof+${Date.now()}@example.com`,
          requester_name: "Wave4 Proof",
        },
      });
    }
  }

  return plan;
}

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
    console.error("Set DEMO_BASE (or PROOF_BASE)");
    process.exit(1);
  }

  const familyFilter = loadFamilyFilter();
  const only = onlyFilter();
  const usFiles = fs
    .readdirSync(catalogDir)
    .filter((f) => f.startsWith("us-") && f.endsWith(".agent.json"))
    .sort();

  let agents = usFiles.map((f) => {
    const family = f.replace(/^us-/, "").replace(/\.agent\.json$/, "");
    return { family, agentId: `us-${family}`, file: f };
  });
  if (familyFilter) agents = agents.filter((a) => familyFilter.has(a.family));
  if (only) agents = agents.filter((a) => only.has(a.agentId));

  console.log(
    `Scripted tool sweep → ${BASE}` +
      `\n  agents=${agents.length} writes=${allowWrites} auto-record=${doAutoRecord}\n`,
  );

  // Platform probes first (cheap).
  const status = await j(`/api/oauth/status?workspaceId=${encodeURIComponent(WORKSPACE)}`);
  const connected = new Set(status.body.connected || []);
  console.log("Connected OAuth:", [...connected].join(", ") || "(none)");

  const probeOk = new Set();
  for (const id of ["slack", "google_calendar", "hubspot", "email"]) {
    if (!connected.has(id)) continue;
    const p = await j(`/api/oauth/${id}/test`, {
      method: "POST",
      body: JSON.stringify({ workspaceId: WORKSPACE }),
    });
    if (p.body?.ok) {
      probeOk.add(id);
      console.log(`PROBE OK ${id}${p.body.account ? ` — ${p.body.account}` : ""}`);
    } else {
      console.log(`PROBE FAIL ${id} — ${p.body?.error || p.status}`);
    }
  }
  console.log("");

  const results = [];
  for (const agent of agents) {
    const pkg = JSON.parse(fs.readFileSync(path.join(catalogDir, agent.file), "utf8"));
    const tools = (pkg.tools || []).map((t) => t.name).filter(Boolean);
    if (!tools.includes("handoff_to_human")) tools.push("handoff_to_human");
    const plan = pickToolPlan(tools).filter((step) => connected.has(step.connector));

    if (!plan.length) {
      const bound = [...new Set(tools.map(bindingForTool).filter(Boolean))];
      const coveredByProbe = bound.filter((c) => probeOk.has(c));
      const statusOut =
        coveredByProbe.length && bound.every((c) => probeOk.has(c) || c === "webhook")
          ? "PROBE_COVERED"
          : connected.size
            ? "NO_READ_TOOL"
            : "NOT_CONNECTED";
      console.log(`${statusOut.padEnd(14)} ${agent.agentId} bound=${bound.join(",") || "—"}`);
      results.push({ agentId: agent.agentId, status: statusOut, bound, coveredByProbe });
      // Record probe-covered Slack/HubSpot families without a second write.
      if (doAutoRecord && statusOut === "PROBE_COVERED") {
        for (const c of coveredByProbe) {
          recordProof({
            agentId: agent.agentId,
            connector: c,
            corr: `corr_probe_${c}_${Date.now().toString(36)}`,
            notes: "Platform OAuth probe OK — family binds this connector (no LLM, no write)",
            environment: BASE,
          });
        }
      }
      continue;
    }

    await j("/api/rent", {
      method: "POST",
      body: JSON.stringify({ agentId: agent.agentId, tier: "standard", workspaceId: WORKSPACE }),
    }).catch(() => {});

    const liveConnectors = [];
    for (const step of plan) {
      const corr = `corr_tools_${Date.now().toString(36)}`;
      const out = await j("/api/proof/tool", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: WORKSPACE,
          agentId: agent.agentId,
          tool: step.tool,
          args: step.args,
          mode: "live",
          correlationId: corr,
        }),
      });
      if (out.status === 404 || out.body?.error === "proof_harness_forbidden") {
        console.error(
          "proof/tool unavailable — deploy the hybrid harness routes, or set PROOF_HARNESS_SECRET.",
          out.body,
        );
        process.exit(1);
      }
      const live = Boolean(out.body?.live);
      const mark = live ? "LIVE" : out.body?.stubbed ? "STUB" : "FAIL";
      console.log(
        `${mark.padEnd(4)} ${agent.agentId} ${step.tool} → ${step.connector}` +
          (out.body?.result?.data?.error ? ` (${out.body.result.data.error})` : ""),
      );
      if (live) {
        liveConnectors.push({ connector: step.connector, corr, tool: step.tool });
        if (doAutoRecord) {
          recordProof({
            agentId: agent.agentId,
            connector: step.connector,
            corr,
            notes: `Scripted ${step.tool} (no LLM)${step.write ? " [write]" : " [read]"}`,
            environment: BASE,
          });
        }
      }
    }
    results.push({
      agentId: agent.agentId,
      status: liveConnectors.length ? "LIVE_PASS" : "FAIL",
      liveConnectors,
    });
  }

  const day = new Date().toISOString().slice(0, 10);
  const reportPath = path.join(root, "docs/reports", `tool-sweep-${day}.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        base: BASE,
        writes: allowWrites,
        probeOk: [...probeOk],
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`\nReport → ${reportPath}`);

  const fails = results.filter((r) => r.status === "FAIL");
  if (fails.length) process.exitCode = 2;
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
