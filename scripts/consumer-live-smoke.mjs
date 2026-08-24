// Live smoke for the 4 consumer "life agents" — real model via runTurn (tool loop on).
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const catalogDir = path.join(root, "data/catalog");

const { runTurn, createModelAdapter } = await import(
  path.join(root, "packages/runtime/dist/index.js")
);
const { MockWalletAdapter } = await import(
  path.join(root, "packages/wallet-adapter/dist/index.js")
);
const { loadAgentPackage } = await import(
  path.join(root, "packages/agent-protocol/dist/index.js")
);

const CASES = [
  { agentId: "travel-planner", prompt: "What's the best time of year to visit Lisbon, and what's the weather like?" },
  { agentId: "learning-tutor", prompt: "Explain how photosynthesis works in simple steps." },
  { agentId: "career-coach", prompt: "Draft a cover letter for a marketing role at Acme." },
  { agentId: "family-organizer", prompt: "Add my daughter Aya's school play to the calendar for Thursday at 5pm." },
];

function looksBroken(reply) {
  return /trouble reaching my knowledge|try again in a moment|Happy to help\.|I'm a demo|mock mode|I don't have enough/i.test(reply);
}

const model = createModelAdapter();
let totalCost = 0;

for (const c of CASES) {
  const raw = JSON.parse(await fs.readFile(path.join(catalogDir, `${c.agentId}.agent.json`), "utf8"));
  const pkg = loadAgentPackage(raw);
  const result = await runTurn(
    {
      workspaceId: "consumer-live-smoke",
      agentId: c.agentId,
      pkg,
      messages: [],
      userMessage: c.prompt,
      model: pkg.manifest.model.primary,
      mode: "live",
      state: "live",
      consumerLine: true,
    },
    { wallet: new MockWalletAdapter(500_000), model, skipDebit: true },
  );
  const reply = result.assistantMessage || "";
  const ok = !result.paused && reply.length > 40 && !looksBroken(reply);
  const tools = (result.toolCalls || []).map((t) => t.name).join(",") || "-";
  console.log(`${ok ? "PASS" : "FAIL"}  ${c.agentId}  [tools: ${tools}]`);
  console.log(`   Q: ${c.prompt}`);
  console.log(`   A: ${reply.slice(0, 240).replace(/\n+/g, " ")}`);
  console.log("");
}

console.log("Note: token cost billed directly to the OpenAI account (gpt-4o primary; ~4 calls).");
