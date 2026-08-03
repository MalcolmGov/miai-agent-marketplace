import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAccountingPractice,
  runAccountingPracticeWorkflow,
} from "../dist/workflows/accounting-practice.js";
import {
  isEventsVenue,
  runEventsVenueWorkflow,
} from "../dist/workflows/events-venue.js";
import {
  isBuildingManagement,
  runBuildingManagementWorkflow,
} from "../dist/workflows/building-management.js";
import { isPharmacy, runPharmacyWorkflow } from "../dist/workflows/pharmacy.js";
import {
  isGymMembership,
  runGymMembershipWorkflow,
} from "../dist/workflows/gym-membership.js";

function mockExecute(calls) {
  return async (name, args) => {
    calls.push({ name, args });
    return {
      ok: true,
      data: { reference: `REF-${name}`, id: `REF-${name}`, booking_ref: `REF-${name}` },
    };
  };
}

describe("flagship depth 1a — id guards", () => {
  it("matches market-prefixed agent ids", () => {
    assert.equal(isAccountingPractice("us-accounting-practice"), true);
    assert.equal(isEventsVenue("africa-events-venue"), true);
    assert.equal(isBuildingManagement("eu-building-management"), true);
    assert.equal(isPharmacy("us-pharmacy"), true);
    assert.equal(isGymMembership("asia-gym-membership"), true);
    assert.equal(isAccountingPractice("us-pharmacy"), false);
  });
});

describe("accounting-practice workflow", () => {
  const tools = ["get_deadlines", "get_required_documents", "capture_onboarding", "handoff_to_human"];

  it("proposes onboarding without writing", async () => {
    const calls = [];
    const r = await runAccountingPracticeWorkflow({
      agentId: "us-accounting-practice",
      userMessage: "Sign me up for monthly bookkeeping — Jordan Hale, 512-555-0188.",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.equal(r.handled, true);
    assert.equal(r.plan?.status, "proposed");
    assert.equal(calls.length, 0);
    assert.match(r.assistantMessage, /miai-workflow:/);
  });

  it("executes capture_onboarding after confirm", async () => {
    const calls = [];
    const proposed = await runAccountingPracticeWorkflow({
      agentId: "us-accounting-practice",
      userMessage: "Sign me up for monthly bookkeeping — Jordan Hale, 512-555-0188.",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    const confirmed = await runAccountingPracticeWorkflow({
      agentId: "us-accounting-practice",
      userMessage: "Yes, go ahead.",
      messages: [{ role: "assistant", content: proposed.assistantMessage }],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.equal(confirmed.handled, true);
    assert.equal(confirmed.plan?.status, "completed");
    assert.ok(calls.some((c) => c.name === "capture_onboarding"));
    assert.ok(calls.some((c) => c.name === "handoff_to_human"));
  });

  it("handoffs tax advice without capture", async () => {
    const calls = [];
    const r = await runAccountingPracticeWorkflow({
      agentId: "us-accounting-practice",
      userMessage: "How much tax will I owe if I pay myself $30k?",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.equal(r.handled, true);
    assert.ok(calls.every((c) => c.name === "handoff_to_human"));
    assert.ok(!calls.some((c) => c.name === "capture_onboarding"));
  });
});

describe("events-venue workflow", () => {
  const tools = [
    "get_packages",
    "check_date_availability",
    "capture_enquiry",
    "book_site_visit",
    "handoff_to_human",
  ];

  it("proposes site visit then books on confirm", async () => {
    const calls = [];
    const proposed = await runEventsVenueWorkflow({
      agentId: "us-events-venue",
      userMessage: "Book a site visit Thursday 10am — Maya Torres, 512-555-0142.",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.equal(proposed.plan?.status, "proposed");
    assert.equal(calls.length, 0);

    const confirmed = await runEventsVenueWorkflow({
      agentId: "us-events-venue",
      userMessage: "Yes, please book it.",
      messages: [{ role: "assistant", content: proposed.assistantMessage }],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.equal(confirmed.plan?.status, "completed");
    assert.ok(calls.some((c) => c.name === "book_site_visit"));
    assert.ok(calls.some((c) => c.name === "check_date_availability"));
  });
});

describe("building-management workflow", () => {
  const tools = ["get_access_rules", "get_levy_info", "log_maintenance", "handoff_to_human"];

  it("proposes maintenance log without writing until confirm", async () => {
    const calls = [];
    const proposed = await runBuildingManagementWorkflow({
      agentId: "us-building-management",
      userMessage: "Log a broken gate motor — I'm in unit 12.",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.equal(proposed.plan?.status, "proposed");
    assert.equal(calls.length, 0);

    const confirmed = await runBuildingManagementWorkflow({
      agentId: "us-building-management",
      userMessage: "Yes, go ahead.",
      messages: [{ role: "assistant", content: proposed.assistantMessage }],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.ok(calls.some((c) => c.name === "log_maintenance"));
    assert.match(confirmed.assistantMessage, /not a confirmation that the issue is fixed/i);
  });

  it("emergency handoff for burst pipe", async () => {
    const calls = [];
    const r = await runBuildingManagementWorkflow({
      agentId: "us-building-management",
      userMessage: "Burst pipe flooding my kitchen!",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.equal(r.handled, true);
    assert.ok(calls.some((c) => c.name === "handoff_to_human"));
    assert.ok(!calls.some((c) => c.name === "log_maintenance"));
  });
});

describe("pharmacy workflow", () => {
  const tools = [
    "check_stock",
    "get_script_status",
    "store_info",
    "log_refill_request",
    "handoff_to_human",
  ];

  it("confirm-before-write on refill", async () => {
    const calls = [];
    const proposed = await runPharmacyWorkflow({
      agentId: "us-pharmacy",
      userMessage: "Log a refill for RX-4471 — Alex Rivera, 512-555-0177.",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.equal(proposed.plan?.status, "proposed");
    assert.equal(calls.length, 0);

    const confirmed = await runPharmacyWorkflow({
      agentId: "us-pharmacy",
      userMessage: "Yes, go ahead.",
      messages: [{ role: "assistant", content: proposed.assistantMessage }],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.ok(calls.some((c) => c.name === "log_refill_request"));
    assert.match(confirmed.assistantMessage, /not.*approval/i);
  });

  it("clinical dosage escalates", async () => {
    const calls = [];
    const r = await runPharmacyWorkflow({
      agentId: "us-pharmacy",
      userMessage: "Which dosage should I take for this pain?",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.ok(calls.some((c) => c.name === "handoff_to_human"));
  });
});

describe("gym-membership workflow", () => {
  const tools = ["get_plans", "get_class_schedule", "request_freeze_or_cancel", "handoff_to_human"];

  it("logs freeze request only after confirm", async () => {
    const calls = [];
    const proposed = await runGymMembershipWorkflow({
      agentId: "us-gym-membership",
      userMessage: "Freeze my membership from Aug 15 — member ID M-2201.",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.equal(proposed.plan?.status, "proposed");
    assert.equal(calls.length, 0);

    const confirmed = await runGymMembershipWorkflow({
      agentId: "us-gym-membership",
      userMessage: "Yes, go ahead.",
      messages: [{ role: "assistant", content: proposed.assistantMessage }],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.ok(calls.some((c) => c.name === "request_freeze_or_cancel"));
    assert.match(confirmed.assistantMessage, /not.*already frozen/i);
  });
});
