/**
 * Shared Wave 4 proof recorder (JSON + pilot Evidence line).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
export const proofsPath = path.join(root, "data/wave4-live-proofs.json");

export function loadProofs() {
  if (!fs.existsSync(proofsPath)) {
    return { version: 1, updatedAt: null, proofs: [] };
  }
  return JSON.parse(fs.readFileSync(proofsPath, "utf8"));
}

export function recordProof({
  agentId,
  connector,
  corr,
  notes,
  environment,
  upgradeDepth = true,
}) {
  const family = agentId?.replace(/^(us|eu|africa|asia|oceania)-/, "");
  const doc = loadProofs();
  const entry = {
    agentId,
    family,
    connector,
    correlationId: corr,
    at: new Date().toISOString(),
    environment: environment || "unspecified",
    notes: notes || "Wave 4 proof",
  };
  doc.proofs = (doc.proofs || []).filter(
    (p) => !(p.agentId === agentId && p.connector === connector),
  );
  doc.proofs.push(entry);
  doc.updatedAt = entry.at;
  fs.writeFileSync(proofsPath, JSON.stringify(doc, null, 2) + "\n");

  const pilotPath = path.join(root, "docs/pilots", `${family}.md`);
  if (fs.existsSync(pilotPath)) {
    let md = fs.readFileSync(pilotPath, "utf8");
    const line = `- Evidence: \`${corr}\` — live \`${connector}\` on ${entry.environment} (${entry.at.slice(0, 10)})`;
    if (/^- Evidence:/m.test(md)) {
      md = md.replace(/^- Evidence:.*$/m, line);
    } else {
      md = md.replace(/^- Depth:.*$/m, (m) => `${m}\n${line}`);
    }
    if (upgradeDepth && !/^- Depth: live/m.test(md) && /^- Depth: strong/m.test(md)) {
      md = md.replace(/^- Depth: strong$/m, "- Depth: live");
    }
    fs.writeFileSync(pilotPath, md.endsWith("\n") ? md : md + "\n");
  }
  return entry;
}
