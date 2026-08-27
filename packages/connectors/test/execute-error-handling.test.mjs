import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { executeLive } from "../dist/live/execute.js";

/**
 * Regression test for a missing-`await` bug: `case "webhook"` / `case "mcp"`
 * in executeLive() used to `return executeWebhook(...)` (no await) inside the
 * try block, so a later rejection escaped the surrounding catch uncaught —
 * crashing the whole conversation turn instead of degrading gracefully like
 * every other connector already does on failure.
 */
describe("executeLive — webhook/mcp failures degrade gracefully", () => {
  it("returns a graceful {ok:false} result (not a rejected promise) when the webhook URL is unconfigured", async () => {
    const result = await executeLive({
      workspaceId: `test-ws-${Date.now()}`,
      agentId: "test-agent",
      tool: "some_tool",
      args: {},
      binding: { tool: "some_tool", connector: "webhook", config: {} },
      mode: "live",
    });
    assert.equal(result.ok, false);
    assert.equal(result.connector, "webhook");
    assert.equal(result.stubbed, false);
    assert.match(String(result.data.error), /Webhook URL missing/);
    assert.equal(typeof result.data.suggestion, "string");
    assert.ok(result.data.suggestion.length > 0);
  });

  it("returns a graceful {ok:false} result (not a rejected promise) when the MCP endpoint is unconfigured", async () => {
    const result = await executeLive({
      workspaceId: `test-ws-${Date.now()}`,
      agentId: "test-agent",
      tool: "some_tool",
      args: {},
      binding: { tool: "some_tool", connector: "mcp", config: {} },
      mode: "live",
    });
    assert.equal(result.ok, false);
    assert.equal(result.connector, "mcp");
    assert.equal(result.stubbed, false);
    assert.match(String(result.data.error), /MCP endpoint missing/);
  });

  it("set_reminder succeeds in-app when no calendar is connected (not a 'connect your calendar' stub)", async () => {
    const result = await executeLive({
      workspaceId: `test-ws-${Date.now()}`,
      agentId: "personal-assistant",
      tool: "set_reminder",
      args: { text: "call the pharmacy", when: "at 5pm" },
      binding: { tool: "set_reminder", connector: "google_calendar", config: {} },
      mode: "live",
    });
    assert.equal(result.ok, true, "reminder succeeds without a calendar token");
    assert.equal(result.data.set, true);
    assert.match(String(result.data.note), /app|Reminders/i, "tells the user it's in-app");
    assert.doesNotMatch(String(result.data._note ?? ""), /OAuth-connected/, "not the connect-first stub");
  });
});

describe("executeLive — unconnected connector never fabricates an ACTION (P0-5)", () => {
  it("place_order on an unconnected OAuth connector fails honestly (no 'placed' / reference)", async () => {
    const result = await executeLive({
      workspaceId: `test-ws-p05-${Date.now()}`,
      agentId: "shop-agent",
      tool: "place_order",
      args: { items: [{ sku: "X", qty: 1 }] },
      binding: { tool: "place_order", connector: "shopify", config: {} },
      mode: "live",
    });
    assert.equal(result.ok, false, "must NOT report a successful order for an unconnected connector");
    assert.match(String(result.data.error), /not_connected/);
    // No fabricated success fields — the source of the 'ORD-3391' lie.
    assert.equal(result.data.status, undefined);
    assert.equal(result.data.reference, undefined);
    assert.equal(result.data.order_ref, undefined);
  });

  it("book_table + create_ticket likewise fail honestly", async () => {
    for (const tool of ["book_table", "create_ticket"]) {
      const r = await executeLive({
        workspaceId: `test-ws-p05-${tool}-${Date.now()}`,
        agentId: "agent",
        tool,
        args: {},
        binding: { tool, connector: "hubspot", config: {} },
        mode: "live",
      });
      assert.equal(r.ok, false, `${tool} must not fabricate success`);
      assert.equal(r.data.reference, undefined, `${tool} must not return a fake reference`);
    }
  });

  it("a READ tool still degrades to a stub (kept useful)", async () => {
    const r = await executeLive({
      workspaceId: `test-ws-p05r-${Date.now()}`,
      agentId: "agent",
      tool: "check_stock",
      args: { item: "Panado" },
      binding: { tool: "check_stock", connector: "shopify", config: {} },
      mode: "live",
    });
    assert.equal(r.ok, true, "reads keep stubbing so the assistant stays useful");
    assert.equal(r.stubbed, true);
  });

  it("routing/handoff tools are NOT blocked as not_connected (an emergency handoff must reach a human)", async () => {
    for (const tool of ["handoff_to_human", "route_to_department", "take_message"]) {
      const r = await executeLive({
        workspaceId: `test-ws-p05h-${tool}-${Date.now()}`,
        agentId: "agent",
        tool,
        args: { reason: "emergency", summary: "help" },
        binding: { tool, connector: "slack", config: {} },
        mode: "live",
      });
      assert.notEqual(String(r.data.error), "not_connected", `${tool} must still route, not fail closed`);
    }
    // handoff specifically routes to a human desk.
    const h = await executeLive({
      workspaceId: `test-ws-p05h2-${Date.now()}`,
      agentId: "agent",
      tool: "handoff_to_human",
      args: { reason: "emergency" },
      binding: { tool: "handoff_to_human", connector: "slack", config: {} },
      mode: "live",
    });
    assert.equal(h.ok, true, "handoff must succeed (route to human) even unconnected");
  });
});
