import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isCustomerSupport,
  runCustomerSupportWorkflow,
} from "../dist/workflows/customer-support.js";
import {
  isDeliveryTracking,
  runDeliveryTrackingWorkflow,
} from "../dist/workflows/delivery-tracking.js";
import { isBookingFrontDesk } from "../dist/workflows/booking-front-desk.js";

function mockExecute(calls) {
  return async (name, args) => {
    calls.push({ name, args });
    return {
      ok: true,
      data: {
        reference: `REF-${name}`,
        ticket_id: `REF-${name}`,
        id: `REF-${name}`,
        status: "in_transit",
      },
    };
  };
}

describe("flagship depth phase 1b — re-gap", () => {
  it("trades-receptionist already covered by booking-front-desk shared module", () => {
    assert.equal(isBookingFrontDesk("us-trades-receptionist"), true);
    assert.equal(isBookingFrontDesk("us-salon-booking"), true);
    assert.equal(isBookingFrontDesk("us-home-services"), true);
    assert.equal(isBookingFrontDesk("us-customer-support"), false);
  });

  it("matches CS and delivery ids", () => {
    assert.equal(isCustomerSupport("us-customer-support"), true);
    assert.equal(isDeliveryTracking("eu-delivery-tracking"), true);
  });
});

describe("customer-support workflow", () => {
  const tools = ["get_order_status", "check_availability", "create_ticket", "handoff_to_human"];

  it("tracks order without opening a ticket", async () => {
    const calls = [];
    const r = await runCustomerSupportWorkflow({
      agentId: "us-customer-support",
      userMessage: "Where's order 4821?",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.equal(r.handled, true);
    assert.ok(calls.some((c) => c.name === "get_order_status"));
    assert.ok(!calls.some((c) => c.name === "create_ticket"));
  });

  it("confirm-before-write on ticket; never self-refunds", async () => {
    const calls = [];
    const proposed = await runCustomerSupportWorkflow({
      agentId: "us-customer-support",
      userMessage: "Blender arrived broken — I want a refund on order 4821",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.equal(proposed.plan?.status, "proposed");
    assert.equal(calls.length, 0);
    assert.match(proposed.assistantMessage, /can't issue a refund/i);

    const confirmed = await runCustomerSupportWorkflow({
      agentId: "us-customer-support",
      userMessage: "Yes, go ahead.",
      messages: [{ role: "assistant", content: proposed.assistantMessage }],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.ok(calls.some((c) => c.name === "create_ticket"));
    assert.ok(calls.some((c) => c.name === "handoff_to_human"));
  });

  it("card / instant refund path does not create_ticket alone as a refund", async () => {
    const calls = [];
    const r = await runCustomerSupportWorkflow({
      agentId: "us-customer-support",
      userMessage: "Refund me now, card 4111",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.equal(r.handled, true);
    assert.ok(!calls.some((c) => c.name === "create_ticket"));
  });
});

describe("delivery-tracking workflow", () => {
  const tools = [
    "track_consignment",
    "get_proof_of_delivery",
    "log_exception",
    "handoff_to_human",
  ];

  it("tracks waybill without logging exception", async () => {
    const calls = [];
    const r = await runDeliveryTrackingWorkflow({
      agentId: "us-delivery-tracking",
      userMessage: "Where's my parcel? Waybill SLC-4821",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.ok(calls.some((c) => c.name === "track_consignment"));
    assert.ok(!calls.some((c) => c.name === "log_exception"));
  });

  it("confirm-before-write on exception + desk handoff", async () => {
    const calls = [];
    const proposed = await runDeliveryTrackingWorkflow({
      agentId: "us-delivery-tracking",
      userMessage: "Tracking says delivered but I never got it — SLC-4821",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.equal(proposed.plan?.status, "proposed");
    assert.equal(calls.length, 0);

    const confirmed = await runDeliveryTrackingWorkflow({
      agentId: "us-delivery-tracking",
      userMessage: "Yes, go ahead.",
      messages: [{ role: "assistant", content: proposed.assistantMessage }],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.ok(calls.some((c) => c.name === "log_exception"));
    assert.ok(calls.some((c) => c.name === "handoff_to_human"));
  });
});
