#!/usr/bin/env node
/**
 * Wave 4 — configure + prove the MCP connector (HTTP tools/call bridge).
 *
 * Default sink: {DEMO_BASE}/api/mcp  → POST …/tools/call
 *
 * Usage:
 *   DEMO_BASE=https://miaiweb-production.up.railway.app pnpm proof:mcp
 *   DEMO_BASE=… pnpm proof:mcp --endpoint=https://mcp.example.com
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const BASE = process.env.DEMO_BASE ?? process.env.PROOF_BASE ?? "";
const AGENT = process.env.PROOF_AGENT ?? "us-hotel-guest";
const TOOL = process.env.PROOF_TOOL ?? "make_guest_request";
const TOKEN = process.env.MCP_PROOF_TOKEN ?? "miai-wave4-mcp";

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
  if (r.live === true || r.provider === "mcp" || r.provider === "mcp_sink") return true;
  if (r.callId || r.result?.accepted === true) return true;
  if (toolCall.stubbed === false && toolCall.connector === "mcp") return true;
  return false;
}

async function waitForSink(timeoutMs = 180_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/mcp`);
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

  let endpoint = argValue("--endpoint");
  if (!endpoint) {
    console.log("Waiting for MCP sink on", `${BASE}/api/mcp`);
    const ready = await waitForSink();
    if (!ready) {
      console.error("MCP sink not deployed yet — push + wait for Railway, then retry");
      process.exit(1);
    }
    endpoint = `${BASE}/api/mcp`;
    console.log("Sink ready");
  }
  endpoint = endpoint.replace(/\/$/, "");

  console.log(`\nConfiguring MCP for ${AGENT}`);
  console.log(`  endpoint=${endpoint}`);
  console.log(`  remap tool=${TOOL}`);

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
      connectorId: "mcp",
      config: { endpoint, token: TOKEN },
      remapTools: [TOOL],
    }),
  });
  console.log("Credentials saved + tool remapped to mcp");

  const status = await j("/api/oauth/status");
  const mcp = (status.other || []).find((c) => c.id === "mcp");
  console.log("MCP connected=", Boolean(mcp?.connected));

  const corr = `corr_wave4_mcp_${Date.now().toString(36)}`;
  const session = `sess_mcp_${Date.now().toString(36)}`;
  const prompts = [
    "I need extra towels in room 412 please.",
    "Yes, please log the guest request for extra towels in room 412 — go ahead now.",
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
        sessionId: session,
      }),
    });
    for (const t of chat.toolCalls || []) {
      tools.push(t.name);
      if (isLive(t)) liveHits++;
      else if (t.stubbed || t.result?.source === "sandbox_stub" || t.result?._note) stubHits++;
      console.log(
        `  tool ${t.name} live=${t.live} stubbed=${t.stubbed} connector=${t.connector}`,
        t.result && typeof t.result === "object"
          ? `provider=${t.result.provider || ""} callId=${t.result.callId || ""}`
          : "",
      );
      if (t.result) console.log("  result keys:", Object.keys(t.result).join(","));
    }
  }

  const pass = liveHits > 0 && stubHits === 0 && tools.includes(TOOL);
  console.log(`\n${pass ? "LIVE_PASS" : "FAIL"} correlationId=${corr} live=${liveHits} stub=${stubHits}`);
  console.log("tools:", tools.join(", ") || "(none)");

  try {
    const sink = await j("/api/mcp?limit=3");
    console.log("MCP sink calls:", sink.count);
    console.log(JSON.stringify(sink.calls?.[0] ?? null, null, 2));
  } catch (e) {
    console.log("Could not read MCP sink:", e.message);
  }

  // Restore hotel guest write tool to webhook so prior Wave 4 path stays intact
  if (AGENT === "us-hotel-guest" && TOOL === "make_guest_request") {
    try {
      await j("/api/connectors/credentials", {
        method: "POST",
        body: JSON.stringify({
          agentId: AGENT,
          connectorId: "webhook",
          config: {
            url: `${BASE}/api/webhook/sink`,
            secret: process.env.WEBHOOK_PROOF_SECRET ?? "miai-wave4-webhook",
          },
          remapTools: [TOOL],
        }),
      });
      console.log("Restored make_guest_request → webhook");
    } catch (e) {
      console.log("Could not restore webhook binding:", e.message);
    }
  }

  if (pass) {
    spawnSync(
      process.execPath,
      [
        path.join(root, "scripts/live-connector-proof.mjs"),
        "--record",
        `--agent=${AGENT}`,
        "--connector=mcp",
        `--corr=${corr}`,
        `--notes=Wave 4 live MCP tools/call → ${endpoint}`,
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
