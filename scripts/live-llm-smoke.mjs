#!/usr/bin/env node
/**
 * Real-LLM smoke — uses createModelAdapter() (Anthropic/OpenAI/gateway).
 * Run with Railway env injected:
 *   MIAI_MODEL_MODE=anthropic railway run -- node scripts/live-llm-smoke.mjs
 */
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const { runTurn, createModelAdapter } = await import(
  path.join(root, "packages/runtime/dist/index.js")
);
const { MockWalletAdapter } = await import(
  path.join(root, "packages/wallet-adapter/dist/index.js")
);
const { loadAgentPackage } = await import(
  path.join(root, "packages/agent-protocol/dist/index.js")
);

const mode = process.env.MIAI_MODEL_MODE ?? "mock";
const agentId = process.argv[2] || "us-customer-support";
const userMessage =
  process.argv.slice(3).join(" ") || "Where is my order ORD-4821 and what is your refund window?";

console.log("model_mode:", mode);
console.log("anthropic_key:", process.env.ANTHROPIC_API_KEY ? "set" : "missing");
console.log("openai_key:", process.env.OPENAI_API_KEY ? "set" : "missing");
console.log("agent:", agentId);
console.log("prompt:", userMessage);

if (mode === "mock") {
  console.error("Refusing mock mode — set MIAI_MODEL_MODE=anthropic (or openai/gateway).");
  process.exit(2);
}

const raw = JSON.parse(
  await fs.readFile(path.join(root, "data/catalog", `${agentId}.agent.json`), "utf8"),
);
const pkg = loadAgentPackage(raw);
const model = createModelAdapter();
const started = Date.now();

const result = await runTurn(
  {
    workspaceId: "live-llm-smoke",
    agentId,
    pkg,
    messages: [],
    userMessage,
    model: pkg.manifest.model.primary,
    mode: "sandbox",
    state: "rented",
  },
  { wallet: new MockWalletAdapter(500_000), model, skipDebit: true },
);

const ms = Date.now() - started;
const reply = result.assistantMessage || "";
const looksBroken =
  /trouble reaching my knowledge|try again in a moment|Happy to help\.|I'm a demo|mock mode/i.test(
    reply,
  );
const ok = !result.paused && reply.length > 20 && !looksBroken;

console.log("---");
console.log(ok ? "PASS" : "FAIL");
console.log("duration_ms:", ms);
console.log("tools:", result.toolCalls.map((t) => t.name).join(",") || "-");
console.log("tokens_debited:", result.tokensDebited);
console.log("reply:\n" + reply.slice(0, 800));
process.exit(ok ? 0 : 1);
