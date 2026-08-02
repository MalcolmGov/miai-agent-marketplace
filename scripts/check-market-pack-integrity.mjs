#!/usr/bin/env node
/**
 * Catalogue integrity gate (Phase 5 C8/C9).
 *
 * - index.json has exactly 500 agents (100 families × 5 markets)
 * - every families.markets.* id exists in index.json
 * - each family has us/eu/africa/asia/oceania when present in markets
 * - unprefixed *.agent.json packs may exist on disk (legacy ZA aliases) but must NOT appear in index
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogDir = path.join(root, "data/catalog");
const MARKETS = ["us", "eu", "africa", "asia", "oceania"];

const index = JSON.parse(fs.readFileSync(path.join(catalogDir, "index.json"), "utf8"));
const families = JSON.parse(fs.readFileSync(path.join(catalogDir, "families.json"), "utf8"));
const indexIds = new Set(index.map((a) => a.id));

const errors = [];
const warnings = [];

if (!Array.isArray(index) || index.length !== 500) {
  errors.push(`index.json expected 500 agents, got ${index.length}`);
}
if (!Array.isArray(families) || families.length !== 100) {
  errors.push(`families.json expected 100 families, got ${families.length}`);
}

for (const f of families) {
  const markets = f.markets || {};
  for (const m of MARKETS) {
    if (!markets[m]) {
      errors.push(`family ${f.id}: missing markets.${m}`);
      continue;
    }
    if (!indexIds.has(markets[m])) {
      errors.push(`family ${f.id}: markets.${m}=${markets[m]} not in index.json`);
    }
    const expectedPrefix = `${m}-`;
    if (!String(markets[m]).startsWith(expectedPrefix)) {
      errors.push(`family ${f.id}: markets.${m}=${markets[m]} must start with ${expectedPrefix}`);
    }
  }
  // ZA chip (if present) must point at the indexed Africa SKU — never an orphan unprefixed id
  if (markets.za && markets.za !== markets.africa) {
    errors.push(
      `family ${f.id}: markets.za (${markets.za}) must equal markets.africa (${markets.africa}) — unprefixed packs stay on disk as legacy aliases only`,
    );
  }
}

for (const id of indexIds) {
  if (!/^(us|eu|africa|asia|oceania)-/.test(id)) {
    errors.push(`index contains non-market-prefixed id: ${id}`);
  }
}

const packFiles = fs.readdirSync(catalogDir).filter((f) => f.endsWith(".agent.json"));
const unprefixed = packFiles.filter((f) => !/^(us|eu|africa|asia|oceania)-/.test(f));
if (unprefixed.length === 0) {
  warnings.push("no unprefixed legacy packs on disk (expected ~51 ZA aliases retained)");
}

// Optional: warn if all five market packs for a family have identical knowledge+prompt hashes
for (const f of families) {
  const hashes = MARKETS.map((m) => {
    const id = f.markets?.[m];
    if (!id) return null;
    const fp = path.join(catalogDir, `${id}.agent.json`);
    if (!fs.existsSync(fp)) return null;
    const raw = JSON.parse(fs.readFileSync(fp, "utf8"));
    const payload = `${raw.system_prompt || ""}\n${raw.knowledge || ""}`;
    return createHash("sha256").update(payload).digest("hex").slice(0, 12);
  }).filter(Boolean);
  if (hashes.length === 5 && new Set(hashes).size === 1) {
    warnings.push(`family ${f.id}: all 5 market packs share identical prompt+knowledge hash (possible under-localization)`);
  }
}

console.log("Catalog integrity");
console.log("  index:", index.length);
console.log("  families:", families.length);
console.log("  packs on disk:", packFiles.length);
console.log("  unprefixed legacy:", unprefixed.length);
if (warnings.length) {
  console.log("Warnings:");
  for (const w of warnings.slice(0, 20)) console.log("  -", w);
  if (warnings.length > 20) console.log(`  … +${warnings.length - 20} more`);
}
if (errors.length) {
  console.error("FAIL:");
  for (const e of errors) console.error("  -", e);
  process.exit(1);
}
console.log("OK");
