#!/usr/bin/env node
/**
 * Cutover smoke — run against Railway staging or Azure FQDN.
 *
 * Usage:
 *   BASE=https://miaiweb-production.up.railway.app node scripts/cutover-smoke.mjs
 *   BASE=https://<containerAppFqdn> TOKEN=eyJ... node scripts/cutover-smoke.mjs
 *
 * Without TOKEN: health + catalog only (mock-friendly).
 * With TOKEN: wallet + rent + agent read (OIDC path).
 */
const BASE = (process.env.BASE || process.env.APP_BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const TOKEN = process.env.TOKEN || "";
const AGENT = process.env.SMOKE_AGENT_ID || "us-customer-support";

let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${name}: ${err instanceof Error ? err.message : err}`);
  }
}

async function json(path, init = {}) {
  const headers = { ...(init.headers || {}) };
  if (TOKEN) headers.authorization = `Bearer ${TOKEN}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

await check("health", async () => {
  const { res, body } = await json("/api/health");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!body || typeof body !== "object") throw new Error("no JSON");
  // storePing is new — tolerate older deploys until Azure/Railway pick up the health deepen
  if (body.storePing === "error") throw new Error(`storePing error: ${body.storePingError || "?"}`);
  if (body.store === "error") throw new Error(`store hydrate error: ${body.storeError || "?"}`);
  const storeLabel = body.storeBackend
    ? `${body.storeBackend}/${body.storePing || body.store || "?"}`
    : body.store || "?";
  console.log(
    `    status=${body.status} auth=${body.authMode} wallet=${body.walletMode} model=${body.modelMode} store=${storeLabel}`,
  );
});

await check("catalog home", async () => {
  const res = await fetch(`${BASE}/`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
});

if (TOKEN) {
  await check("wallet", async () => {
    const { res, body } = await json("/api/wallet");
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(body)}`);
    if (typeof body?.tokens !== "number" && typeof body?.balance?.tokens !== "number") {
      // accept either shape
      if (body?.workspaceId == null && body?.tokens == null) {
        throw new Error(`unexpected wallet shape: ${JSON.stringify(body)}`);
      }
    }
  });

  await check(`rent ${AGENT}`, async () => {
    const { res, body } = await json("/api/rent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: AGENT }),
    });
    if (!res.ok && res.status !== 409) {
      throw new Error(`HTTP ${res.status}: ${JSON.stringify(body)}`);
    }
  });

  await check(`agent ${AGENT}`, async () => {
    const { res, body } = await json(`/api/agents/${AGENT}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(body)}`);
    if (!body?.agentId && !body?.state) {
      throw new Error(`unexpected agent shape: ${JSON.stringify(body)}`);
    }
  });
} else {
  console.log("· TOKEN unset — skipped wallet/rent/agent (mock staging OK)");
}

await check("app channel page", async () => {
  const res = await fetch(`${BASE}/app/v1?key=mia_pk_smoke_test`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (!html.includes("mi-app") && !html.includes("AppChat") && !html.includes("Missing")) {
    // Next may stream RSC payload — accept any 200 HTML/document
    if (!html || html.length < 20) throw new Error("empty app page");
  }
});

await check("app chat API (invalid key → 401)", async () => {
  const res = await fetch(`${BASE}/api/app/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ key: "mia_pk_invalid", message: "hi" }),
  });
  if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
});

if (failed) {
  console.error(`\nSmoke FAILED (${failed} check(s)) against ${BASE}`);
  process.exit(1);
}
console.log(`\nSmoke OK against ${BASE}`);
