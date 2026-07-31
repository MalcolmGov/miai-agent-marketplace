#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const agentsRoot =
  process.env.MIAI_AGENTS_PATH ||
  path.resolve(root, "../miai-agents-audit/agents");
const outDir = path.join(root, "data/catalog");

function bundleAgent(dir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  const read = (rel) => fs.readFileSync(path.join(dir, rel), "utf8");
  const evals = read(manifest.evals)
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
  return {
    format: "miai.agent-package/v1",
    manifest,
    system_prompt: read(manifest.prompt),
    knowledge: read(manifest.knowledge),
    tools: JSON.parse(read(manifest.tools)),
    guardrails: read(manifest.guardrails),
    evals,
  };
}

fs.mkdirSync(outDir, { recursive: true });
const ids = fs.readdirSync(agentsRoot).filter((name) => {
  const p = path.join(agentsRoot, name);
  return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, "manifest.json"));
});

const index = [];
for (const id of ids) {
  const pkg = bundleAgent(path.join(agentsRoot, id));
  const out = path.join(outDir, `${id}.agent.json`);
  fs.writeFileSync(out, JSON.stringify(pkg, null, 2) + "\n");
  index.push({
    id: pkg.manifest.id,
    name: pkg.manifest.name,
    tier: pkg.manifest.tier,
    category: pkg.manifest.category,
    market: pkg.manifest.market ?? "za",
    summary: pkg.manifest.summary,
    channels: pkg.manifest.channels,
    tools: pkg.tools.length,
    evals: pkg.evals.length,
  });
  process.stdout.write(`bundled ${id}\n`);
}

fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify(index, null, 2) + "\n");
console.log(`\nImported ${index.length} agents → ${outDir}`);
