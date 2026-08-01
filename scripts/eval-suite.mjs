#!/usr/bin/env node
/**
 * Zero-token catalogue eval suite.
 * - Static: eval expectations vs knowledge / tools / presets
 * - Runtime: MockModelAdapter + sandbox stubs (no OpenAI)
 *
 * Usage:
 *   pnpm eval:suite
 *   pnpm eval:suite --market us
 *   pnpm eval:suite --agents us-hr-helpdesk,us-customer-support
 *   pnpm eval:suite --static-only
 *   pnpm eval:suite --max-evals 8
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const catalogDir = path.join(root, "data/catalog");
const require = createRequire(import.meta.url);

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function hasFlag(flag) {
  return process.argv.includes(flag);
}

const marketFilter = argValue("--market");
const agentsFilter = (argValue("--agents") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const maxEvals = Number(argValue("--max-evals") || 0) || Infinity;
const staticOnly = hasFlag("--static-only");

await import(path.join(root, "packages/runtime/dist/index.js")).catch(async () => {
  console.error("Build packages first: pnpm build:packages");
  process.exit(1);
});

const { runTurn, MockModelAdapter } = await import(
  path.join(root, "packages/runtime/dist/index.js")
);
const { MockWalletAdapter } = await import(
  path.join(root, "packages/wallet-adapter/dist/index.js")
);
const { loadAgentPackage } = await import(
  path.join(root, "packages/agent-protocol/dist/index.js")
);

let getPreset = () => undefined;
try {
  ({ getPreset } = require(path.join(root, "packages/presets/dist/index.js")));
} catch {
  console.warn("presets dist missing — preset checks skipped");
}

function stripEvalNoise(input) {
  return String(input || "")
    .replace(/\n*##\s*(US|EU|Africa|Asia)?\s*compliance notes[\s\S]*$/i, "")
    .replace(/\n*##\s*Market operations appendix[\s\S]*$/i, "")
    .trim();
}

function includesAny(hay, needles) {
  const h = hay.toLowerCase();
  const hCompactDigits = h.replace(/[^\d]/g, "");
  const hSpacedDigits = h.replace(/[^\d]+/g, " ").trim();
  return (needles || []).some((n) => {
    const s = String(n).toLowerCase();
    if (!s) return false;
    if (h.includes(s)) return true;
    // Currency-normalized: "USD 750" / "$750" / "750" / "R750" / "18 060" / "1,980"
    const d = s.replace(/[^\d]/g, "");
    if (d.length >= 2) {
      if (h.includes(d) || hCompactDigits.includes(d)) return true;
      // spaced groups: "18 060" vs needle "18060"
      if (hSpacedDigits.replace(/\s+/g, "").includes(d)) return true;
    }
    // Loose token overlap for short phrases
    const tokens = s.split(/\s+/).filter((t) => t.length > 3);
    if (tokens.length >= 2 && tokens.filter((t) => h.includes(t)).length >= Math.ceil(tokens.length * 0.6))
      return true;
    return false;
  });
}

function includesNone(hay, needles) {
  const h = hay.toLowerCase();
  return (needles || []).every((n) => !h.includes(String(n).toLowerCase()));
}

function knowledgeHasAny(knowledge, needles) {
  const k = knowledge.toLowerCase();
  return (needles || []).filter((n) => k.includes(String(n).toLowerCase()));
}

function familyId(agentId) {
  return agentId.replace(/^(us|eu|africa|asia)-/, "");
}

async function listAgentIds() {
  const files = (await fs.readdir(catalogDir)).filter((f) => f.endsWith(".agent.json"));
  let ids = files.map((f) => f.replace(/\.agent\.json$/, ""));
  if (agentsFilter.length) ids = ids.filter((id) => agentsFilter.includes(id));
  if (marketFilter) {
    const m = marketFilter.toLowerCase();
    ids = ids.filter((id) => {
      if (m === "africa") return id.startsWith("africa-") || !/^(us|eu|asia)-/.test(id);
      return id.startsWith(`${m}-`);
    });
  }
  return ids.sort();
}

function staticCheck(pkg) {
  const issues = [];
  const tools = new Set((pkg.tools || []).map((t) => t.name));
  tools.add("handoff_to_human");
  const preset = getPreset(pkg.manifest.id);
  const bound = new Set((preset?.bindings || []).map((b) => b.tool));
  const knowledge = pkg.knowledge || "";
  const evals = Array.isArray(pkg.evals) ? pkg.evals : [];

  if (!preset) issues.push({ severity: "high", kind: "no_preset", detail: "missing preset bindings" });
  if ((pkg.system_prompt || "").length < 800)
    issues.push({ severity: "medium", kind: "thin_prompt", detail: `prompt ${pkg.system_prompt?.length || 0} chars` });
  if (knowledge.length < 400)
    issues.push({ severity: "high", kind: "thin_knowledge", detail: `knowledge ${knowledge.length} chars` });
  if (evals.length < 8)
    issues.push({ severity: "medium", kind: "few_evals", detail: `${evals.length} evals` });

  let drift = 0;
  let toolMissing = 0;
  for (const ev of evals) {
    const expect = ev.expect || {};
    if (expect.tool && !tools.has(expect.tool)) {
      toolMissing++;
      issues.push({
        severity: "high",
        kind: "eval_tool_missing",
        detail: `${ev.id}: expects tool ${expect.tool}`,
      });
    }
    if (expect.tool && preset && !bound.has(expect.tool) && expect.tool !== "handoff_to_human") {
      // handoff often added implicitly
      if (!bound.has(expect.tool)) {
        issues.push({
          severity: "medium",
          kind: "eval_tool_unbound",
          detail: `${ev.id}: ${expect.tool} not in preset`,
        });
      }
    }
    if (Array.isArray(expect.says_any) && expect.says_any.length) {
      const corpus = `${knowledge}\n${pkg.guardrails || ""}\n${pkg.system_prompt || ""}`;
      const hits = knowledgeHasAny(corpus, expect.says_any);
      // Soft phrases often come from runtime refusals, not KB — don't count as drift
      const soft = expect.says_any.every((s) =>
        /can't|cannot|confidential|secure|never share|stop|emergency|911|112|indicative|hiring team/i.test(
          String(s),
        ),
      );
      if (hits.length === 0 && !soft) {
        drift++;
        issues.push({
          severity: "high",
          kind: "knowledge_eval_drift",
          detail: `${ev.id}: none of says_any found in knowledge (${expect.says_any.slice(0, 3).join(" | ")})`,
        });
      }
    }
  }

  return { issues, drift, toolMissing, evalCount: evals.length };
}

async function runEvalCase(pkg, ev) {
  const expect = ev.expect || {};
  const wallet = new MockWalletAdapter(500_000);
  const model = new MockModelAdapter();
  let messages = [];
  const turns = [stripEvalNoise(ev.input), ...(ev.followups || []).map(stripEvalNoise)];
  let last = null;
  const toolsUsed = [];

  for (const userMessage of turns) {
    if (!userMessage) continue;
    last = await runTurn(
      {
        workspaceId: "eval-suite",
        agentId: pkg.manifest.id,
        pkg,
        messages,
        userMessage,
        model: pkg.manifest.model?.primary || "claude-sonnet",
        mode: "sandbox",
        state: "rented",
        knowledgeOverride: pkg.knowledge,
      },
      { wallet, model },
    );
    messages = last.messages;
    for (const t of last.toolCalls || []) toolsUsed.push(t.name);
  }

  const reply = last?.assistantMessage || "";
  const failures = [];

  if (expect.tool && !toolsUsed.includes(expect.tool)) {
    failures.push(`missing_tool:${expect.tool} (got ${toolsUsed.join(",") || "none"})`);
  }
  if (Array.isArray(expect.says_any) && expect.says_any.length && !includesAny(reply, expect.says_any)) {
    failures.push(`missing_says_any:${expect.says_any.slice(0, 3).join("|")}`);
  }
  if (Array.isArray(expect.says_none) && expect.says_none.length && !includesNone(reply, expect.says_none)) {
    failures.push(`violated_says_none`);
  }
  if (!reply || reply.length < 8) failures.push("empty_reply");

  return {
    id: ev.id,
    ok: failures.length === 0,
    failures,
    tools: toolsUsed,
    replyPreview: reply.slice(0, 180).replace(/\s+/g, " "),
  };
}

async function main() {
  const ids = await listAgentIds();
  console.log(
    `Eval suite (zero-token mock)${staticOnly ? " [static-only]" : ""} — ${ids.length} agents` +
      (marketFilter ? ` market=${marketFilter}` : ""),
  );

  const agentResults = [];
  let totalEvals = 0;
  let runtimeFail = 0;
  let runtimePass = 0;
  let staticHigh = 0;

  for (const id of ids) {
    const raw = JSON.parse(
      await fs.readFile(path.join(catalogDir, `${id}.agent.json`), "utf8"),
    );
    const pkg = loadAgentPackage(raw);
    const staticRes = staticCheck(pkg);
    staticHigh += staticRes.issues.filter((i) => i.severity === "high").length;

    const runtimeCases = [];
    if (!staticOnly) {
      const evals = (Array.isArray(pkg.evals) ? pkg.evals : []).slice(0, maxEvals);
      for (const ev of evals) {
        totalEvals++;
        try {
          const r = await runEvalCase(pkg, ev);
          runtimeCases.push(r);
          if (r.ok) runtimePass++;
          else runtimeFail++;
        } catch (e) {
          runtimeFail++;
          runtimeCases.push({
            id: ev.id,
            ok: false,
            failures: [`exception:${e instanceof Error ? e.message : String(e)}`],
            tools: [],
            replyPreview: "",
          });
        }
      }
    }

    const failedCases = runtimeCases.filter((c) => !c.ok);
    agentResults.push({
      id,
      family: familyId(id),
      market: pkg.manifest.market || "?",
      category: pkg.manifest.category,
      evalCount: staticRes.evalCount,
      staticIssues: staticRes.issues,
      driftCount: staticRes.drift,
      runtimeFailed: failedCases.length,
      runtimeTotal: runtimeCases.length,
      failedCaseIds: failedCases.map((c) => c.id),
      sampleFailures: failedCases.slice(0, 3),
    });

    const mark =
      staticRes.drift > 2 || failedCases.length > Math.ceil(runtimeCases.length * 0.4)
        ? "WARN"
        : "OK";
    process.stdout.write(
      `${mark} ${id} drift=${staticRes.drift} runtime_fail=${failedCases.length}/${runtimeCases.length}\n`,
    );
  }

  // Aggregate by family
  const byFamily = new Map();
  for (const a of agentResults) {
    const f = byFamily.get(a.family) || {
      family: a.family,
      agents: 0,
      drift: 0,
      runtimeFail: 0,
      runtimeTotal: 0,
      staticHigh: 0,
    };
    f.agents++;
    f.drift += a.driftCount;
    f.runtimeFail += a.runtimeFailed;
    f.runtimeTotal += a.runtimeTotal;
    f.staticHigh += a.staticIssues.filter((i) => i.severity === "high").length;
    byFamily.set(a.family, f);
  }
  const familyRanked = [...byFamily.values()].sort(
    (a, b) => b.drift + b.runtimeFail - (a.drift + a.runtimeFail),
  );

  const day = new Date().toISOString().slice(0, 10);
  const reportDir = path.join(root, "docs/reports");
  const dataDir = path.join(root, "data/reports");
  await fs.mkdir(reportDir, { recursive: true });
  await fs.mkdir(dataDir, { recursive: true });

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: staticOnly ? "static-only" : "static+mock-runtime",
    tokenCost: 0,
    agents: ids.length,
    totalEvalsRun: totalEvals,
    runtimePass,
    runtimeFail,
    staticHighIssues: staticHigh,
    passRate:
      totalEvals > 0 ? Number(((runtimePass / totalEvals) * 100).toFixed(1)) : null,
    topFamilies: familyRanked.slice(0, 15),
    agents: agentResults,
  };

  const jsonPath = path.join(dataDir, "eval-results.json");
  await fs.writeFile(jsonPath, JSON.stringify(summary, null, 2), "utf8");

  const md = [];
  md.push(`# Eval gap report — ${day}`);
  md.push("");
  md.push(`Zero-token suite (MockModelAdapter + static checks). **No OpenAI spend.**`);
  md.push("");
  md.push(`| Metric | Value |`);
  md.push(`|--------|-------|`);
  md.push(`| Agents | ${ids.length} |`);
  md.push(`| Runtime evals run | ${totalEvals} |`);
  md.push(`| Runtime pass | ${runtimePass} |`);
  md.push(`| Runtime fail | ${runtimeFail} |`);
  md.push(`| Pass rate | ${summary.passRate ?? "n/a"}% |`);
  md.push(`| Static high-severity issues | ${staticHigh} |`);
  md.push("");
  md.push(`## Top families to fix first`);
  md.push("");
  md.push(`| Family | Agents | Knowledge↔eval drift | Runtime fails |`);
  md.push(`|--------|--------|----------------------|---------------|`);
  for (const f of familyRanked.slice(0, 20)) {
    md.push(
      `| ${f.family} | ${f.agents} | ${f.drift} | ${f.runtimeFail}/${f.runtimeTotal} |`,
    );
  }
  md.push("");
  md.push(`## Highest-drift agents`);
  md.push("");
  const worst = [...agentResults]
    .sort((a, b) => b.driftCount + b.runtimeFailed - (a.driftCount + a.runtimeFailed))
    .slice(0, 25);
  for (const a of worst) {
    md.push(`### ${a.id}`);
    md.push(`- Drift cases: ${a.driftCount}`);
    md.push(`- Runtime fails: ${a.runtimeFailed}/${a.runtimeTotal}`);
    if (a.failedCaseIds.length)
      md.push(`- Failed evals: ${a.failedCaseIds.slice(0, 8).join(", ")}`);
    const drifts = a.staticIssues.filter((i) => i.kind === "knowledge_eval_drift").slice(0, 4);
    for (const d of drifts) md.push(`- ${d.detail}`);
    md.push("");
  }
  md.push(`## How to read this`);
  md.push("");
  md.push(`- **Knowledge↔eval drift**: packaged eval expects phrases not in that agent's knowledge (common after market localization). Fix knowledge or update evals.`);
  md.push(`- **Runtime fail**: mock sandbox reply/tool path didn't meet expects. May need mock grounding, stubs, or eval follow-ups.`);
  md.push(`- **Guardrail cases** (injection / hiring decision / handoff): treat fails as high priority.`);
  md.push("");
  md.push(`Full JSON: \`data/reports/eval-results.json\``);

  const mdPath = path.join(reportDir, `eval-gap-${day}.md`);
  await fs.writeFile(mdPath, md.join("\n"), "utf8");

  console.log(`\nPass rate: ${summary.passRate ?? "n/a"}% (${runtimePass}/${totalEvals})`);
  console.log(`Static high issues: ${staticHigh}`);
  console.log(`Report: ${mdPath}`);
  console.log(`JSON:   ${jsonPath}`);
  console.log(`\nTop families:`);
  for (const f of familyRanked.slice(0, 10)) {
    console.log(`  ${f.family}: drift=${f.drift} runtime_fail=${f.runtimeFail}/${f.runtimeTotal}`);
  }

  // Exit non-zero if critical: many high static issues or pass rate < 40% when runtime ran
  const critical =
    staticHigh > ids.length * 3 ||
    (totalEvals > 0 && runtimePass / totalEvals < 0.35);
  if (critical) {
    console.error("\nSuite finished with critical gap threshold exceeded.");
    process.exit(1);
  }
  console.log("\nEval suite complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
