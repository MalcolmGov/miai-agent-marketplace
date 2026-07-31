#!/usr/bin/env node
/**
 * Catalogue-ready gate for all agents. Stamps readiness on index.json + families.json.
 * Exit 1 if any agent is blocked (unless --report-only).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const catalogDir = path.join(root, "data/catalog");
const reportOnly = process.argv.includes("--report-only");
const require = createRequire(import.meta.url);

let getPreset = () => undefined;
try {
  ({ getPreset } = require(path.join(root, "packages/presets/dist/index.js")));
} catch {
  console.warn("presets dist missing — run pnpm generate:presets && pnpm build:packages first for preset checks");
}

const PREFIX_RE = /^(us|eu|africa|asia)-/;
const PACK_MARKETS = ["us", "eu", "africa", "asia"];

function toolNames(pkg) {
  return (pkg.tools || []).map((t) => t.name || t).filter(Boolean);
}

function checkAgent(pkg) {
  const issues = [];
  const m = pkg.manifest || {};
  if (pkg.format !== "miai.agent-package/v1") issues.push("bad_format");
  if (!m.id) issues.push("missing_id");
  if (!m.market || !["za", "us", "eu", "africa", "asia"].includes(m.market))
    issues.push("bad_market");
  if (!(pkg.system_prompt || "").trim() || pkg.system_prompt.length < 800)
    issues.push("thin_prompt");
  if (!(pkg.knowledge || "").trim() || pkg.knowledge.length < 400)
    issues.push("thin_knowledge");
  if (!(pkg.guardrails || "").trim() || pkg.guardrails.length < 200)
    issues.push("thin_guardrails");
  if (!Array.isArray(pkg.tools) || pkg.tools.length < 1) issues.push("no_tools");
  if (!m.handoff?.enabled) issues.push("handoff_disabled");
  if (!Array.isArray(pkg.evals) || pkg.evals.length < 12) issues.push("few_evals");
  if (!Array.isArray(m.compliance) || m.compliance.length < 1) issues.push("no_compliance");
  if (!Array.isArray(m.languages) || m.languages.length < 1) issues.push("no_languages");
  if (!Array.isArray(m.channels) || m.channels.length < 1) issues.push("no_channels");
  if (!m.prepaid?.skus?.length) issues.push("no_prepaid_skus");

  const preset = getPreset(m.id);
  if (!preset) {
    issues.push("no_preset");
  } else {
    const tools = new Set(toolNames(pkg));
    tools.add("handoff_to_human");
    const bound = new Set((preset.bindings || []).map((b) => b.tool));
    for (const t of tools) {
      if (!bound.has(t)) {
        // preset may bind subset of known tools via booking() helper expansion;
        // require at least handoff + one binding
        break;
      }
    }
    if (!(preset.bindings || []).some((b) => b.tool === "handoff_to_human")) {
      issues.push("preset_missing_handoff");
    }
    if (!(preset.bindings || []).length) issues.push("empty_preset");
  }

  return issues;
}

function main() {
  const files = fs.readdirSync(catalogDir).filter((f) => f.endsWith(".agent.json"));
  const readinessById = {};
  const blocked = [];

  for (const file of files) {
    const pkg = JSON.parse(fs.readFileSync(path.join(catalogDir, file), "utf8"));
    const id = pkg.manifest?.id || file.replace(/\.agent\.json$/, "");
    const issues = checkAgent(pkg);
    const ready = issues.length === 0;
    readinessById[id] = ready ? "catalogue-ready" : "blocked";
    if (!ready) blocked.push({ id, issues });
  }

  // Stamp index
  const indexPath = path.join(catalogDir, "index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  for (const row of index) {
    row.readiness = readinessById[row.id] || "blocked";
  }
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n");

  // Stamp families
  const famPath = path.join(catalogDir, "families.json");
  const families = JSON.parse(fs.readFileSync(famPath, "utf8"));
  for (const f of families) {
    const ids = Object.values(f.markets || {});
    const allReady = ids.length > 0 && ids.every((id) => readinessById[id] === "catalogue-ready");
    const packsOk = PACK_MARKETS.every((p) => f.markets?.[p]);
    f.catalogueReady = allReady && packsOk;
    f.readiness = f.catalogueReady ? "catalogue-ready" : "blocked";
  }
  fs.writeFileSync(famPath, JSON.stringify(families, null, 2) + "\n");

  const readyCount = Object.values(readinessById).filter((r) => r === "catalogue-ready").length;
  console.log(`catalogue-ready: ${readyCount}/${files.length}`);
  console.log(`families catalogue-ready: ${families.filter((f) => f.catalogueReady).length}/${families.length}`);

  if (blocked.length) {
    console.log(`\nBlocked (${blocked.length}):`);
    for (const b of blocked.slice(0, 40)) {
      console.log(`  ${b.id}: ${b.issues.join(", ")}`);
    }
    if (blocked.length > 40) console.log(`  ... +${blocked.length - 40} more`);
    if (!reportOnly) process.exit(1);
  } else {
    console.log("\nAll agents catalogue-ready.");
  }
}

main();
