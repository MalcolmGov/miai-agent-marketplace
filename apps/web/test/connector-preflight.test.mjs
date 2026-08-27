/**
 * P0-6 — apps/web connector-preflight wrapper: binding resolution + the systemAppend / connectorNotice
 * shapes + sandbox inertness. (The underlying readiness algorithm is unit-tested in @miai/connectors.)
 */
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

process.env.OAUTH_TOKEN_STORE_PATH = path.join(os.tmpdir(), `miai-web-preflight-${process.pid}.json`);

const pkg = (id, tools) => ({ manifest: { id }, tools: tools.map((name) => ({ name })) });
const bind = (tool, connector, config) => ({ tool, connector, ...(config ? { config } : {}) });

const mod = () => import("../src/lib/connector-preflight.ts");

describe("resolvePkgBindings — precedence", () => {
  it("an explicit override wins", async () => {
    const { resolvePkgBindings } = await mod();
    const override = [bind("book_meeting", "google_calendar")];
    assert.deepEqual(resolvePkgBindings(pkg("x", ["book_meeting"]), override), override);
  });

  it("falls back to tool defaults for an unknown preset id (webhook, not gated)", async () => {
    const { resolvePkgBindings, agentRequiredConnectors } = await mod();
    const p = pkg("no-such-preset", ["do_thing"]);
    const bindings = resolvePkgBindings(p);
    assert.ok(Array.isArray(bindings));
    assert.deepEqual(agentRequiredConnectors(p), []); // default webhook binding is never gated
  });
});

describe("agentReadiness — not ready", () => {
  afterEach(() => delete process.env.SANDBOX_MODE);

  it("an unconnected oauth action tool yields an honest notice naming the connector", async () => {
    const { agentReadiness } = await mod();
    const r = await agentReadiness(
      "ws-web-preflight-1",
      pkg("booking", ["book_meeting"]),
      [bind("book_meeting", "google_calendar")],
    );
    assert.equal(r.readiness.ready, false);
    assert.match(r.systemAppend, /Connector status/);
    assert.match(r.systemAppend, /Google Calendar/);
    assert.match(r.systemAppend, /not connected/i);
    assert.ok(r.connectorNotice);
    assert.equal(r.connectorNotice.ready, false);
    assert.equal(r.connectorNotice.missing[0].connector, "google_calendar");
    assert.equal(r.connectorNotice.missing[0].name, "Google Calendar");
  });
});

describe("agentReadiness — ready / inert", () => {
  afterEach(() => delete process.env.SANDBOX_MODE);

  it("SANDBOX_MODE=1 is inert: ready, no notice", async () => {
    process.env.SANDBOX_MODE = "1";
    const { agentReadiness } = await mod();
    const r = await agentReadiness(
      "ws-web-preflight-2",
      pkg("booking", ["book_meeting"]),
      [bind("book_meeting", "google_calendar")],
    );
    assert.equal(r.readiness.ready, true);
    assert.equal(r.readiness.sandbox, true);
    assert.equal(r.systemAppend, "");
    assert.equal(r.connectorNotice, null);
  });

  it("a read-only + handoff agent is ready with no notice", async () => {
    const { agentReadiness } = await mod();
    const r = await agentReadiness(
      "ws-web-preflight-3",
      pkg("desk", ["get_availability", "handoff_to_human"]),
      [bind("get_availability", "google_calendar"), bind("handoff_to_human", "slack")],
    );
    assert.equal(r.readiness.ready, true);
    assert.equal(r.systemAppend, "");
    assert.equal(r.connectorNotice, null);
  });

  it("a binding-supplied config.access_token counts as connected", async () => {
    const { agentReadiness } = await mod();
    const r = await agentReadiness(
      "ws-web-preflight-4",
      pkg("booking", ["book_meeting"]),
      [bind("book_meeting", "google_calendar", { access_token: "cfg" })],
    );
    assert.equal(r.readiness.ready, true);
  });
});
