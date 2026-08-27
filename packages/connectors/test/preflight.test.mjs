import { describe, it, before, afterEach } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import {
  computeConnectorReadiness,
  requiredExternalConnectors,
  saveToken,
  deleteToken,
} from "../dist/index.js";

// P0-6 preflight: does an agent's ACTION tools' external (oauth/mcp) connectors have a stored
// credential for this workspace? Presence-only, sandbox-inert, in-app/read/handoff tools exempt.

// Point the file token store at a throwaway path and set the sealing secret before any saveToken.
process.env.OAUTH_TOKEN_STORE_PATH = path.join(os.tmpdir(), `miai-preflight-tokens-${process.pid}.json`);
process.env.OAUTH_TOKEN_SECRET = "test-secret-at-least-sixteen";

function tok(workspaceId, connectorId, overrides = {}) {
  return {
    connectorId,
    workspaceId,
    accessToken: "access-real",
    meta: {},
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
const t = (...names) => names.map((name) => ({ name }));

describe("requiredExternalConnectors — pure, zero I/O", () => {
  it("a read-only + handoff agent requires nothing", () => {
    assert.deepEqual(
      requiredExternalConnectors(t("get_availability", "list_orders", "handoff_to_human"), []),
      [],
    );
  });

  it("dedupes two action tools that share one connector", () => {
    const bindings = [
      { tool: "book_meeting", connector: "google_calendar" },
      { tool: "cancel_meeting", connector: "google_calendar" },
    ];
    assert.deepEqual(
      requiredExternalConnectors(t("book_meeting", "cancel_meeting"), bindings),
      ["google_calendar"],
    );
  });

  it("an unmapped action tool defaults to webhook and is NOT gated", () => {
    assert.deepEqual(requiredExternalConnectors(t("do_custom_thing"), []), []);
  });

  it("in-app assistant tools (set_reminder → google_calendar) are NOT gated", () => {
    const bindings = [{ tool: "set_reminder", connector: "google_calendar" }];
    assert.deepEqual(requiredExternalConnectors(t("set_reminder"), bindings), []);
  });
});

describe("computeConnectorReadiness — sandbox is inert", () => {
  afterEach(() => delete process.env.SANDBOX_MODE);

  it("SANDBOX_MODE=1 → ready, no token reads, nothing missing", async () => {
    process.env.SANDBOX_MODE = "1";
    const r = await computeConnectorReadiness(
      "ws-sandbox",
      t("book_meeting"),
      [{ tool: "book_meeting", connector: "google_calendar" }],
    );
    assert.equal(r.ready, true);
    assert.equal(r.sandbox, true);
    assert.deepEqual(r.missing, []);
  });

  it("mode:'sandbox' (studio free-try) is also inert on a non-sandbox deployment", async () => {
    const r = await computeConnectorReadiness(
      "ws-freetry",
      t("book_meeting"),
      [{ tool: "book_meeting", connector: "google_calendar" }],
      { mode: "sandbox" },
    );
    assert.equal(r.ready, true);
    assert.equal(r.sandbox, true);
  });
});

describe("computeConnectorReadiness — oauth", () => {
  const WS = "ws-preflight-oauth";
  const bindings = [{ tool: "book_meeting", connector: "google_calendar" }];
  afterEach(async () => {
    await deleteToken(WS, "google_calendar");
  });

  it("no token → not ready, missing google_calendar (no_token)", async () => {
    const r = await computeConnectorReadiness(WS, t("book_meeting"), bindings);
    assert.equal(r.ready, false);
    assert.deepEqual(r.required, ["google_calendar"]);
    assert.equal(r.missing.length, 1);
    assert.equal(r.missing[0].connector, "google_calendar");
    assert.equal(r.missing[0].kind, "oauth");
    assert.equal(r.missing[0].reason, "no_token");
    assert.deepEqual(r.missing[0].tools, ["book_meeting"]);
  });

  it("a 'demo' token is treated as NOT connected (parity with executeLive)", async () => {
    await saveToken(tok(WS, "google_calendar", { accessToken: "demo" }));
    const r = await computeConnectorReadiness(WS, t("book_meeting"), bindings);
    assert.equal(r.ready, false);
    assert.equal(r.missing[0].reason, "demo_token");
  });

  it("a real stored token → ready", async () => {
    await saveToken(tok(WS, "google_calendar"));
    const r = await computeConnectorReadiness(WS, t("book_meeting"), bindings);
    assert.equal(r.ready, true);
    assert.deepEqual(r.missing, []);
  });

  it("a binding-supplied config.access_token counts as connected (no token row)", async () => {
    const r = await computeConnectorReadiness(WS, t("book_meeting"), [
      { tool: "book_meeting", connector: "google_calendar", config: { access_token: "cfg-tok" } },
    ]);
    assert.equal(r.ready, true);
  });

  it("read + handoff tools on an unconnected connector are never missing", async () => {
    const r = await computeConnectorReadiness(WS, t("get_availability", "take_message"), [
      { tool: "get_availability", connector: "google_calendar" },
      { tool: "take_message", connector: "slack" },
    ]);
    assert.equal(r.ready, true);
    assert.deepEqual(r.required, []);
  });

  it("in-app set_reminder bound to an unconnected google_calendar is READY (review #1 guard)", async () => {
    const r = await computeConnectorReadiness(WS, t("set_reminder"), [
      { tool: "set_reminder", connector: "google_calendar" },
    ]);
    assert.equal(r.ready, true);
    assert.deepEqual(r.missing, []);
  });
});

describe("computeConnectorReadiness — mcp", () => {
  const WS = "ws-preflight-mcp";
  afterEach(async () => {
    await deleteToken(WS, "mcp");
  });

  it("no endpoint → missing (missing_config)", async () => {
    const r = await computeConnectorReadiness(WS, t("submit_ticket"), [
      { tool: "submit_ticket", connector: "mcp" },
    ]);
    assert.equal(r.ready, false);
    assert.equal(r.missing[0].kind, "mcp");
    assert.equal(r.missing[0].reason, "missing_config");
  });

  it("a binding config.endpoint → ready", async () => {
    const r = await computeConnectorReadiness(WS, t("submit_ticket"), [
      { tool: "submit_ticket", connector: "mcp", config: { endpoint: "https://mcp.example/tools/call" } },
    ]);
    assert.equal(r.ready, true);
  });

  it("a stored token meta.endpoint → ready", async () => {
    await saveToken(tok(WS, "mcp", { accessToken: "x", meta: { endpoint: "https://mcp.example" } }));
    const r = await computeConnectorReadiness(WS, t("submit_ticket"), [
      { tool: "submit_ticket", connector: "mcp" },
    ]);
    assert.equal(r.ready, true);
  });
});

describe("computeConnectorReadiness — per-workspace isolation", () => {
  const A = "ws-tenant-A";
  const B = "ws-tenant-B";
  const bindings = [{ tool: "book_meeting", connector: "google_calendar" }];
  before(async () => {
    await saveToken(tok(A, "google_calendar"));
  });
  afterEach(async () => {
    /* keep A's token for both assertions; cleaned by the final delete below */
  });

  it("tenant A (connected) is ready; tenant B (not) is missing — no cross-tenant leak", async () => {
    const ra = await computeConnectorReadiness(A, t("book_meeting"), bindings);
    const rb = await computeConnectorReadiness(B, t("book_meeting"), bindings);
    assert.equal(ra.ready, true);
    assert.equal(rb.ready, false);
    assert.equal(rb.missing[0].reason, "no_token");
    await deleteToken(A, "google_calendar");
  });
});
