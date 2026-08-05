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
const doExpand = process.argv.includes("--expand");
/** Full featured Go-live 18: first slice + expand + remaining Cluster B/C gaps. */
const doGolive18 = process.argv.includes("--golive18");
const doAutoRecord = process.argv.includes("--auto-record");

function argValue(flag) {
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Comma-separated agent ids to limit a chat run, e.g. --only=us-hotel-guest,us-pharmacy */
function onlyFilter() {
  const raw = argValue("--only");
  if (!raw) return null;
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
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
      "Please also handoff_to_human / notify the front desk on Slack that I booked a cleaning.",
    ],
  },
  {
    agentId: "us-sales-qualifier",
    family: "sales-qualifier",
    connectors: ["hubspot", "google_calendar", "slack"],
    prompts: [
      `We're a 40-person clinic looking at inbound WhatsApp lead capture — capture my interest as Jordan Hale, jordan.hale+wave4${Date.now()}@example.com, 512-555-0199.`,
      "Yes, go ahead and capture that lead now.",
      "Please also hand me to the sales team on Slack with a short summary.",
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

/** Extra Calendar + Slack proofs while HubSpot OAuth is in progress. */
export const WAVE4_EXPAND = [
  {
    agentId: "us-hotel-guest",
    family: "hotel-guest",
    connectors: ["slack"],
    prompts: [
      "This is urgent — please handoff_to_human / connect me to the front desk team now about a late check-out tomorrow. Do not answer from knowledge; escalate.",
    ],
  },
  {
    agentId: "us-home-services",
    family: "home-services",
    connectors: ["google_calendar", "slack"],
    prompts: [
      "I need a plumber for a leaking geyser tomorrow afternoon — check availability.",
      "Please hand this to dispatch — leaking geyser, tomorrow afternoon.",
    ],
  },
  {
    agentId: "us-clinic-front-desk",
    family: "clinic-front-desk",
    connectors: ["google_calendar", "slack"],
    prompts: [
      "I need a same-week GP appointment for a persistent cough — what times are free?",
      "Please connect me to the clinic team about this cough.",
    ],
  },
  {
    agentId: "us-salon-booking",
    family: "salon-booking",
    connectors: ["google_calendar", "slack"],
    prompts: [
      "Book a women's haircut Saturday morning if possible — check availability first.",
      "Please hand off to reception for Saturday haircut booking.",
    ],
  },
  /** Flagship depth heroes — prove after Actions → Connect (Calendar / Slack). */
  {
    agentId: "us-events-venue",
    family: "events-venue",
    connectors: ["google_calendar", "slack"],
    prompts: [
      "Check calendar availability for a Saturday wedding in three weeks for the Intimate package.",
      "Please handoff_to_human / connect me to the events team now to finalize the hold.",
    ],
  },
  {
    agentId: "us-gym-membership",
    family: "gym-membership",
    connectors: ["google_calendar", "slack"],
    prompts: [
      "Can I book a gym tour Saturday morning?",
      "Please connect me to the membership desk about the tour.",
    ],
  },
  {
    agentId: "us-pharmacy",
    family: "pharmacy",
    connectors: ["slack"],
    prompts: [
      "Clinical question about dosage — please handoff_to_human / connect me to the pharmacist now. Do not advise dosage yourself.",
    ],
  },
  {
    agentId: "us-accounting-practice",
    family: "accounting-practice",
    connectors: ["google_calendar", "slack"],
    prompts: [
      "I'd like to book a tax planning consult next week — what's free?",
      "Please hand this to the practice team for a consult booking.",
    ],
  },
];

/**
 * Remaining Go-live 18 families not already in WAVE4_SLICE / WAVE4_EXPAND.
 * Prove with Phase-1 OAuth already on Railway (Slack / Calendar / HubSpot).
 * Shopify/TMS stay deferred until those OAuth apps are wired.
 */
export const WAVE4_GOLIVE18_GAPS = [
  {
    agentId: "us-restaurant-takeaway",
    family: "restaurant-takeaway",
    connectors: ["slack"],
    prompts: [
      "Party of 22 for Saturday night — please connect me to the restaurant team.",
    ],
  },
  {
    agentId: "us-customer-support",
    family: "customer-support",
    connectors: ["hubspot", "slack"],
    prompts: [
      "Blender arrived broken on order 4821 — please log a ticket for Jordan Hale, jordan.hale@example.com.",
      "Yes, go ahead and log that ticket.",
    ],
  },
  {
    agentId: "us-delivery-tracking",
    family: "delivery-tracking",
    connectors: ["slack"],
    prompts: [
      "Waybill SLC-4821 shows delivered but I never got it — please connect me to the courier desk.",
    ],
  },
  {
    agentId: "us-trades-receptionist",
    family: "trades-receptionist",
    connectors: ["google_calendar", "slack"],
    prompts: [
      "I need drain clearing Thursday morning in Denver — check availability.",
      "Please hand this to dispatch for drain clearing Thursday.",
    ],
  },
  {
    agentId: "us-onboarding-buddy",
    family: "onboarding-buddy",
    connectors: ["slack"],
    prompts: [
      "My laptop won't boot on day one. Name Aisha Khan. Phone 512-555-0144. Email aisha.khan@example.com. Please handoff_to_human / escalate to People and IT on Slack now.",
    ],
  },
  {
    agentId: "us-building-management",
    family: "building-management",
    connectors: ["slack"],
    prompts: [
      "Burst pipe flooding my kitchen in unit 12 — please escalate to the managing agent now.",
    ],
  },
  {
    agentId: "us-pharmacy",
    family: "pharmacy",
    connectors: ["slack"],
    prompts: [
      "Clinical question about dosage — please handoff_to_human / connect me to the pharmacist now. Do not advise dosage yourself.",
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
  // Real vendor error (OAuth path reached) — e.g. HubSpot "Contact already exists".
  if (
    typeof r.error === "string" &&
    r.error.length > 0 &&
    !/not OAuth-connected|sandbox_stub|demo token/i.test(r.error)
  ) {
    return true;
  }
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

Expand set (Calendar/Slack while HubSpot pending):
${WAVE4_EXPAND.map((s) => `  - ${s.agentId} → ${s.connectors.join(", ")}`).join("\n")}

Go-live 18 gaps (remaining Cluster B/C):
${WAVE4_GOLIVE18_GAPS.map((s) => `  - ${s.agentId} → ${s.connectors.join(", ")}`).join("\n")}

Staging steps (see docs/WAVE4_LIVE_CONNECTORS.md):
  1. Set OAuth client id/secret on Railway for Slack, Google, HubSpot
  2. Register redirect: {APP_BASE_URL}/api/oauth/callback
  3. Actions → Connect → pick Slack channel
  4. Studio chat mode = live (never demo token)
  5. Run: DEMO_BASE=https://… pnpm proof:live --chat
  6. Expand: DEMO_BASE=https://… pnpm proof:live --chat --expand --auto-record
  7. Featured 18: DEMO_BASE=https://… pnpm proof:live --chat --golive18 --auto-record
  8. Record: pnpm proof:live --record --agent=us-executive-assistant --connector=slack --corr=corr_…
`);
}

function recordOne({ agentId, connector, corr, notes }) {
  const family = agentId?.replace(/^(us|eu|africa|asia|oceania)-/, "");
  const doc = loadProofs();
  const entry = {
    agentId,
    family,
    connector,
    correlationId: corr,
    at: new Date().toISOString(),
    environment: BASE || process.env.APP_BASE_URL || "unspecified",
    notes: notes || "Wave 4 proof",
  };
  doc.proofs = (doc.proofs || []).filter(
    (p) => !(p.agentId === agentId && p.connector === connector),
  );
  doc.proofs.push(entry);
  saveProofs(doc);

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
    if (!/## Wave 4 live proof/.test(md)) {
      md = md.trimEnd() + `\n\n## Wave 4 live proof\n- Target connectors: see \`docs/WAVE4_LIVE_CONNECTORS.md\`\n`;
    }
    fs.writeFileSync(pilotPath, md.endsWith("\n") ? md : md + "\n");
  }
  return entry;
}

async function runChatProofs() {
  if (!BASE) {
    console.error("Set DEMO_BASE (or PROOF_BASE) to the web app origin for --chat");
    process.exit(1);
  }
  const modeLabel = doGolive18 ? " [golive18]" : doExpand ? " [expand]" : " [slice]";
  console.log(`Wave 4 live chat proofs against ${BASE}${modeLabel}\n`);

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

  /** @type {typeof WAVE4_SLICE} */
  let agents;
  if (doGolive18) {
    const byId = new Map();
    for (const row of [...WAVE4_SLICE, ...WAVE4_EXPAND, ...WAVE4_GOLIVE18_GAPS]) {
      byId.set(row.agentId, row);
    }
    agents = [...byId.values()];
  } else if (doExpand) {
    agents = [...WAVE4_EXPAND, ...WAVE4_GOLIVE18_GAPS];
  } else {
    agents = WAVE4_SLICE;
  }
  const only = onlyFilter();
  if (only) {
    agents = agents.filter((a) => only.has(a.agentId));
    console.log(`Filtered --only → ${agents.map((a) => a.agentId).join(", ") || "(none)"}\n`);
  }
  const results = [];
  for (const slice of agents) {
    const needed = slice.connectors;
    const available = needed.filter((c) => oauth[c]?.configured && oauth[c]?.connected);
    const missing = needed.filter((c) => !available.includes(c));
    if (available.length === 0) {
      console.log(`SKIP ${slice.agentId} — none of ${needed.join(", ")} connected`);
      results.push({ agentId: slice.agentId, status: "skipped_not_connected", missing });
      continue;
    }
    if (missing.length) {
      console.log(`PARTIAL ${slice.agentId} — proving ${available.join(", ")}; still need ${missing.join(", ")}`);
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
    const liveConnectors = new Set();

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
        if (isLiveToolResult(t)) {
          liveHits++;
          const c = t.connector || t.result?.provider;
          if (c) liveConnectors.add(c);
        } else if (t.stubbed || (t.result && t.result.source === "sandbox_stub") || t.result?._note) {
          stubHits++;
        }
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

    if (doAutoRecord && liveHits > 0) {
      if (liveConnectors.size === 0) {
        console.log(
          `  skip auto-record — live tool hits but no connector id (refusing to guess ${available.join(", ")})`,
        );
      } else {
        for (const connector of liveConnectors) {
          recordOne({
            agentId: slice.agentId,
            connector,
            corr,
            notes: `${statusOut} auto-record from proof:live --chat`,
          });
          console.log(`  recorded ${slice.agentId} / ${connector}`);
        }
      }
    }

    results.push({
      agentId: slice.agentId,
      status: statusOut,
      correlationId: corr,
      liveHits,
      stubHits,
      tools: toolNames,
      liveConnectors: [...liveConnectors],
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
  if (!agentId || !connector || !corr) {
    console.error("Usage: pnpm proof:live --record --agent=us-executive-assistant --connector=slack --corr=corr_…");
    process.exit(1);
  }
  const entry = recordOne({
    agentId,
    connector,
    corr,
    notes: argValue("--notes") || "manual Wave 4 proof",
  });
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
