#!/usr/bin/env node
/**
 * Production scale status: US heroes with pilot docs vs full 220 catalogue.
 */
import { readdirSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogDir = path.join(root, "data/catalog");
const pilotsDir = path.join(root, "docs/pilots");

const PACKS = ["us", "eu", "africa", "asia"];

function familyFromUsFile(name) {
  // us-foo.agent.json -> foo
  return name.replace(/^us-/, "").replace(/\.agent\.json$/, "");
}

const usFiles = readdirSync(catalogDir).filter((f) => f.startsWith("us-") && f.endsWith(".agent.json"));
const families = usFiles.map(familyFromUsFile).sort();
const pilotDocs = existsSync(pilotsDir)
  ? new Set(readdirSync(pilotsDir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")))
  : new Set();

const strongUs = families.filter((f) => pilotDocs.has(f));
const weakUs = families.filter((f) => !pilotDocs.has(f));

function africaPackPresent(fam) {
  if (existsSync(path.join(catalogDir, `africa-${fam}.agent.json`))) return true;
  // Legacy: unprefixed ZA file with market africa still ships as the Africa SKU
  const legacy = path.join(catalogDir, `${fam}.agent.json`);
  if (!existsSync(legacy)) return false;
  try {
    const pkg = JSON.parse(readFileSync(legacy, "utf8"));
    return pkg.manifest?.market === "africa" || pkg.manifest?.market === "za";
  } catch {
    return false;
  }
}

let packPresent = 0;
let packMissing = [];
let packsStrongEstimate = 0; // US strong ⇒ count existing market packs as "ready for Wave 3 polish"
let legacyAfricaOnly = [];

for (const fam of families) {
  for (const pk of PACKS) {
    const file = path.join(catalogDir, `${pk}-${fam}.agent.json`);
    const present = pk === "africa" ? africaPackPresent(fam) : existsSync(file);
    if (present) {
      packPresent++;
      if (strongUs.includes(fam) && pk === "us") packsStrongEstimate++;
      if (pk === "africa" && !existsSync(file) && africaPackPresent(fam)) {
        legacyAfricaOnly.push(fam);
      }
    } else if (pk !== "us") {
      packMissing.push(`${pk}-${fam}`);
    }
  }
}

const marketPacksForStrong = strongUs.flatMap((fam) =>
  ["eu", "africa", "asia"].map((pk) => `${pk}-${fam}`),
);
const marketPacksExisting = marketPacksForStrong.filter((id) => {
  const [pk, ...rest] = id.split("-");
  const fam = rest.join("-");
  if (pk === "africa") return africaPackPresent(fam);
  return existsSync(path.join(catalogDir, `${id}.agent.json`));
});
const africaPrefixed = strongUs.filter((fam) =>
  existsSync(path.join(catalogDir, `africa-${fam}.agent.json`)),
).length;

console.log(`
Production scale status
───────────────────────
Families (US heroes):     ${families.length}
US Depth strong (+pilot): ${strongUs.length} / ${families.length}
US remaining (Wave 2):    ${weakUs.length}
Catalogue slots present:  ${packPresent} / ${families.length * 4}
Missing non-US packs:     ${packMissing.length}
Market packs for strong:  ${marketPacksExisting.length} / ${strongUs.length * 3} (Wave 3 localize)
Africa prefixed files:    ${africaPrefixed} / ${strongUs.length} (rest may be legacy unprefixed ZA)
Legacy Africa (unprefixed only): ${legacyAfricaOnly.length}
Target:                   220 (55 × 4)

Wave 1 (Go-live 18): ${strongUs.length >= 18 ? "met or exceeded" : "in progress"} (${strongUs.length})
Wave 2 TODO families:
${weakUs.map((f) => `  - ${f}`).join("\n") || "  (none)"}
`);

if (process.argv.includes("--json")) {
  console.log(
    JSON.stringify(
      {
        families: families.length,
        strongUs: strongUs.length,
        weakUs,
        packPresent,
        packMissingCount: packMissing.length,
        marketPacksForStrongExisting: marketPacksExisting.length,
        target: 220,
      },
      null,
      2,
    ),
  );
}
