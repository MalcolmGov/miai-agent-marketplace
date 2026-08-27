/**
 * P0-6 (UI) — annotate the catalogue index with `requiresConnectors`.
 *
 * The catalogue listing is served from a precomputed data/catalog/index.json (500 entries, a `tools`
 * COUNT only). To badge "Needs setup" without loading 500 packages per request, we precompute each
 * agent's gated (oauth/mcp) connector requirements offline and store them on the index entry. Purely
 * additive: re-serializes with the same JSON.stringify(...,2)+"\n" the index already uses, so the
 * diff only adds `requiresConnectors` lines. Re-run whenever packages/presets/bindings change.
 *
 *   pnpm build:packages && node scripts/annotate-connector-requirements.mjs
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const { loadAgentPackage } = require(path.join(root, "packages/agent-protocol/dist/index.js"));
const { getPreset, defaultBindingsForTools } = require(path.join(root, "packages/presets/dist/index.js"));
const { requiredExternalConnectors } = require(path.join(root, "packages/connectors/dist/index.js"));

const catalogDir = path.join(root, "data/catalog");
const indexPath = path.join(catalogDir, "index.json");

const index = JSON.parse(await fs.readFile(indexPath, "utf8"));
let withConnectors = 0;
let missingPkg = 0;

for (const entry of index) {
  let pkg;
  try {
    const raw = JSON.parse(await fs.readFile(path.join(catalogDir, `${entry.id}.agent.json`), "utf8"));
    pkg = loadAgentPackage(raw);
  } catch {
    missingPkg += 1;
    delete entry.requiresConnectors;
    continue;
  }
  const bindings = getPreset(entry.id)?.bindings ?? defaultBindingsForTools(pkg.tools.map((t) => t.name));
  const required = requiredExternalConnectors(pkg.tools, bindings);
  if (required.length) {
    entry.requiresConnectors = required;
    withConnectors += 1;
  } else {
    delete entry.requiresConnectors; // keep the index lean for the (common) no-connector case
  }
}

await fs.writeFile(indexPath, JSON.stringify(index, null, 2) + "\n");
console.log(
  `annotated ${index.length} entries — ${withConnectors} require connectors, ${missingPkg} package(s) missing`,
);
