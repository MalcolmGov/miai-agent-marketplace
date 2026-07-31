#!/usr/bin/env node
/**
 * Phase 1 exit-criteria smoke:
 * browse catalog → rent Customer Support → configure → connect → chat → top-up path.
 * Run against a local `pnpm --filter @miai/web dev` (default http://127.0.0.1:3000).
 */
const BASE = process.env.DEMO_BASE ?? "http://127.0.0.1:3000";
const agentId = process.env.DEMO_AGENT ?? "us-customer-support";

async function j(path, init) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} ${res.status} ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  console.log("Phase 1 demo against", BASE);
  const catalog = await j("/api/catalog?market=us&q=customer");
  console.log("catalog hits", catalog.count);

  const rent = await j("/api/rent", {
    method: "POST",
    body: JSON.stringify({ agentId, tier: "standard" }),
  });
  console.log("rented", rent.rental.publicKey, "state", rent.rental.state);

  await j("/api/configure", {
    method: "POST",
    body: JSON.stringify({
      agentId,
      model: "claude-sonnet",
      knowledge: "Hours: Mon–Fri 9–5. Free shipping over $50. Returns within 30 days.",
      markRented: true,
    }),
  });
  console.log("configured sonnet + knowledge");

  for (const connectorId of ["shopify", "google_calendar", "slack"]) {
    await j("/api/connectors", {
      method: "POST",
      body: JSON.stringify({ agentId, connectorId, config: { access_token: "demo" } }),
    });
    console.log("connected", connectorId);
  }

  const chat1 = await j("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      agentId,
      message: "Where is my order ORD-4821?",
      mode: "sandbox",
    }),
  });
  console.log("chat:", chat1.assistantMessage.slice(0, 120), "tokens", chat1.tokensDebited);

  const bal = await j("/api/wallet");
  console.log("wallet", bal.tokens);

  const top = await j("/api/wallet", {
    method: "POST",
    body: JSON.stringify({ packageId: "10", usdAmount: 10 }),
  });
  console.log("topped up →", top.tokens);

  const embed = await fetch(`${BASE}/agents/v1/agent.js`);
  console.log("agent.js", embed.status, embed.headers.get("content-type"));

  console.log("\nPhase 1 exit criteria: PASS (API path)");
}

main().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
