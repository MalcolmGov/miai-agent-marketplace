#!/usr/bin/env node
/**
 * Wave 4 — configure + prove the webhook connector.
 *
 * Default sink: {DEMO_BASE}/api/webhook/sink (self-hosted after deploy)
 * Fallback: https://httpbin.org/post
 *
 * Usage:
 *   DEMO_BASE=https://miaiweb-production.up.railway.app node scripts/proof-webhook.mjs
 *   DEMO_BASE=… node scripts/proof-webhook.mjs --url=https://httpbin.org/post
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const BASE = process.env.DEMO_BASE ?? process.env.PROOF_BASE ?? "";
const AGENT = process.env.PROOF_AGENT ?? "us-hotel-guest";
const SECRET = process.env.WEBHOOK_PROOF_SECRET ?? "miai-wave4-webhook";

function argValue(flag) {
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function j(pathname, init = {}) {
  const res = await fetch(`${BASE}${pathname}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-roles": "owner,admin,operator",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${pathname} ${res.status} ${JSON.stringify(body)}`);
  return body;
}

function isLive(toolCall) {
  if (!toolCall) return false;
  if (toolCall.live === true && toolCall.stubbed !== true) return true;
  const r = toolCall.result;
  if (!r || typeof r !== "object") return false;
  if (r.source === "sandbox_stub" || r._note) return false;
  return r.live === true || toolCall.stubbed === false;
}

async function waitForSink(timeoutMs = 180_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/webhook/sink`);
      if (res.ok) return true;
    } catch {
      /* deploying */
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  return false;
}

async function main() {
  if (!BASE) {
    console.error("Set DEMO_BASE to the web app origin");
    process.exit(1);
  }

  let url = argValue("--url");
  const preferHttpbin = process.argv.includes("--httpbin");
  if (!url) {
    if (preferHttpbin) {
      url = "https://httpbin.org/post";
    } else {
      console.log("Waiting for webhook sink on", `${BASE}/api/webhook/sink`);
      const ready = await waitForSink();
      if (ready) {
        url = `${BASE}/api/webhook/sink`;
        console.log("Sink ready");
      } else {
        console.log("Sink not deployed yet — falling back to httpbin.org/post");
        url = "https://httpbin.org/post";
      }
    }
  }

  console.log(`\nConfiguring webhook for ${AGENT}`);
  console.log(`  url=${url}`);
  console.log(`  secret=${SECRET}`);

  try {
    await j("/api/rent", {
      method: "POST",
      body: JSON.stringify({ agentId: AGENT, tier: "standard" }),
    });
  } catch {
    /* already rented */
  }

  await j("/api/connectors/credentials", {
    method: "POST",
    body: JSON.stringify({
      agentId: AGENT,
      connectorId: "webhook",
      config: { url, secret: SECRET },
    }),
  });
  console.log("Credentials saved");

  const status = await j("/api/oauth/status");
  const wh = (status.other || []).find((c) => c.id === "webhook");
  console.log("Webhook connected=", Boolean(wh?.connected));

  const corr = `corr_wave4_wh_${Date.now().toString(36)}`;
  const prompts = [
    "Please log a guest request for extra towels in room 412 for Jordan Hale.",
    "Yes, go ahead and log that guest request now.",
  ];

  let liveHits = 0;
  let stubHits = 0;
  const tools = [];

  for (const message of prompts) {
    const chat = await j("/api/chat", {
      method: "POST",
      headers: { "x-correlation-id": corr },
      body: JSON.stringify({
        agentId: AGENT,
        message,
        mode: "live",
        correlationId: corr,
      }),
    });
    for (const t of chat.toolCalls || []) {
      tools.push(t.name);
      if (isLive(t)) liveHits++;
      else if (t.stubbed || t.result?.source === "sandbox_stub" || t.result?._note) stubHits++;
      console.log(
        `  tool ${t.name} live=${t.live} stubbed=${t.stubbed} connector=${t.connector}`,
        t.result && typeof t.result === "object"
          ? `note=${t.result._note || t.result.source || t.result.provider || ""}`
          : "",
      );
    }
  }

  const pass = liveHits > 0 && stubHits === 0 && tools.includes("make_guest_request");
  console.log(`\n${pass ? "LIVE_PASS" : "FAIL"} correlationId=${corr} live=${liveHits} stub=${stubHits}`);
  console.log("tools:", tools.join(", ") || "(none)");

  if (url.includes("/api/webhook/sink")) {
    try {
      const sink = await j("/api/webhook/sink?limit=3");
      console.log("Sink recent events:", sink.count);
      console.log(JSON.stringify(sink.events?.[0] ?? null, null, 2));
    } catch (e) {
      console.log("Could not read sink:", e.message);
    }
  }

  if (pass) {
    spawnSync(
      process.execPath,
      [
        path.join(root, "scripts/live-connector-proof.mjs"),
        "--record",
        `--agent=${AGENT}`,
        "--connector=webhook",
        `--corr=${corr}`,
        `--notes=Wave 4 live webhook → ${url}`,
      ],
      {
        cwd: root,
        env: { ...process.env, DEMO_BASE: BASE, PROOF_BASE: BASE },
        stdio: "inherit",
      },
    );
  } else {
    process.exitCode = 2;
  }
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
