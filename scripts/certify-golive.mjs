#!/usr/bin/env node
/**
 * Go-live certification checklist.
 *
 * Checks GO_LIVE_100 (stand-behind) and optional wave subsets against
 * docs/PILOT_PRODUCTION_BAR.md.
 *
 *   pnpm certify:golive
 *   pnpm certify:golive -- --next37
 *   pnpm certify:golive -- --wave55
 *   pnpm certify:golive -- --beyond55
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogDir = path.join(root, "data/catalog");
const pilotsDir = path.join(root, "docs/pilots");
const reportsDir = path.join(root, "docs/reports");
const PACKS = ["us", "eu", "africa", "asia", "oceania"];

const GO_LIVE_18 = [
  "executive-assistant",
  "it-helpdesk",
  "dental-front-desk",
  "hotel-guest",
  "sales-qualifier",
  "home-services",
  "restaurant-takeaway",
  "salon-booking",
  "clinic-front-desk",
  "customer-support",
  "delivery-tracking",
  "trades-receptionist",
  "events-venue",
  "onboarding-buddy",
  "accounting-practice",
  "building-management",
  "gym-membership",
  "pharmacy",
];

function parseIdList(src, exportName) {
  const m = src.match(new RegExp(`${exportName} = \\[([\\s\\S]*?)\\]`));
  if (!m) throw new Error(`${exportName} not found`);
  return [...m[1].matchAll(/"([a-z0-9-]+)"/g)].map((x) => x[1]);
}

const mondaySrc = readFileSync(path.join(root, "apps/web/src/lib/monday-pilot.ts"), "utf8");
const GO_LIVE_100 = parseIdList(mondaySrc, "MONDAY_PILOT_FAMILY_IDS");
const GO_LIVE_55 = parseIdList(mondaySrc, "GO_LIVE_55_FAMILY_IDS");

function pilotDepth(fam) {
  const p = path.join(pilotsDir, `${fam}.md`);
  if (!existsSync(p)) return "none";
  const t = readFileSync(p, "utf8");
  if (/^- Depth:\s*live\b/m.test(t)) return "live";
  if (/^- Depth:\s*strong\b/m.test(t)) return "strong";
  if (/catalogue-ready|first-pass/i.test(t)) return "first-pass";
  return "stub";
}

function packsPresent(fam) {
  return PACKS.filter((m) => existsSync(path.join(catalogDir, `${m}-${fam}.agent.json`)));
}

function checkFamily(fam) {
  const depth = pilotDepth(fam);
  const packs = packsPresent(fam);
  const pilotPath = path.join(pilotsDir, `${fam}.md`);
  const pilot = existsSync(pilotPath) ? readFileSync(pilotPath, "utf8") : "";
  const checks = {
    depthStrongOrLive: depth === "strong" || depth === "live",
    depthLive: depth === "live",
    pilotDoc: Boolean(pilot),
    jobStory: /Job story|Who |Channel |Outcome /i.test(pilot),
    goldenPath: /Golden path|golden path|Try:|Demo prompt/i.test(pilot),
    handoff: /handoff|human/i.test(pilot),
    allFivePacks: packs.length === 5,
  };
  const gaps = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([k]) => k)
    .filter((k) => k !== "depthLive"); // live is stretch, not blocker for cert
  const certReady = checks.depthStrongOrLive && checks.pilotDoc && checks.allFivePacks;
  return { fam, depth, packs: packs.length, checks, gaps, certReady };
}

const args = process.argv.slice(2);
const beyond55 = args.includes("--beyond55") || args.includes("--next100");
const waveNext37 = args.includes("--wave=next37") || args.includes("--next37");
const wave55 = args.includes("--wave55");

const goLive55Set = new Set(GO_LIVE_55);
const next37 = GO_LIVE_55.filter((f) => !GO_LIVE_18.includes(f)).sort();
const next45 = GO_LIVE_100.filter((f) => !goLive55Set.has(f)).sort();

const targets = beyond55
  ? next45
  : waveNext37
    ? next37
    : wave55
      ? GO_LIVE_55
      : GO_LIVE_100;

const results = targets.map(checkFamily);
const ready = results.filter((r) => r.certReady);
const blocked = results.filter((r) => !r.certReady);
const liveCount = results.filter((r) => r.depth === "live").length;

const today = new Date().toISOString().slice(0, 10);
mkdirSync(reportsDir, { recursive: true });
const reportPath = path.join(reportsDir, `golive-certify-${today}.md`);

const scopeLabel = beyond55
  ? `Beyond Go-live 55 (+45 → 100) — ${targets.length}`
  : waveNext37
    ? `Next 37 (Go-live 55 minus featured 18) — ${targets.length}`
    : wave55
      ? `Go-live 55 wave — ${targets.length}`
      : `Go-live 100 stand-behind — ${targets.length}`;

const lines = [
  `# Go-live certification — ${today}`,
  "",
  `Scope: **${scopeLabel}**`,
  "",
  "| Metric | Value |",
  "|--------|------:|",
  `| Checked | ${results.length} |`,
  `| Cert-ready (strong+pilot+5 packs) | ${ready.length} |`,
  `| Blocked | ${blocked.length} |`,
  `| Depth live (stretch) | ${liveCount} |`,
  "",
  "## Definition",
  "",
  "Cert-ready = Depth strong|live + pilot doc + all 5 market packs.",
  "Depth live (connector proof) is tracked separately — not required to join Go-live 100.",
  "",
  "## Ready",
  "",
];

if (ready.length === 0) lines.push("(none)", "");
else {
  lines.push("| Family | Depth | Packs |", "|--------|-------|------:|");
  for (const r of ready) {
    lines.push(`| ${r.fam} | ${r.depth} | ${r.packs}/5 |`);
  }
  lines.push("");
}

lines.push("## Blocked / gaps", "");
if (blocked.length === 0) lines.push("(none)", "");
else {
  lines.push("| Family | Depth | Packs | Gaps |", "|--------|-------|------:|------|");
  for (const r of blocked) {
    lines.push(`| ${r.fam} | ${r.depth} | ${r.packs}/5 | ${r.gaps.join(", ") || "—"} |`);
  }
  lines.push("");
}

lines.push(
  "## Manual checklist (per family)",
  "",
  "From `docs/PILOT_PRODUCTION_BAR.md`:",
  "",
  "1. [ ] Golden path 5–8 turns in Studio (confirm-before-write)",
  "2. [ ] Handoff works when stuck / out of scope",
  "3. [ ] `pnpm eval:suite -- --agents us-{family}` green",
  "4. [ ] Install path (Rent → embed/App) gated correctly",
  "5. [ ] History correlation id visible after a turn",
  "6. [ ] (Stretch) Live connector proof → Depth live",
  "",
  "## Next steps",
  "",
  "- Featured demos: Go-live **18** (Cluster A–C)",
  "- Stand-behind catalogue filter: Go-live **100** (`/?pilot=1`)",
  "- Wave subsets: `pnpm certify:golive -- --wave55` · `--next37` · `--beyond55`",
  "- Live proofs: `pnpm proof:live` · `docs/WAVE4_LIVE_CONNECTORS.md`",
  "",
);

writeFileSync(reportPath, lines.join("\n"));

console.log(`Go-live certify — ${scopeLabel}`);
console.log(`  cert-ready: ${ready.length}/${results.length}`);
console.log(`  blocked:    ${blocked.length}`);
console.log(`  depth live: ${liveCount}`);
if (blocked.length) {
  console.log("  gaps:");
  for (const r of blocked.slice(0, 15)) {
    console.log(`    - ${r.fam}: ${r.gaps.join(", ") || r.depth}`);
  }
  if (blocked.length > 15) console.log(`    … +${blocked.length - 15} more`);
}
console.log(`Report: ${reportPath}`);
process.exit(0); // informational; don't fail CI yet
