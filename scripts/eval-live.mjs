#!/usr/bin/env node
/**
 * Live-LLM eval harness (NOT part of CI / mock gate).
 *
 * Measures real answer quality without MockModel answer-injection.
 * Requires a live model mode + API key. Writes a short report under docs/reports/.
 *
 *   MIAI_MODEL_MODE=anthropic ANTHROPIC_API_KEY=… pnpm eval:live
 *   MIAI_MODEL_MODE=openai OPENAI_API_KEY=… pnpm eval:live --limit=6
 *   pnpm eval:live --set=flagship-1a
 *   pnpm eval:live --set=flagship-2
 *   pnpm eval:live --set=flagship-1b
 *   pnpm eval:live --set=go-live-18 --limit=18
 *   pnpm eval:live --families=mobile-money,tax-office
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
const familiesArg = process.argv.find((a) => a.startsWith("--families="));
const setArg = process.argv.find((a) => a.startsWith("--set="));
const namedSet = setArg?.split("=")[1]?.trim() || "";
const familyFilter = (familiesArg?.split("=")[1] || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
/** Default 8 for legacy SAMPLE; named sets / family filters use full pool unless --limit= set. */
const limit = limitArg
  ? Math.max(1, Number(limitArg.split("=")[1]) || 8)
  : namedSet || familyFilter.length
    ? 100
    : 8;

console.log("eval-live — live model quality sample (separated from mock CI gate)");
console.log("model_mode:", mode);
if (namedSet) console.log("set:", namedSet);
if (familyFilter.length) console.log("families:", familyFilter.join(", "));

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

/** Flagship depth Phase 1a families (Go-live 18 gap close). */
const FLAGSHIP_1A = [
  {
    agentId: "us-accounting-practice",
    prompt: "When is monthly payroll tax due?",
  },
  {
    agentId: "us-events-venue",
    prompt: "What wedding packages do you offer?",
  },
  {
    agentId: "us-building-management",
    prompt: "How much is the monthly levy for a 2-bedroom?",
  },
  {
    agentId: "us-pharmacy",
    prompt: "Do you have Panado 500mg in stock?",
  },
  {
    agentId: "us-gym-membership",
    prompt: "What memberships do you offer?",
  },
];

/** Flagship depth Phase 2 — financial services (+ optional veterinary). */
const FLAGSHIP_2 = [
  { agentId: "us-mobile-money", prompt: "What's my float?" },
  { agentId: "us-wealth-management", prompt: "What are the key facts about your wealth desk?" },
  { agentId: "us-tax-office", prompt: "When is the individual filing deadline?" },
  { agentId: "us-veterinary", prompt: "What do you charge for a wellness consult?" },
];

/** Flagship depth Phase 1b — Cluster B runtime-only (trades already via booking-front-desk). */
const FLAGSHIP_1B = [
  { agentId: "us-customer-support", prompt: "Where's order 4821?" },
  { agentId: "us-delivery-tracking", prompt: "Where's my parcel? Waybill SLC-4821" },
  { agentId: "us-trades-receptionist", prompt: "What does drain clearing start at?" },
];

/** Hero showcase set — GO_LIVE_18 us-* packs (one prompt each). */
const GO_LIVE_18 = [
  ...FLAGSHIP_1A,
  { agentId: "us-dental-front-desk", prompt: "What treatments do you offer?" },
  { agentId: "us-hotel-guest", prompt: "What time is breakfast?" },
  { agentId: "us-executive-assistant", prompt: "What's on my calendar tomorrow?" },
  { agentId: "us-it-helpdesk", prompt: "My laptop won't connect to VPN." },
  { agentId: "us-sales-qualifier", prompt: "Tell me about the Growth plan." },
  { agentId: "us-salon-booking", prompt: "Can I book a haircut Saturday morning?" },
  { agentId: "us-home-services", prompt: "I need a plumber this week." },
  { agentId: "us-clinic-front-desk", prompt: "What should I bring to my first visit?" },
  { agentId: "us-restaurant-takeaway", prompt: "Do you offer gluten-free options?" },
  { agentId: "us-customer-support", prompt: "How do I reset my password?" },
  { agentId: "us-delivery-tracking", prompt: "Where is my package?" },
  { agentId: "us-trades-receptionist", prompt: "Emergency plumbing — can someone come out?" },
  { agentId: "us-onboarding-buddy", prompt: "What do I do on my first day?" },
];

function familyKey(agentId) {
  return agentId.replace(/^(us|eu|africa|asia|oceania)-/i, "");
}

function selectSample() {
  if (namedSet === "flagship-1a") return FLAGSHIP_1A;
  if (namedSet === "flagship-1b") return FLAGSHIP_1B;
  if (namedSet === "flagship-2" || namedSet === "financial-services") return FLAGSHIP_2;
  if (namedSet === "go-live-18") return GO_LIVE_18;
  if (familyFilter.length) {
    const wanted = new Set(familyFilter.map((f) => f.replace(/^us-/i, "")));
    const fromKnown = [
      ...FLAGSHIP_1A,
      ...FLAGSHIP_1B,
      ...FLAGSHIP_2,
      ...GO_LIVE_18,
      ...SAMPLE,
    ].filter((row) => wanted.has(familyKey(row.agentId)));
    const extras = [...wanted]
      .filter((f) => !fromKnown.some((r) => familyKey(r.agentId) === f))
      .map((f) => ({
        agentId: f.startsWith("us-") ? f : `us-${f}`,
        prompt: "What can you help me with today?",
      }));
    return [...fromKnown, ...extras];
  }
  return SAMPLE;
}

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

const pool = selectSample();
const cases = [];
for (const row of pool) {
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
