#!/usr/bin/env node
/**
 * Real-LLM smoke — uses createModelAdapter() (Anthropic/OpenAI/gateway).
 *
 * Single agent (default):
 *   MIAI_MODEL_MODE=anthropic node scripts/live-llm-smoke.mjs [agentId] [prompt...]
 *
 * Go-live 18 matrix:
 *   MIAI_MODEL_MODE=anthropic node scripts/live-llm-smoke.mjs --matrix
 *   LIVE_LLM_MATRIX=1 MIAI_MODEL_MODE=anthropic node scripts/live-llm-smoke.mjs
 */
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const catalogDir = path.join(root, "data/catalog");
const pilotPath = path.join(root, "apps/web/src/lib/monday-pilot.ts");

const MATRIX_PROMPT =
  "What are your opening hours or how can you help?";

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
const matrixMode =
  process.argv.includes("--matrix") || process.env.LIVE_LLM_MATRIX === "1";

console.log("model_mode:", mode);
console.log("anthropic_key:", process.env.ANTHROPIC_API_KEY ? "set" : "missing");
console.log("openai_key:", process.env.OPENAI_API_KEY ? "set" : "missing");

if (mode === "mock") {
  console.error("Refusing mock mode — set MIAI_MODEL_MODE=anthropic (or openai/gateway).");
  process.exit(2);
}

function looksBroken(reply) {
  return /trouble reaching my knowledge|try again in a moment|Happy to help\.|I'm a demo|mock mode/i.test(
    reply,
  );
}

function scoreReply(result) {
  const reply = result.assistantMessage || "";
  const ok = !result.paused && reply.length > 20 && !looksBroken(reply);
  return { ok, reply, tools: (result.toolCalls || []).map((t) => t.name) };
}

async function catalogExists(agentId) {
  try {
    await fs.access(path.join(catalogDir, `${agentId}.agent.json`));
    return true;
  } catch {
    return false;
  }
}

async function resolveAgentId(family) {
  const usId = `us-${family}`;
  if (await catalogExists(usId)) return usId;
  if (await catalogExists(family)) return family;
  return null;
}

async function loadGoLive18Families() {
  const src = await fs.readFile(pilotPath, "utf8");
  const block = src.match(/GO_LIVE_18_FAMILY_IDS\s*=\s*\[([\s\S]*?)\]\s*as\s*const/);
  if (!block) {
    throw new Error(`Could not parse GO_LIVE_18_FAMILY_IDS from ${pilotPath}`);
  }
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

async function runSmoke(agentId, userMessage) {
  const raw = JSON.parse(
    await fs.readFile(path.join(catalogDir, `${agentId}.agent.json`), "utf8"),
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
  const { ok, reply, tools } = scoreReply(result);
  return {
    agentId,
    ok,
    ms,
    tools,
    replySnippet: reply.slice(0, 80).replace(/\s+/g, " "),
    reply,
    tokensDebited: result.tokensDebited,
  };
}

function pad(str, len) {
  const s = String(str);
  return s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length);
}

async function runMatrix() {
  const families = await loadGoLive18Families();
  const agentIds = [];
  for (const family of families) {
    const id = await resolveAgentId(family);
    if (!id) {
      console.error(`SKIP ${family}: no catalog pack (us-${family} or ${family})`);
      continue;
    }
    agentIds.push(id);
  }

  console.log(`matrix: ${agentIds.length} agents (Go-live 18 families)`);
  console.log(`prompt: ${MATRIX_PROMPT}`);
  console.log("");

  const rows = [];
  for (const agentId of agentIds) {
    process.stdout.write(`  ${agentId} ... `);
    try {
      const row = await runSmoke(agentId, MATRIX_PROMPT);
      rows.push(row);
      console.log(row.ok ? "PASS" : "FAIL", `${row.ms}ms`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      rows.push({
        agentId,
        ok: false,
        ms: 0,
        tools: [],
        replySnippet: `error: ${msg}`.slice(0, 80),
        reply: "",
        tokensDebited: 0,
      });
      console.log("FAIL", msg);
    }
  }

  console.log("");
  console.log(
    `${pad("agentId", 28)} ${pad("status", 6)} ${pad("ms", 6)} ${pad("tools", 24)} reply`,
  );
  console.log("-".repeat(100));
  for (const r of rows) {
    const tools = r.tools.length ? r.tools.join(",") : "-";
    console.log(
      `${pad(r.agentId, 28)} ${pad(r.ok ? "PASS" : "FAIL", 6)} ${pad(String(r.ms), 6)} ${pad(tools, 24)} ${r.replySnippet}`,
    );
  }

  const failed = rows.filter((r) => !r.ok);
  console.log("");
  console.log(`Matrix: ${rows.length - failed.length}/${rows.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

async function runSingle() {
  const argv = process.argv.slice(2).filter((a) => a !== "--matrix");
  const agentId = argv[0] || "us-customer-support";
  const userMessage = argv.slice(1).join(" ") || MATRIX_PROMPT;

  console.log("agent:", agentId);
  console.log("prompt:", userMessage);

  const row = await runSmoke(agentId, userMessage);

  console.log("---");
  console.log(row.ok ? "PASS" : "FAIL");
  console.log("duration_ms:", row.ms);
  console.log("tools:", row.tools.join(",") || "-");
  console.log("tokens_debited:", row.tokensDebited);
  console.log("reply:\n" + row.reply.slice(0, 800));
  process.exit(row.ok ? 0 : 1);
}

if (matrixMode) {
  await runMatrix();
} else {
  await runSingle();
}
