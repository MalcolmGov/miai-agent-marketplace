#!/usr/bin/env node
/**
 * Generate missing US / EU / Africa / Asia market-pack variants for every agent family.
 * ZA agents (unprefixed) are left untouched. Idempotent: skips existing variant files.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const catalogDir = path.join(root, "data/catalog");
const packsFile = path.join(catalogDir, "market-packs.json");

const PACK_MARKETS = ["us", "eu", "africa", "asia"];
const PREFIX_RE = /^(us|eu|africa|asia)-/;

/** Never overwrite Claude Cluster B deepened packs. */
const CLUSTER_B_PROTECTED = new Set([
  "restaurant-takeaway",
  "salon-booking",
  "clinic-front-desk",
  "customer-support",
  "delivery-tracking",
  "trades-receptionist",
]);

function familyIdFromAgentId(id) {
  return id.replace(PREFIX_RE, "");
}

function marketFromAgentId(id, manifestMarket) {
  // Filename / id prefix is authoritative. Unprefixed legacy ZA files often have
  // manifest.market flipped to "africa" by merge-za-into-africa — treat those as
  // `za` source so we still emit proper africa-{family}.agent.json packs.
  const m = id.match(PREFIX_RE);
  if (m) return m[1];
  if (manifestMarket === "za") return "za";
  return "za";
}

function variantId(family, market) {
  if (market === "za") return family;
  return `${market}-${family}`;
}

function titleCaseFamily(family) {
  return family
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function stripMarketNamePrefix(name) {
  return name.replace(/^(US|EU|Africa|Asia|ZA)\s+/i, "").trim();
}

function isHealthFamily(family, healthHints) {
  return healthHints.some((h) => family.includes(h));
}

function localizeText(text, pack, sourceMarket) {
  if (!text || typeof text !== "string") return text;
  let out = text;

  // Emergency numbers
  out = out.replace(/\b911\b/g, pack.emergency === "911" ? "911" : pack.emergency);
  out = out.replace(/\b112\b/g, pack.emergency === "112" ? "112" : pack.emergency);
  out = out.replace(/\b10111\b/g, pack.emergency);
  out = out.replace(/call emergency services right now \(in the United States:[^)]+\)/gi, `call **${pack.emergency}**`);
  out = out.replace(/United States:\s*\*\*911\*\*[^.]*\./gi, `${pack.regionPhrase}: **${pack.emergency}**.`);

  // Region labels in titles / headings
  const sourceLabels = {
    us: "US",
    eu: "EU",
    za: "ZA",
    africa: "Africa",
    asia: "Asia",
  };
  const srcLabel = sourceLabels[sourceMarket] ?? "ZA";
  const dstLabel = pack.label;

  if (sourceMarket !== pack.id) {
    out = out.replace(new RegExp(`\\b${srcLabel}\\b`, "g"), dstLabel);
    out = out.replace(/South Africa/gi, pack.regionPhrase);
    out = out.replace(/United States/gi, pack.regionPhrase);
    out = out.replace(/European Union/gi, pack.regionPhrase);
    out = out.replace(/\bZAR\b/g, pack.currency);
    out = out.replace(/\bUSD\b/g, pack.currency);
    out = out.replace(/\bEUR\b/g, pack.currency);
    out = out.replace(/R\s?(\d)/g, `${pack.currency} $1`);
    out = out.replace(/\$(\d)/g, `${pack.currency} $1`);
    out = out.replace(/€(\d)/g, `${pack.currency} $1`);
  }

  // Strip old compliance sections and append pack notes
  out = out.replace(/\n## (US|EU|ZA|Africa|Asia) compliance notes[\s\S]*?(?=\n## |\nToday's date|\s*$)/i, "\n");

  if (!out.includes(`## ${dstLabel} compliance notes`)) {
    out = out.trimEnd() + "\n\n" + pack.complianceNotes;
  }

  return out;
}

function localizeSummary(summary, pack, baseName) {
  const clean = (summary || "")
    .replace(/^(US|EU|Africa|Asia|ZA)\s+/i, "")
    .replace(/\bUS\b/g, pack.label)
    .replace(/\bEU\b/g, pack.label)
    .replace(/South African?/gi, pack.regionPhrase)
    .replace(/United States/gi, pack.regionPhrase)
    .replace(/European Union/gi, pack.regionPhrase);
  if (clean.toLowerCase().startsWith(pack.label.toLowerCase())) return clean;
  // Keep concise; prefer existing tone with pack cue
  const short = clean.length > 180 ? clean.slice(0, 177) + "…" : clean;
  if (short.toLowerCase().includes(pack.label.toLowerCase())) return short;
  return `${pack.summaryPrefix}${stripMarketNamePrefix(baseName)} — ${short}`;
}

function pickSource(variants, targetMarket) {
  // Prefer existing same market, then us, eu, za, africa, asia
  const order = [targetMarket, "us", "eu", "za", "africa", "asia"];
  for (const m of order) {
    if (variants[m]) return { market: m, pkg: variants[m] };
  }
  return null;
}

function applyOverlay(sourcePkg, sourceMarket, family, pack, health) {
  const id = variantId(family, pack.id);
  const baseName = stripMarketNamePrefix(sourcePkg.manifest.name) || titleCaseFamily(family);
  const name = `${pack.namePrefix}${baseName}`.replace(/\s+/g, " ").trim();
  const compliance = health ? pack.healthCompliance : pack.compliance;

  const manifest = {
    ...sourcePkg.manifest,
    id,
    name,
    market: pack.id,
    compliance: [...compliance],
    summary: localizeSummary(sourcePkg.manifest.summary, pack, baseName),
    channels: [...pack.channels],
    languages: [...pack.languages],
  };

  // Soft-localize prepaid SKU labels
  if (manifest.prepaid?.skus) {
    manifest.prepaid = {
      ...manifest.prepaid,
      skus: manifest.prepaid.skus.map((s) => ({
        ...s,
        label: (s.label || "").replace(/^(US|EU|Africa|Asia|ZA)\s+/i, pack.namePrefix),
      })),
    };
  }

  const system_prompt = localizeText(sourcePkg.system_prompt, pack, sourceMarket);
  const knowledge = localizeText(sourcePkg.knowledge, pack, sourceMarket);
  const guardrails = localizeText(sourcePkg.guardrails, pack, sourceMarket);

  let evals = sourcePkg.evals;
  if (Array.isArray(evals)) {
    // Localize eval strings lightly — never append compliance blocks into inputs.
    evals = evals.map((e) => {
      if (!e || typeof e !== "object") return e;
      const copy = { ...e };
      for (const key of ["input", "expected", "notes", "user", "assistant"]) {
        if (typeof copy[key] === "string") {
          let v = copy[key]
            .replace(/\b911\b/g, pack.emergency)
            .replace(/\b112\b/g, pack.emergency === "112" ? "112" : pack.emergency)
            .replace(/\bUSD\b/g, pack.currency)
            .replace(/\bEUR\b/g, pack.currency)
            .replace(/\$(\d)/g, pack.currency === "EUR" ? "€$1" : `${pack.currency} $1`);
          copy[key] = v;
        }
      }
      if (Array.isArray(copy.contains)) {
        copy.contains = copy.contains.map((c) =>
          typeof c === "string"
            ? c
                .replace(/\b911\b/g, pack.emergency)
                .replace(/\bUSD\b/g, pack.currency)
                .replace(/\$(\d)/g, pack.currency === "EUR" ? "€$1" : c)
            : c,
        );
      }
      return copy;
    });
  }

  return {
    format: sourcePkg.format || "miai.agent-package/v1",
    manifest,
    system_prompt,
    knowledge,
    tools: sourcePkg.tools,
    guardrails,
    evals,
  };
}

function loadAllPackages() {
  const files = fs.readdirSync(catalogDir).filter((f) => f.endsWith(".agent.json"));
  const byFamily = new Map();

  for (const file of files) {
    const pkg = JSON.parse(fs.readFileSync(path.join(catalogDir, file), "utf8"));
    const id = pkg.manifest?.id || file.replace(/\.agent\.json$/, "");
    const market = marketFromAgentId(id, pkg.manifest?.market);
    const family = familyIdFromAgentId(id);
    if (!byFamily.has(family)) byFamily.set(family, {});
    byFamily.get(family)[market] = pkg;
  }
  return byFamily;
}

function rebuildIndex(byFamily) {
  const index = [];
  for (const [, variants] of byFamily) {
    for (const [market, pkg] of Object.entries(variants)) {
      // Marketplace SKUs are the four prefixed packs. Keep legacy ZA on disk as
      // source only when an africa-* pack already covers the family.
      if (market === "za" && variants.africa) continue;
      const outMarket = market === "za" ? "africa" : market;
      index.push({
        id: pkg.manifest.id,
        name: pkg.manifest.name,
        tier: pkg.manifest.tier,
        category: pkg.manifest.category,
        market: outMarket,
        summary: pkg.manifest.summary,
        channels: pkg.manifest.channels ?? [],
        tools: Array.isArray(pkg.tools) ? pkg.tools.length : 0,
        evals: Array.isArray(pkg.evals) ? pkg.evals.length : 0,
      });
    }
  }
  index.sort((a, b) => a.id.localeCompare(b.id));
  return index;
}

function buildFamilies(byFamily, healthHints) {
  const families = [];
  for (const [family, variants] of [...byFamily.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const any = Object.values(variants)[0];
    const baseName = stripMarketNamePrefix(any.manifest.name) || titleCaseFamily(family);
    const markets = {};
    for (const [m, pkg] of Object.entries(variants)) {
      markets[m] = pkg.manifest.id;
    }
    families.push({
      id: family,
      name: baseName,
      tier: any.manifest.tier,
      category: any.manifest.category,
      summary: stripMarketNamePrefix(any.manifest.summary || "").replace(/^(US|EU|Africa|Asia)\s+[—-]\s*/i, ""),
      channels: any.manifest.channels ?? [],
      health: isHealthFamily(family, healthHints),
      markets,
      packs: PACK_MARKETS.filter((p) => markets[p]),
      hasZa: Boolean(markets.za),
    });
  }
  return families;
}

function main() {
  const packConfig = JSON.parse(fs.readFileSync(packsFile, "utf8"));
  const packs = Object.fromEntries(packConfig.packs.map((p) => [p.id, p]));
  const healthHints = packConfig.healthFamilyHints || [];

  const byFamily = loadAllPackages();
  let created = 0;
  let skipped = 0;

  for (const [family, variants] of byFamily) {
    const health = isHealthFamily(family, healthHints);
    for (const market of PACK_MARKETS) {
      const id = variantId(family, market);
      const outPath = path.join(catalogDir, `${id}.agent.json`);
      // Never clobber Claude Cluster B deepened packs.
      if (CLUSTER_B_PROTECTED.has(family) && market !== "us" && fs.existsSync(outPath)) {
        if (!variants[market]) {
          variants[market] = JSON.parse(fs.readFileSync(outPath, "utf8"));
        }
        skipped++;
        continue;
      }
      if (variants[market] || fs.existsSync(outPath)) {
        if (!variants[market] && fs.existsSync(outPath)) {
          variants[market] = JSON.parse(fs.readFileSync(outPath, "utf8"));
        }
        skipped++;
        continue;
      }
      const source = pickSource(variants, market);
      if (!source) {
        console.warn(`skip ${id}: no source package for family ${family}`);
        continue;
      }
      const pack = packs[market];
      const pkg = applyOverlay(source.pkg, source.market, family, pack, health);
      fs.writeFileSync(outPath, JSON.stringify(pkg, null, 2) + "\n");
      variants[market] = pkg;
      created++;
      process.stdout.write(`created ${id} (from ${source.pkg.manifest.id})\n`);
    }
  }

  const index = rebuildIndex(byFamily);
  fs.writeFileSync(path.join(catalogDir, "index.json"), JSON.stringify(index, null, 2) + "\n");

  const families = buildFamilies(byFamily, healthHints);
  fs.writeFileSync(path.join(catalogDir, "families.json"), JSON.stringify(families, null, 2) + "\n");

  // Coverage check
  const incomplete = families.filter((f) => f.packs.length < 4);
  console.log(`\nDone. created=${created} skipped_existing=${skipped}`);
  console.log(`agents=${index.length} families=${families.length}`);
  console.log(
    `markets:`,
    Object.fromEntries(
      ["za", ...PACK_MARKETS].map((m) => [m, index.filter((i) => i.market === m).length]),
    ),
  );
  if (incomplete.length) {
    console.warn(`WARNING: ${incomplete.length} families missing packs:`, incomplete.map((f) => f.id));
    process.exitCode = 1;
  } else {
    console.log("All families have us/eu/africa/asia packs.");
  }
}

main();
