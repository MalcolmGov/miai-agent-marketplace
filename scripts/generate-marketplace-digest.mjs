#!/usr/bin/env node
/**
 * Regenerates data/platform/marketplace-catalogue-digest.md from families.json
 * and refreshes the knowledge blob inside marketplace-assistant.agent.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const families = JSON.parse(
  fs.readFileSync(path.join(root, "data/catalog/families.json"), "utf8"),
);
const DEMO = new Set([
  "executive-assistant",
  "it-helpdesk",
  "dental-front-desk",
  "hotel-guest",
  "sales-qualifier",
  "home-services",
]);

const lines = [
  "# Catalogue digest — agent families",
  "",
  `Total families: ${families.length}. Each ships in US / EU / Africa / Asia packs (220 agents).`,
  "",
  // Skip demo shortlist — customer-facing Ask AI should not surface internal shortlists.
  "## All families",
  "",
];
for (const f of [...families].sort((a, b) => a.name.localeCompare(b.name))) {
  const markets = Object.keys(f.markets || {}).join(", ");
  const agentId = f.markets?.us || Object.values(f.markets || {})[0] || f.id;
  lines.push(`### ${f.name}`);
  lines.push(`- Id: \`${f.id}\` · Tier: ${f.tier} · Markets: ${markets}`);
  lines.push(`- Channels: ${(f.channels || []).join(", ")}`);
  lines.push(`- ${f.summary}`);
  lines.push(`- Studio: /agents/${agentId}`);
  lines.push("");
}

const digestPath = path.join(root, "data/platform/marketplace-catalogue-digest.md");
fs.writeFileSync(digestPath, lines.join("\n"));

const knowledgeCore = fs.readFileSync(
  path.join(root, "data/platform/marketplace-assistant-knowledge.md"),
  "utf8",
);
const pkgPath = path.join(root, "data/platform/marketplace-assistant.agent.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.knowledge = `${knowledgeCore}\n\n${lines.join("\n")}`;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`Updated digest (${families.length} families) and assistant package knowledge.`);
