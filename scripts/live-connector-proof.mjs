#!/usr/bin/env node
/**
 * Wave 4 — live connector proof harness.
 *
 * Does NOT treat demo/sandbox tokens as live. Asserts tool results are real:
 *   live === true / no sandbox_stub / no "_note: not OAuth-connected"
 *
 * Modes:
 *   1) Env readiness (default): check OAuth client env + print staging checklist
 *   2) Against a running app: DEMO_BASE=… pnpm proof:live [--chat]
 *
 * Record a passed proof:
 *   pnpm proof:live --record --agent=us-executive-assistant --connector=slack --corr=corr_…
 *
 * Never pass access_token: "demo" — that forces stub fallback.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const proofsPath = path.join(root, "data/wave4-live-proofs.json");
const require = createRequire(import.meta.url);

const BASE = process.env.DEMO_BASE ?? process.env.PROOF_BASE ?? "";
const doChat = process.argv.includes("--chat");
const doRecord = process.argv.includes("--record");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** First-slice Wave 4 agents (Go-live Cluster A). */
export const WAVE4_SLICE = [
  {
    agentId: "us-executive-assistant",
    family: "executive-assistant",
    connectors: ["google_calendar", "slack"],
    prompts: [
      "What's on my calendar tomorrow morning?",
      "Please connect me to a human on the ops team — summarize that I asked about tomorrow's calendar.",
    ],
  },
  {
    agentId: "us-dental-front-desk",
    family: "dental-front-desk",
    connectors: ["google_calendar", "slack"],
    prompts: [
      "I'd like to book a cleaning next Tuesday morning if you have availability.",
      "Yes, go ahead and book it.",
    ],
  },
  {
    agentId: "us-sales-qualifier",
    family: "sales-qualifier",
    connectors: ["hubspot", "google_calendar", "slack"],
    prompts: [
      "We're a 40-person clinic looking at inbound WhatsApp lead capture — capture my interest as Jordan Hale, 512-555-0199.",
      "Yes, go ahead and capture that.",
    ],
  },
  {
    agentId: "us-it-helpdesk",
    family: "it-helpdesk",
    connectors: ["hubspot", "slack"],
    prompts: [
      "I can't connect to VPN from home — open a ticket for me as Jordan Hale.",
      "Yes, create the ticket.",
    ],
  },
];

const ENV_MATRIX = [
  { id: "slack", vars: ["SLACK_OAUTH_CLIENT_ID", "SLACK_OAUTH_CLIENT_SECRET"], priority: 1 },
  { id: "google_calendar", vars: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"], priority: 1 },
  { id: "hubspot", vars: ["HUBSPOT_OAUTH_CLIENT_ID", "HUBSPOT_OAUTH_CLIENT_SECRET"], priority: 1 },
  { id: "m365_calendar", vars: ["MICROSOFT_OAUTH_CLIENT_ID", "MICROSOFT_OAUTH_CLIENT_SECRET"], priority: 2 },
  { id: "zendesk", vars: ["ZENDESK_OAUTH_CLIENT_ID", "ZENDESK_OAUTH_CLIENT_SECRET"], priority: 2 },
];

function loadProofs() {
  if (!fs.existsSync(proofsPath)) {
    return { version: 1, updatedAt: null, proofs: [] };
  }
  return JSON.parse(fs.readFileSync(proofsPath, "utf8"));
}

function saveProofs(doc) {
  doc.updatedAt = new Date().toISOString();
  fs.writeFileSync(proofsPath, JSON.stringify(doc, null, 2) + "\n");
}

function envReady(vars) {
  const missing = vars.filter((v) => !process.env[v]?.trim());
  return { configured: missing.length === 0, missing };
}

function isLiveToolResult(toolCall) {
  if (!toolCall) return false;
  if (toolCall.live === true && toolCall.stubbed !== true) return true;
  const r = toolCall.result;
  if (!r || typeof r !== "object") return false;
  if (r.live === true && r.source !== "sandbox_stub" && !r._note) return true;
  if (r.source === "sandbox_stub") return false;
  if (typeof r._note === "string" && /not OAuth-connected/i.test(r._note)) return false;
  if (toolCall.stubbed === true) return false;
  return false;
}

async function j(pathname, init) {
  const res = await fetch(`${BASE}${pathname}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${pathname} ${res.status} ${JSON.stringify(body)}`);
  return body;
}

function printReadiness() {
  console.log("Wave 4 — connector env readiness\n");
  for (const row of ENV_MATRIX) {
    const { configured, missing } = envReady(row.vars);
    const mark = configured ? "READY" : "MISSING";
    console.log(`  [${mark}] ${row.id} (P${row.priority})${missing.length ? " — " + missing.join(", ") : ""}`);
  }
  console.log(`
First-slice agents (prove these next):
${WAVE4_SLICE.map((s) => `  - ${s.agentId} → ${s.connectors.join(", ")}`).join("\n")}

Staging steps (see docs/WAVE4_LIVE_CONNECTORS.md):
  1. Set OAuth client id/secret on Railway for Slack, Google, HubSpot
  2. Register redirect: {APP_BASE_URL}/api/oauth/callback
  3. Actions → Connect → pick Slack channel
  4. Studio chat mode = live (never demo token)
  5. Run: DEMO_BASE=https://… pnpm proof:live --chat
  6. Record: pnpm proof:live --record --agent=us-executive-assistant --connector=slack --corr=corr_…
`);
}

async function runChatProofs() {
  if (!BASE) {
    console.error("Set DEMO_BASE (or PROOF_BASE) to the web app origin for --chat");
    process.exit(1);
  }
  console.log(`Wave 4 live chat proofs against ${BASE}\n`);

  let status;
  try {
    status = await j("/api/oauth/status");
  } catch (e) {
    console.error("oauth/status failed — is the app up and auth open for demo?", e.message);
    process.exit(1);
  }

  const oauth = Object.fromEntries((status.oauth || []).map((o) => [o.id, o]));
  console.log("OAuth status:");
  for (const id of ["slack", "google_calendar", "hubspot"]) {
    const o = oauth[id] || {};
    console.log(
      `  ${id}: configured=${Boolean(o.configured)} connected=${Boolean(o.connected)}${o.missingEnv?.length ? " missing=" + o.missingEnv.join(",") : ""}`,
    );
  }
  console.log("");

  const results = [];
  for (const slice of WAVE4_SLICE) {
    const needed = slice.connectors;
    const ready = needed.every((c) => oauth[c]?.configured && oauth[c]?.connected);
    if (!ready) {
      console.log(`SKIP ${slice.agentId} — connect ${needed.join(", ")} in Actions first`);
      results.push({ agentId: slice.agentId, status: "skipped_not_connected" });
      continue;
    }

    try {
      await j("/api/rent", {
        method: "POST",
        body: JSON.stringify({ agentId: slice.agentId, tier: "standard" }),
      });
    } catch {
      /* may already be rented */
    }

    const corr = `corr_wave4_${Date.now().toString(36)}`;
    let liveHits = 0;
    let stubHits = 0;
    const toolNames = [];

    for (const message of slice.prompts) {
      const chat = await j("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          agentId: slice.agentId,
          message,
          mode: "live",
          correlationId: corr,
        }),
        headers: { "x-correlation-id": corr },
      });
      const tools = chat.toolCalls || [];
      for (const t of tools) {
        toolNames.push(t.name);
        if (isLiveToolResult(t)) liveHits++;
        else if (t.stubbed || (t.result && t.result.source === "sandbox_stub") || t.result?._note) stubHits++;
      }
      console.log(
        `  ${slice.agentId} ← ${message.slice(0, 60)}… tools=${tools.length} live=${liveHits} stub=${stubHits}`,
      );
    }

    const statusOut =
      liveHits > 0 && stubHits === 0
        ? "LIVE_PASS"
        : liveHits > 0
          ? "MIXED"
          : stubHits > 0
            ? "STUB_FALLBACK"
            : "NO_TOOLS";
    console.log(`→ ${slice.agentId} ${statusOut} correlationId=${corr}\n`);
    results.push({
      agentId: slice.agentId,
      status: statusOut,
      correlationId: corr,
      liveHits,
      stubHits,
      tools: toolNames,
    });
  }

  console.log(JSON.stringify({ base: BASE, results }, null, 2));
  const failed = results.filter((r) => r.status === "STUB_FALLBACK" || r.status === "MIXED");
  if (failed.length) process.exitCode = 2;
}

function recordProof() {
  const agentId = argValue("--agent");
  const connector = argValue("--connector");
  const corr = argValue("--corr") || argValue("--correlation");
  const family = agentId?.replace(/^(us|eu|africa|asia)-/, "");
  if (!agentId || !connector || !corr) {
    console.error("Usage: pnpm proof:live --record --agent=us-executive-assistant --connector=slack --corr=corr_…");
    process.exit(1);
  }
  const doc = loadProofs();
  const entry = {
    agentId,
    family,
    connector,
    correlationId: corr,
    at: new Date().toISOString(),
    environment: BASE || process.env.APP_BASE_URL || "unspecified",
    notes: argValue("--notes") || "manual Wave 4 proof",
  };
  doc.proofs = (doc.proofs || []).filter(
    (p) => !(p.agentId === agentId && p.connector === connector),
  );
  doc.proofs.push(entry);
  saveProofs(doc);

  // Stamp pilot doc Evidence line when present
  const pilotPath = path.join(root, "docs/pilots", `${family}.md`);
  if (fs.existsSync(pilotPath)) {
    let md = fs.readFileSync(pilotPath, "utf8");
    const line = `- Evidence: \`${corr}\` — live \`${connector}\` on ${entry.environment} (${entry.at.slice(0, 10)})`;
    if (/^- Evidence:/m.test(md)) {
      md = md.replace(/^- Evidence:.*$/m, line);
    } else {
      md = md.replace(/^- Depth:.*$/m, (m) => `${m}\n${line}`);
    }
    if (!/^- Depth: live/m.test(md) && /^- Depth: strong/m.test(md)) {
      md = md.replace(/^- Depth: strong$/m, "- Depth: live");
    }
    fs.writeFileSync(pilotPath, md.endsWith("\n") ? md : md + "\n");
    console.log("Updated", pilotPath);
  }

  console.log("Recorded proof →", proofsPath);
  console.log(entry);
}

async function main() {
  if (doRecord) {
    recordProof();
    return;
  }
  printReadiness();
  // Prefer package env matrix via connectors if built
  try {
    const { listOAuthProviders, connectorOAuthConfigured } = require(
      path.join(root, "packages/connectors/dist/index.js"),
    );
    console.log("Connector package OAuth matrix:");
    for (const p of listOAuthProviders()) {
      const cfg = connectorOAuthConfigured(p.id);
      console.log(`  ${p.id}: configured=${cfg.configured}${cfg.missingEnv?.length ? " missing=" + cfg.missingEnv.join(",") : ""}`);
    }
    console.log("");
  } catch {
    console.log("(Build packages to see connectorOAuthConfigured matrix: pnpm build:packages)\n");
  }

  if (doChat) await runChatProofs();
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
