#!/usr/bin/env node
/**
 * Build a diligence-facing live-LLM scoreboard from docs/reports/eval-live-*.md
 * and Wave 4 connector proofs. Does NOT claim MockModel % as live quality.
 *
 *   pnpm scoreboard:live
 *
 * Writes: data/reports/eval-live-scoreboard.json
 * Also regenerates: docs/reports/eval-live-scoreboard-YYYY-MM-DD.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const reportsDir = path.join(root, "docs/reports");
const proofsPath = path.join(root, "data/wave4-live-proofs.json");
const outJson = path.join(root, "data/reports/eval-live-scoreboard.json");

const DISCLAIMER =
  "Live-LLM samples only (real model adapter). MockModel catalogue eval pass-rates are a different metric and must not be sold as live quality. Coverage is the hero / flagship sets named below — not the full 551-agent catalogue.";

const SET_LABELS = {
  "go-live-18": "Go-live 18 heroes",
  "flagship-1a": "Flagship depth Phase 1a",
  "flagship-1b": "Flagship depth Phase 1b",
  "flagship-2": "Flagship depth Phase 2 (financial + vet)",
  sample: "Ad-hoc sample",
};

function parseReport(filePath) {
  const base = path.basename(filePath);
  const m = base.match(/^eval-live-(\d{4}-\d{2}-\d{2})(?:-(.+))?\.md$/);
  if (!m) return null;
  const date = m[1];
  const setId = m[2] ?? "sample";
  const text = fs.readFileSync(filePath, "utf8");

  const mode = text.match(/\|\s*Model mode\s*\|\s*`([^`]+)`/)?.[1] ?? "unknown";
  const sampleSize = Number(text.match(/\|\s*Sample size\s*\|\s*(\d+)/)?.[1] ?? 0);
  const passMatch = text.match(/\|\s*Live pass\s*\|\s*(\d+)\/(\d+)\s*\(([\d.]+)%\)/);
  const passed = Number(passMatch?.[1] ?? 0);
  const total = Number(passMatch?.[2] ?? sampleSize);
  const rate = Number(passMatch?.[3] ?? (total ? ((passed / total) * 100).toFixed(1) : 0));

  const results = [];
  const blocks = text.split(/^### /m).slice(1);
  for (const block of blocks) {
    const head = block.match(/^([✅❌])\s+`([^`]+)`/);
    if (!head) continue;
    const prompt = block.match(/\*\*Prompt:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
    const preview = block.match(/\*\*Preview:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
    results.push({
      agentId: head[2],
      ok: head[1] === "✅",
      prompt,
      preview: preview.slice(0, 280),
    });
  }

  return {
    id: setId,
    label: SET_LABELS[setId] ?? setId,
    reportFile: base,
    date,
    modelMode: mode,
    passed,
    total,
    rate,
    results,
  };
}

function loadConnectorProofs() {
  if (!fs.existsSync(proofsPath)) {
    return { agentsProven: 0, sliceTarget: 0, connectors: [], proofs: [] };
  }
  const doc = JSON.parse(fs.readFileSync(proofsPath, "utf8"));
  const slice = doc.slice ?? [];
  const proofs = doc.proofs ?? [];
  const agentsWithProof = new Set(proofs.map((p) => p.agentId));
  const connectors = [...new Set(proofs.map((p) => p.connector))].sort((a, b) =>
    a.localeCompare(b),
  );
  return {
    agentsProven: slice.filter((id) => agentsWithProof.has(id)).length,
    sliceTarget: slice.length,
    connectors,
    proofs: proofs.map((p) => ({
      agentId: p.agentId,
      connector: p.connector,
      correlationId: p.correlationId,
      at: p.at,
      notes: p.notes ?? "",
    })),
  };
}

const files = fs
  .readdirSync(reportsDir)
  .filter((f) => /^eval-live-\d{4}-\d{2}-\d{2}/.test(f) && f.endsWith(".md") && !f.includes("scoreboard"))
  .map((f) => path.join(reportsDir, f))
  .sort();

const parsed = files.map(parseReport).filter(Boolean);

/** Newest report wins per set id; drop superseded 0% ad-hoc samples when a named set exists. */
const bySet = new Map();
for (const report of parsed) {
  const prev = bySet.get(report.id);
  if (!prev || report.date >= prev.date) bySet.set(report.id, report);
}

const sets = [...bySet.values()]
  .filter((s) => !(s.id === "sample" && s.rate === 0 && bySet.size > 1))
  .sort((a, b) => {
    const order = ["go-live-18", "flagship-1a", "flagship-1b", "flagship-2"];
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return b.date.localeCompare(a.date);
  });

const connectorProofs = loadConnectorProofs();
const stamp = new Date().toISOString().slice(0, 10);
const payload = {
  version: 1,
  updatedAt: new Date().toISOString(),
  disclaimer: DISCLAIMER,
  coverageNote:
    "Hero / flagship sets only. Depth: live on pilots still requires OAuth connector evidence (Wave 4), not merely a live-LLM FAQ pass.",
  sets,
  connectorProofs,
};

fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(payload, null, 2) + "\n");

const mdPath = path.join(reportsDir, `eval-live-scoreboard-${stamp}.md`);
const md = `# Live-LLM quality scoreboard — ${stamp}

**${DISCLAIMER}**

## Summary

| Set | Date | Model | Live pass |
|---|---|---|---|
${sets.map((s) => `| ${s.label} (\`${s.id}\`) | ${s.date} | \`${s.modelMode}\` | **${s.passed}/${s.total}** (${s.rate}%) |`).join("\n")}

## Wave 4 connector proofs (first slice)

- Agents with recorded proof: **${connectorProofs.agentsProven} / ${connectorProofs.sliceTarget}**
- Connectors proven: ${connectorProofs.connectors.join(", ") || "(none)"}
- Staging OAuth may show \`configured=true\` but \`connected=false\` until Actions → Connect is re-run.

## Per-set detail

${sets
  .map((s) => {
    const rows = s.results
      .map((r) => `| ${r.ok ? "✅" : "❌"} | \`${r.agentId}\` | ${r.prompt.replace(/\|/g, "/")} |`)
      .join("\n");
    return `### ${s.label}\n\nSource: \`docs/reports/${s.reportFile}\`\n\n| | Agent | Prompt |\n|---|---|---|\n${rows}\n`;
  })
  .join("\n")}

## Honest labeling

- This page/report is **not** a CI gate.
- Do **not** equate these rates with \`eval:suite:static\` MockModel numbers.
- Do **not** claim full-catalogue live quality from hero-set samples.
`;

fs.writeFileSync(mdPath, md);
console.log(`Scoreboard JSON: ${outJson}`);
console.log(`Scoreboard MD:   ${mdPath}`);
console.log(
  `Sets: ${sets.map((s) => `${s.id} ${s.passed}/${s.total}`).join(", ") || "(none)"}`,
);
