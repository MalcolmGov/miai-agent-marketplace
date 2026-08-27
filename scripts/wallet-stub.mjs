#!/usr/bin/env node
/**
 * Wallet stand-in for the production-config E2E run.
 *
 * Implements the SAME HTTP contract the platform's HttpWalletAdapter calls
 * (packages/wallet-adapter/src/index.ts), so you can run the full E2E with
 * MIAI_WALLET_MODE=http BEFORE MyInstantAI's real gateway is available — then swap
 * MIAI_WALLET_API_URL to their endpoint later with no other change.
 *
 *   GET  /v1/wallets/:workspaceId          -> { workspaceId, tokens, currencyLabel }
 *   POST /v1/wallets/:workspaceId/debit    -> { ok, balance, paused }  (402 on insufficient)
 *   POST /v1/wallets/:workspaceId/topup    -> { workspaceId, tokens, currencyLabel }
 *   GET  /health                           -> { ok: true }
 *
 * Auth: every /v1 call must carry `Authorization: Bearer <WALLET_STUB_TOKEN>`
 * (set WALLET_STUB_TOKEN to the same value you put in MIAI_WALLET_API_KEY).
 *
 * ⚠️ In-memory only — balances reset on restart. This is a TEST stand-in, not a wallet;
 * do NOT use it for real money.
 *
 *   PORT=8787 WALLET_STUB_TOKEN=<secret> node scripts/wallet-stub.mjs
 */
import { createServer } from "node:http";

const PORT = Number(process.env.PORT) || 8787;
const TOKEN = process.env.WALLET_STUB_TOKEN || "";
const DEFAULT_TOKENS = Number(process.env.WALLET_STUB_DEFAULT_TOKENS) || 1_000_000;

// Token grant per USD package — mirrors TOPUP_TOKENS in @miai/wallet-adapter.
const TOPUP_TOKENS = { "5": 65_000, "10": 150_000, "20": 420_000, "50": 1_250_000, "100": 2_750_000, "200": 6_900_000 };

const balances = new Map(); // workspaceId -> tokens
const seen = new Set(); // idempotency keys already applied

function balanceOf(ws) {
  if (!balances.has(ws)) balances.set(ws, DEFAULT_TOKENS);
  return balances.get(ws);
}
function walletBalance(ws) {
  return { workspaceId: ws, tokens: balanceOf(ws), currencyLabel: "PREPAID" };
}
function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(body) });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve(null); // signal malformed JSON
      }
    });
  });
}
function authorized(req) {
  if (!TOKEN) return true; // no token configured -> open (local dev only)
  const h = req.headers["authorization"] || "";
  return h === `Bearer ${TOKEN}`;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (req.method === "GET" && (path === "/health" || path === "/")) {
    return send(res, 200, { ok: true, service: "wallet-stub" });
  }

  const m = path.match(/^\/v1\/wallets\/([^/]+)(\/debit|\/topup)?$/);
  if (!m) return send(res, 404, { error: "not_found" });

  if (!authorized(req)) return send(res, 401, { error: "unauthorized" });

  const ws = decodeURIComponent(m[1]);
  const action = m[2];

  // GET balance
  if (!action && req.method === "GET") {
    return send(res, 200, walletBalance(ws));
  }

  // POST debit
  if (action === "/debit" && req.method === "POST") {
    const body = await readBody(req);
    if (!body) return send(res, 400, { error: "invalid_json" });
    const amount = Number(body.amount) || 0;
    const key = body.idempotencyKey || req.headers["idempotency-key"];
    const current = balanceOf(ws);
    // Idempotent replay: return current balance without re-debiting.
    if (key && seen.has(key)) {
      return send(res, 200, { ok: true, balance: current, paused: current <= 0 });
    }
    // Insufficient funds -> 402 (adapter maps 402/409 to a paused, non-throwing result).
    if (current < amount) {
      return send(res, 402, { ok: false, balance: current, paused: true, error: "Insufficient tokens" });
    }
    const next = current - amount;
    balances.set(ws, next);
    if (key) seen.add(key);
    return send(res, 200, { ok: true, balance: next, paused: next <= 0 });
  }

  // POST topup
  if (action === "/topup" && req.method === "POST") {
    const body = await readBody(req);
    if (!body) return send(res, 400, { error: "invalid_json" });
    const key = body.idempotencyKey;
    if (key && seen.has(key)) return send(res, 200, walletBalance(ws)); // idempotent credit
    const add = TOPUP_TOKENS[String(body.packageId)] ?? 0;
    balances.set(ws, balanceOf(ws) + add);
    if (key) seen.add(key);
    return send(res, 200, walletBalance(ws));
  }

  return send(res, 405, { error: "method_not_allowed" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    JSON.stringify({
      level: "info",
      event: "wallet_stub.listening",
      port: PORT,
      auth: TOKEN ? "bearer" : "open (no WALLET_STUB_TOKEN set)",
      defaultTokens: DEFAULT_TOKENS,
    }),
  );
});
