#!/usr/bin/env node
/**
 * Merge ZA into Africa pack.
 * Prefer original ZA (unprefixed) packages over generated africa-* duplicates.
 * Deletes africa-{family} when a former ZA variant exists for that family.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const catalogDir = path.join(root, "data/catalog");
const PREFIX_RE = /^(us|eu|africa|asia)-/;
const PACK_MARKETS = ["us", "eu", "africa", "asia"];

function familyId(id) {
  return id.replace(PREFIX_RE, "");
}

function marketOf(id, manifestMarket) {
  if (manifestMarket === "za") return "za";
  if (manifestMarket && PACK_MARKETS.includes(manifestMarket)) return manifestMarket;
  const m = id.match(PREFIX_RE);
  return m ? m[1] : "za";
}

const files = fs.readdirSync(catalogDir).filter((f) => f.endsWith(".agent.json"));
const byFamily = new Map();

for (const file of files) {
  const pkg = JSON.parse(fs.readFileSync(path.join(catalogDir, file), "utf8"));
  const id = pkg.manifest.id;
  const market = marketOf(id, pkg.manifest.market);
  const fam = familyId(id);
  if (!byFamily.has(fam)) byFamily.set(fam, {});
  byFamily.get(fam)[market] = { file, pkg, id };
}

let merged = 0;
let removed = 0;
let keptAfricaOnly = 0;

for (const [fam, variants] of byFamily) {
  if (variants.za && variants.africa) {
    // Keep ZA package as Africa; drop generated africa-* duplicate
    const za = variants.za;
    za.pkg.manifest.market = "africa";
    // Light Africa framing without renaming id (keeps URLs / pilot ids stable)
    if (!/africa/i.test(za.pkg.manifest.summary || "")) {
      za.pkg.manifest.summary = `Africa — ${za.pkg.manifest.summary}`;
    }
    if (!za.pkg.manifest.compliance?.length) {
      za.pkg.manifest.compliance = ["popia", "regional_privacy"];
    } else if (!za.pkg.manifest.compliance.includes("popia")) {
      za.pkg.manifest.compliance = [...za.pkg.manifest.compliance, "popia"];
    }
    fs.writeFileSync(
      path.join(catalogDir, za.file),
      JSON.stringify(za.pkg, null, 2) + "\n",
    );
    const africaPath = path.join(catalogDir, variants.africa.file);
    if (fs.existsSync(africaPath)) {
      fs.unlinkSync(africaPath);
      removed++;
    }
    delete variants.africa;
    variants.africa = { ...za, id: za.id };
    delete variants.za;
    merged++;
  } else if (variants.za && !variants.africa) {
    variants.za.pkg.manifest.market = "africa";
    if (!/africa/i.test(variants.za.pkg.manifest.summary || "")) {
      variants.za.pkg.manifest.summary = `Africa — ${variants.za.pkg.manifest.summary}`;
    }
    fs.writeFileSync(
      path.join(catalogDir, variants.za.file),
      JSON.stringify(variants.za.pkg, null, 2) + "\n",
    );
    variants.africa = variants.za;
    delete variants.za;
    merged++;
  } else if (variants.africa) {
    keptAfricaOnly++;
  }
}

// Rebuild index + families from remaining files
const remaining = fs.readdirSync(catalogDir).filter((f) => f.endsWith(".agent.json"));
const index = [];
const famMap = new Map();

for (const file of remaining) {
  const pkg = JSON.parse(fs.readFileSync(path.join(catalogDir, file), "utf8"));
  const id = pkg.manifest.id;
  let market = pkg.manifest.market;
  if (market === "za") {
    market = "africa";
    pkg.manifest.market = "africa";
    fs.writeFileSync(path.join(catalogDir, file), JSON.stringify(pkg, null, 2) + "\n");
  }
  if (!market) market = PREFIX_RE.test(id) ? id.match(PREFIX_RE)[1] : "africa";

  index.push({
    id,
    name: pkg.manifest.name,
    tier: pkg.manifest.tier,
    category: pkg.manifest.category,
    market,
    summary: pkg.manifest.summary,
    channels: pkg.manifest.channels ?? [],
    tools: Array.isArray(pkg.tools) ? pkg.tools.length : 0,
    evals: Array.isArray(pkg.evals) ? pkg.evals.length : 0,
  });

  const fam = familyId(id);
  if (!famMap.has(fam)) {
    famMap.set(fam, {
      id: fam,
      name: pkg.manifest.name.replace(/^(US|EU|Africa|Asia|ZA)\s+/i, ""),
      tier: pkg.manifest.tier,
      category: pkg.manifest.category,
      summary: (pkg.manifest.summary || "").replace(/^Africa\s+[—-]\s*/i, ""),
      channels: pkg.manifest.channels ?? [],
      markets: {},
      packs: [],
      hasZa: false,
    });
  }
  famMap.get(fam).markets[market] = id;
}

for (const f of famMap.values()) {
  f.packs = PACK_MARKETS.filter((p) => f.markets[p]);
}

index.sort((a, b) => a.id.localeCompare(b.id));
const families = [...famMap.values()].sort((a, b) => a.id.localeCompare(b.id));

fs.writeFileSync(path.join(catalogDir, "index.json"), JSON.stringify(index, null, 2) + "\n");
fs.writeFileSync(path.join(catalogDir, "families.json"), JSON.stringify(families, null, 2) + "\n");

const byMarket = {};
for (const a of index) byMarket[a.market] = (byMarket[a.market] || 0) + 1;

console.log({
  mergedZaIntoAfrica: merged,
  removedDuplicateAfrica: removed,
  keptAfricaOnly: keptAfricaOnly,
  agents: index.length,
  families: families.length,
  byMarket,
});

const dupes = families.filter((f) => Object.keys(f.markets).length !== new Set(Object.values(f.markets)).size);
if (dupes.length) {
  console.warn("WARNING duplicate market ids", dupes.map((d) => d.id));
  process.exitCode = 1;
}
