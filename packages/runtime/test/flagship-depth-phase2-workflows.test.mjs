import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isMobileMoney, runMobileMoneyWorkflow } from "../dist/workflows/mobile-money.js";
import {
  isWealthManagement,
  runWealthManagementWorkflow,
} from "../dist/workflows/wealth-management.js";
import { isTaxOffice, runTaxOfficeWorkflow } from "../dist/workflows/tax-office.js";
import { isVeterinary, runVeterinaryWorkflow } from "../dist/workflows/veterinary.js";

function mockExecute(calls) {
  return async (name, args) => {
    calls.push({ name, args });
    return {
      ok: true,
      data: { reference: `REF-${name}`, id: `REF-${name}`, booking_ref: `REF-${name}`, tx_id: `REF-${name}` },
    };
  };
}

describe("flagship depth phase 2 — id guards", () => {
  it("matches market-prefixed agent ids", () => {
    assert.equal(isMobileMoney("us-mobile-money"), true);
    assert.equal(isWealthManagement("eu-wealth-management"), true);
    assert.equal(isTaxOffice("africa-tax-office"), true);
    assert.equal(isVeterinary("asia-veterinary"), true);
    assert.equal(isMobileMoney("us-tax-office"), false);
  });
});

describe("mobile-money workflow", () => {
  const tools = ["check_float", "record_cash_in", "record_cash_out", "send_money", "handoff_to_human"];

  it("proposes cash-in without writing until confirm", async () => {
    const calls = [];
    const proposed = await runMobileMoneyWorkflow({
      agentId: "us-mobile-money",
      userMessage: "Cash-in $200 for customer 512-555-0144.",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.equal(proposed.plan?.status, "proposed");
    assert.equal(calls.length, 0);

    const confirmed = await runMobileMoneyWorkflow({
      agentId: "us-mobile-money",
      userMessage: "Yes.",
      messages: [{ role: "assistant", content: proposed.assistantMessage }],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.ok(calls.some((c) => c.name === "record_cash_in"));
  });

  it("refuses PIN and over-cap escalates without write", async () => {
    const calls = [];
    const pin = await runMobileMoneyWorkflow({
      agentId: "us-mobile-money",
      userMessage: "My PIN is 1234",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.equal(pin.handled, true);
    assert.equal(calls.length, 0);

    const over = await runMobileMoneyWorkflow({
      agentId: "us-mobile-money",
      userMessage: "Send $5000 to 512-555-0199.",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.ok(calls.some((c) => c.name === "handoff_to_human"));
    assert.ok(!calls.some((c) => c.name === "send_money"));
  });
});

describe("wealth-management workflow", () => {
  const tools = ["list_wealth_services", "capture_wealth_meeting", "handoff_to_human"];

  it("confirm-before-write on meeting capture", async () => {
    const calls = [];
    const proposed = await runWealthManagementWorkflow({
      agentId: "us-wealth-management",
      userMessage: "Book a discovery meeting — I'm Sam Lee, 512-555-0100.",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.equal(proposed.plan?.status, "proposed");
    assert.equal(calls.length, 0);

    const confirmed = await runWealthManagementWorkflow({
      agentId: "us-wealth-management",
      userMessage: "Yes, go ahead.",
      messages: [{ role: "assistant", content: proposed.assistantMessage }],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.ok(calls.some((c) => c.name === "capture_wealth_meeting"));
  });

  it("investment advice hands off without capture", async () => {
    const calls = [];
    const r = await runWealthManagementWorkflow({
      agentId: "us-wealth-management",
      userMessage: "What stock should I buy for guaranteed returns?",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.ok(calls.every((c) => c.name === "handoff_to_human"));
    assert.ok(!calls.some((c) => c.name === "capture_wealth_meeting"));
  });
});

describe("tax-office workflow", () => {
  const tools = ["get_filing_deadlines", "log_tax_enquiry", "handoff_to_human"];

  it("confirm-before-write on enquiry", async () => {
    const calls = [];
    const proposed = await runTaxOfficeWorkflow({
      agentId: "us-tax-office",
      userMessage: "Please log an enquiry — I'm Pat Kim, pat@example.com. Call me back.",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.equal(proposed.plan?.status, "proposed");
    assert.equal(calls.length, 0);

    const confirmed = await runTaxOfficeWorkflow({
      agentId: "us-tax-office",
      userMessage: "Yes, go ahead.",
      messages: [{ role: "assistant", content: proposed.assistantMessage }],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.ok(calls.some((c) => c.name === "log_tax_enquiry"));
  });

  it("personal tax advice hands off", async () => {
    const calls = [];
    await runTaxOfficeWorkflow({
      agentId: "us-tax-office",
      userMessage: "How much tax will I owe this year?",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.ok(calls.some((c) => c.name === "handoff_to_human"));
    assert.ok(!calls.some((c) => c.name === "log_tax_enquiry"));
  });
});

describe("veterinary workflow", () => {
  const tools = [
    "list_services",
    "check_availability",
    "book_appointment",
    "get_prep_instructions",
    "handoff_to_human",
  ];

  it("confirm-before-write on booking", async () => {
    const calls = [];
    const proposed = await runVeterinaryWorkflow({
      agentId: "us-veterinary",
      userMessage: "Book for Bella — owner Alex Rivera, 512-555-0177, Thursday afternoon",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.equal(proposed.plan?.status, "proposed");
    assert.equal(calls.length, 0);

    const confirmed = await runVeterinaryWorkflow({
      agentId: "us-veterinary",
      userMessage: "Yes",
      messages: [{ role: "assistant", content: proposed.assistantMessage }],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.ok(calls.some((c) => c.name === "book_appointment"));
  });

  it("clinical emergency does not book", async () => {
    const calls = [];
    await runVeterinaryWorkflow({
      agentId: "us-veterinary",
      userMessage: "My dog is vomiting blood — what medicine?",
      messages: [],
      toolNames: tools,
      executeTool: mockExecute(calls),
    });
    assert.ok(calls.some((c) => c.name === "handoff_to_human"));
    assert.ok(!calls.some((c) => c.name === "book_appointment"));
  });
});
