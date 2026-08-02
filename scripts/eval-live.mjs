#!/usr/bin/env node
/**
 * Live-LLM eval harness (NOT part of CI / mock gate).
 *
 * Measures real answer quality without MockModel answer-injection.
 * Requires a live model mode + API key. Writes a short report under docs/reports/.
 *
 *   MIAI_MODEL_MODE=anthropic ANTHROPIC_API_KEY=… pnpm eval:live
 *   MIAI_MODEL_MODE=openai OPENAI_API_KEY=… pnpm eval:live --limit=6
 *
 * Exit 0 always when the run completes (report is the deliverable).
 * Exit 2 if called in mock mode or without keys.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const catalogDir = path.join(root, "data/catalog");

const mode = process.env.MIAI_MODEL_MODE ?? "mock";
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Math.max(1, Number(limitArg.split("=")[1]) || 8) : 8;

console.log("eval-live — live model quality sample (separated from mock CI gate)");
console.log("model_mode:", mode);

if (mode === "mock") {
  console.error("Refusing mock mode. Set MIAI_MODEL_MODE=anthropic|openai|gateway.");
  process.exit(2);
}
if (mode === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY required");
  process.exit(2);
}
if (mode === "openai" && !process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY required");
  process.exit(2);
}

const { runTurn, createModelAdapter } = await import(
  path.join(root, "packages/runtime/dist/index.js")
);
const { MockWalletAdapter } = await import(
  path.join(root, "packages/wallet-adapter/dist/index.js")
);
const { loadAgentPackage } = await import(
  path.join(root, "packages/agent-protocol/dist/index.js")
);

/** Small fixed sample — no knowledgeHit answer injection; lexical retrieval only. */
const SAMPLE = [
  { agentId: "us-hr-helpdesk", prompt: "What is the PTO accrual policy for full-time staff?" },
  { agentId: "us-customer-support", prompt: "How do I reset my password?" },
  { agentId: "eu-customer-support", prompt: "How do I escalate a billing complaint?" },
  { agentId: "africa-clinic-front-desk", prompt: "What documents should I bring to my first visit?" },
  { agentId: "us-restaurant-takeaway", prompt: "Do you offer gluten-free options?" },
  { agentId: "asia-salon-booking", prompt: "Can I book a haircut for Saturday morning?" },
  { agentId: "us-delivery-tracking", prompt: "Where is my package right now?" },
  { agentId: "eu-trades-receptionist", prompt: "Can someone come out for an emergency plumbing issue?" },
];

function looksBroken(reply) {
  return /trouble reaching my knowledge|try again in a moment|Happy to help\.|I'm a demo|mock mode|I don't have enough information/i.test(
    reply,
  );
}

async function catalogExists(agentId) {
  try {
    await fs.access(path.join(catalogDir, `${agentId}.agent.json`));
    return true;
  } catch {
    return false;
  }
}

async function runOne(agentId, prompt) {
  const raw = JSON.parse(
    await fs.readFile(path.join(catalogDir, `${agentId}.agent.json`), "utf8"),
  );
  const pkg = loadAgentPackage(raw);
  const model = createModelAdapter();
  // Live adapter path — MockModel knowledgeHit / answer-injection never runs.
  const result = await runTurn(
    {
      workspaceId: "eval-live",
      agentId,
      pkg,
      messages: [],
      userMessage: prompt,
      model: pkg.manifest.model.primary,
      mode: "live",
      state: "rented",
    },
    { wallet: new MockWalletAdapter(500_000), model, skipDebit: true },
  );
  const reply = result.assistantMessage || "";
  const ok = !result.paused && reply.length > 40 && !looksBroken(reply);
  return { agentId, prompt, ok, replyPreview: reply.slice(0, 240), paused: result.paused };
}

const cases = [];
for (const row of SAMPLE) {
  if (cases.length >= limit) break;
  if (await catalogExists(row.agentId)) cases.push(row);
}

if (!cases.length) {
  console.error("No sample packs found under data/catalog");
  process.exit(1);
}

const results = [];
for (const c of cases) {
  process.stdout.write(`… ${c.agentId} `);
  try {
    const r = await runOne(c.agentId, c.prompt);
    results.push(r);
    console.log(r.ok ? "PASS" : "FAIL");
  } catch (err) {
    results.push({
      agentId: c.agentId,
      prompt: c.prompt,
      ok: false,
      replyPreview: err instanceof Error ? err.message : String(err),
      paused: false,
    });
    console.log("ERROR");
  }
}

const passed = results.filter((r) => r.ok).length;
const rate = ((passed / results.length) * 100).toFixed(1);
const stamp = new Date().toISOString().slice(0, 10);
const reportPath = path.join(root, "docs/reports", `eval-live-${stamp}.md`);

const md = `# Live-LLM eval sample — ${stamp}

**Not a CI gate.** MockModel suite pass-rates do **not** equal live quality.

| Field | Value |
|---|---|
| Model mode | \`${mode}\` |
| Sample size | ${results.length} |
| Live pass | ${passed}/${results.length} (${rate}%) |
| MockModel answer-injection | **not used** (live adapter only) |
| Retrieval | lexical (default); semantic path optional / flag-gated |

## Results

${results
  .map(
    (r) =>
      `### ${r.ok ? "✅" : "❌"} \`${r.agentId}\`\n- **Prompt:** ${r.prompt}\n- **Preview:** ${r.replyPreview.replace(/\n/g, " ")}\n`,
  )
  .join("\n")}

## Notes

- Compare this live pass-rate to the mock \`eval:suite:static\` numbers — they measure different things.
- Semantic/embeddings retrieval remains optional; do not treat lexical-only failures as catalogue defects without a live re-run.
`;

await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, md);
console.log(`\nLive pass-rate: ${rate}% (${passed}/${results.length})`);
console.log(`Report: ${reportPath}`);
