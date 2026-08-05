#!/usr/bin/env node
/**
 * Zero-cost family → connector binding matrix (no network, no LLM).
 *
 *   pnpm proof:bindings
 *   pnpm proof:bindings --golive100
 *   pnpm proof:bindings --json
 *
 * Cross-checks catalogue tools vs Wave 4 proofs + Phase-1 connector set.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const catalogDir = path.join(root, "data/catalog");
const proofsPath = path.join(root, "data/wave4-live-proofs.json");
const mondayPath = path.join(root, "apps/web/src/lib/monday-pilot.ts");

const PHASE1 = new Set(["slack", "google_calendar", "hubspot", "email", "webhook", "mcp"]);
const asJson = process.argv.includes("--json");
const golive100 = process.argv.includes("--golive100");
const golive18 = process.argv.includes("--golive18");

function bindingForTool(toolName, market) {
  const calendar = market === "eu" ? "m365_calendar" : "google_calendar";
  const handoff = market === "eu" ? "teams" : "slack";
  const t = toolName;
  if (t === "handoff_to_human") return handoff;
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
    return calendar;
  }
  if (t === "notify_team") return handoff;
  if (t.includes("order") || t.includes("stock") || t === "get_order_status") return "shopify";
  if (t.includes("ticket") || t.includes("lead") || t.includes("capture") || t.includes("onboarding")) {
    return "hubspot";
  }
  if (t.includes("payslip") || t.includes("xero") || t.includes("documents")) return "xero";
  if (t.includes("place_order") || t.includes("payment") || t.includes("stripe")) return "stripe";
  if (t.includes("zendesk")) return "zendesk";
  return "webhook";
}

function loadFamilyFilter() {
  if (!golive100 && !golive18) return null;
  const src = fs.readFileSync(mondayPath, "utf8");
  const key = golive18 ? "GO_LIVE_18_FAMILY_IDS" : "MONDAY_PILOT_FAMILY_IDS";
  const m = src.match(new RegExp(`export const ${key} = \\[([\\s\\S]*?)\\] as const`));
  if (!m) return null;
  return new Set([...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
}

function loadProofs() {
  if (!fs.existsSync(proofsPath)) return new Map();
  const doc = JSON.parse(fs.readFileSync(proofsPath, "utf8"));
  const map = new Map();
  for (const p of doc.proofs || []) {
    if (!map.has(p.family)) map.set(p.family, new Set());
    map.get(p.family).add(p.connector);
  }
  return map;
}

const filter = loadFamilyFilter();
const proofs = loadProofs();
const usFiles = fs
  .readdirSync(catalogDir)
  .filter((f) => f.startsWith("us-") && f.endsWith(".agent.json"))
  .sort();

const rows = [];
for (const file of usFiles) {
  const family = file.replace(/^us-/, "").replace(/\.agent\.json$/, "");
  if (filter && !filter.has(family)) continue;
  const pkg = JSON.parse(fs.readFileSync(path.join(catalogDir, file), "utf8"));
  const tools = (pkg.tools || []).map((t) => t.name).filter(Boolean);
  if (!tools.includes("handoff_to_human")) tools.push("handoff_to_human");
  const connectors = [...new Set(tools.map((t) => bindingForTool(t, "us")))].sort();
  const phase1 = connectors.filter((c) => PHASE1.has(c));
  const needsEnv = connectors.filter((c) => !PHASE1.has(c) && c !== "webhook" && c !== "mcp");
  const proven = [...(proofs.get(family) || [])].sort();
  const provenPhase1 = phase1.filter((c) => proven.includes(c) || (c === "webhook" && proven.includes("webhook")) || (c === "mcp" && proven.includes("mcp")));
  // Slack/Calendar/HubSpot: proven if any of those recorded OR (for handoff-only) slack proven covers slack binding
  const assurance =
    phase1.length === 0
      ? "n/a"
      : provenPhase1.length >= phase1.filter((c) => c !== "webhook" && c !== "mcp").length ||
          (phase1.includes("slack") && proven.includes("slack") && !phase1.some((c) => ["google_calendar", "hubspot"].includes(c)))
        ? "proven"
        : proven.length
          ? "partial"
          : needsEnv.length && phase1.every((c) => c === "webhook" || needsEnv.length)
            ? "blocked_env"
            : "sandbox_only";

  // Simpler assurance labels:
  let label = "sandbox_only";
  const oauthPhase1 = phase1.filter((c) => ["slack", "google_calendar", "hubspot", "email"].includes(c));
  if (oauthPhase1.length === 0 && phase1.every((c) => c === "webhook" || c === "mcp")) {
    label = proven.length ? "proven_webhook_mcp" : "webhook_mcp_only";
  } else if (oauthPhase1.every((c) => proven.includes(c))) {
    label = "proven";
  } else if (oauthPhase1.some((c) => proven.includes(c))) {
    label = "partial";
  } else if (needsEnv.length && oauthPhase1.length === 0) {
    label = "blocked_env";
  }

  rows.push({
    family,
    agentId: `us-${family}`,
    connectors,
    phase1: oauthPhase1,
    needsEnv,
    proven,
    assurance: label,
  });
}

const counts = rows.reduce((acc, r) => {
  acc[r.assurance] = (acc[r.assurance] || 0) + 1;
  return acc;
}, {});

if (asJson) {
  console.log(JSON.stringify({ counts, rows }, null, 2));
} else {
  console.log("Family connector binding matrix\n───────────────────────────────");
  console.log(
    `Scope: ${golive18 ? "Go-live 18" : golive100 ? "Go-live 100" : "all US heroes"} · ${rows.length} families\n`,
  );
  console.log("Assurance counts:");
  for (const [k, v] of Object.entries(counts).sort()) {
    console.log(`  ${k}: ${v}`);
  }
  console.log("\nfamily                         assurance          phase1 oauth              proven");
  for (const r of rows) {
    console.log(
      `${r.family.padEnd(30)} ${r.assurance.padEnd(18)} ${(r.phase1.join(",") || "—").padEnd(24)} ${r.proven.join(",") || "—"}`,
    );
  }
}

const day = new Date().toISOString().slice(0, 10);
const out = path.join(root, "docs/reports", `binding-matrix-${day}.json`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), counts, rows }, null, 2) + "\n");
if (!asJson) console.log(`\nReport → ${out}`);
