import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { runHotelGuestWorkflow } from "../dist/workflows/hotel-guest.js";
import { runPharmacyWorkflow } from "../dist/workflows/pharmacy.js";
import { runMobileMoneyWorkflow } from "../dist/workflows/mobile-money.js";
import { runVeterinaryWorkflow } from "../dist/workflows/veterinary.js";
import { runAccountingPracticeWorkflow } from "../dist/workflows/accounting-practice.js";
import { runEventsVenueWorkflow } from "../dist/workflows/events-venue.js";
import { runGymMembershipWorkflow } from "../dist/workflows/gym-membership.js";

// These tests exercise reply-content correctness bugs surfaced by the 2026-08-03 live-model
// eval run (docs/reports/eval-live-2026-08-03-*.md): the shallow eval-live pass bar
// (non-empty, non-paused) does not check whether a reply actually reflects the tool's
// result or the knowledge base, so several workflows shipped hardcoded / mis-routed /
// leak-prone replies that still passed eval-live while being wrong or unsafe.

const catalogRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/catalog");
function knowledgeFor(file) {
  return JSON.parse(readFileSync(path.join(catalogRoot, file), "utf8")).knowledge;
}
function failingExecuteTool() {
  return async () => ({ ok: false, data: { error: "Webhook URL missing" } });
}

describe("hotel-guest amenity topic routing", () => {
  const knowledge = knowledgeFor("us-hotel-guest.agent.json");
  const tools = ["get_amenity_info"];

  it("routes breakfast/parking questions to the breakfast section, not check-in", async () => {
    const r = await runHotelGuestWorkflow({
      agentId: "us-hotel-guest",
      userMessage: "What time is breakfast?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: failingExecuteTool(),
    });
    assert.match(r.assistantMessage, /Breakfast/i);
    assert.doesNotMatch(r.assistantMessage, /^## Check-in/);
  });

  it("routes pool/gym questions to the pool section, not check-in", async () => {
    const r = await runHotelGuestWorkflow({
      agentId: "us-hotel-guest",
      userMessage: "Is there a gym?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: failingExecuteTool(),
    });
    assert.match(r.assistantMessage, /Pool, gym, spa/i);
  });

  it("still routes check-in questions to the check-in section", async () => {
    const r = await runHotelGuestWorkflow({
      agentId: "us-hotel-guest",
      userMessage: "What time is check-in?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: failingExecuteTool(),
    });
    assert.match(r.assistantMessage, /Check-in \/ check-out/i);
  });

  it("breakfast and check-in replies are not byte-identical (regression guard for the topic-blind bug)", async () => {
    const breakfast = await runHotelGuestWorkflow({
      agentId: "us-hotel-guest",
      userMessage: "What time is breakfast?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: failingExecuteTool(),
    });
    const checkin = await runHotelGuestWorkflow({
      agentId: "us-hotel-guest",
      userMessage: "What time is check-in?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: failingExecuteTool(),
    });
    assert.notEqual(breakfast.assistantMessage, checkin.assistantMessage);
  });
});

describe("pharmacy tool-result relay", () => {
  const knowledge = knowledgeFor("us-pharmacy.agent.json");
  const tools = ["check_stock", "get_script_status", "handoff_to_human"];

  it("check_stock calls the tool with the schema's declared 'item' param, not 'product'/'sku'", async () => {
    const calls = [];
    await runPharmacyWorkflow({
      agentId: "us-pharmacy",
      userMessage: "Do you have Panado?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: async (name, args) => {
        calls.push({ name, args });
        return { ok: true, data: { available: true, level: "in_stock", price: "$1" } };
      },
    });
    assert.equal(calls[0].name, "check_stock");
    assert.deepEqual(calls[0].args, { item: "Panado" });
  });

  it("check_stock reply states the tool's actual price, not a fixed sentence", async () => {
    const r = await runPharmacyWorkflow({
      agentId: "us-pharmacy",
      userMessage: "Do you have Panado?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: async () => ({ ok: true, data: { available: true, level: "in_stock", price: "$1" } }),
    });
    assert.match(r.assistantMessage, /\$1/);
    assert.doesNotMatch(r.assistantMessage, /^I checked OTC stock for that item\.$/);
  });

  it("check_stock falls back to the matching knowledge line when the tool call fails", async () => {
    const r = await runPharmacyWorkflow({
      agentId: "us-pharmacy",
      userMessage: "Do you have Panado?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: failingExecuteTool(),
    });
    assert.match(r.assistantMessage, /\$1/);
  });

  it("get_script_status calls the tool with the schema's declared 'script_ref' param", async () => {
    const calls = [];
    await runPharmacyWorkflow({
      agentId: "us-pharmacy",
      userMessage: "Is RX-4471 ready?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: async (name, args) => {
        calls.push({ name, args });
        return { ok: true, data: { status: "ready_for_collection" } };
      },
    });
    assert.equal(calls[0].name, "get_script_status");
    assert.deepEqual(calls[0].args, { script_ref: "RX-4471" });
  });

  it("get_script_status reply states the tool's actual status", async () => {
    const r = await runPharmacyWorkflow({
      agentId: "us-pharmacy",
      userMessage: "Is RX-4471 ready?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: async () => ({
        ok: true,
        data: { status: "ready_for_collection", ready_since: "yesterday 15:00" },
      }),
    });
    assert.match(r.assistantMessage, /ready for collection/i);
  });
});

describe("mobile-money check_float relay", () => {
  const knowledge = knowledgeFor("africa-mobile-money.agent.json");
  const tools = ["check_float", "record_cash_in", "record_cash_out", "send_money", "handoff_to_human"];

  it("reply states the tool's actual float value, not the unrelated single-tx cap", async () => {
    const r = await runMobileMoneyWorkflow({
      agentId: "africa-mobile-money",
      userMessage: "What's my float?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: async () => ({ ok: true, data: { float: "$4,320.00", currency: "USD" } }),
    });
    assert.match(r.assistantMessage, /\$4,320\.00/);
  });

  it("fails safe with an explicit error when the tool call fails, instead of a silently-wrong figure", async () => {
    const r = await runMobileMoneyWorkflow({
      agentId: "africa-mobile-money",
      userMessage: "What's my float?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: failingExecuteTool(),
    });
    // Pre-fix this branch always returned the same hardcoded string regardless of tool
    // outcome, so it never explicitly admitted the float couldn't be read.
    assert.match(r.assistantMessage, /couldn't read the live float/i);
  });
});

describe("veterinary list_services relay", () => {
  const knowledge = knowledgeFor("us-veterinary.agent.json");
  const tools = ["list_services", "book_appointment", "handoff_to_human"];

  it("reply states the tool's actual price when the tool returns priced services", async () => {
    const r = await runVeterinaryWorkflow({
      agentId: "us-veterinary",
      userMessage: "How much is a wellness consultation?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: async () => ({
        ok: true,
        data: { services: [{ name: "Wellness consultation", duration_min: 20, price: "$59" }] },
      }),
    });
    assert.match(r.assistantMessage, /\$59/);
  });

  it("falls back to the knowledge price list when the sandbox stub carries no prices", async () => {
    const r = await runVeterinaryWorkflow({
      agentId: "us-veterinary",
      userMessage: "How much is a wellness consultation?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: async () => ({
        ok: true,
        data: { items: ["Check-up", "Standard service"], note: "Sandbox stub" },
      }),
    });
    assert.match(r.assistantMessage, /\$59/);
  });
});

describe("accounting-practice internal-note leak", () => {
  const knowledge = knowledgeFor("us-accounting-practice.agent.json");
  const tools = ["get_deadlines", "get_required_documents", "handoff_to_human"];

  it("get_deadlines reply never leaks the internal 'fetches this list with' authoring note", async () => {
    const r = await runAccountingPracticeWorkflow({
      agentId: "us-accounting-practice",
      userMessage: "When is my sales tax return due?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: async () => ({
        ok: true,
        data: { deadlines: [{ item: "Sales tax return", due: "25th" }], disclaimer: "General guide only." },
      }),
    });
    assert.doesNotMatch(r.assistantMessage, /fetches this list/i);
  });

  it("get_deadlines knowledge fallback also strips the leaked authoring note", async () => {
    const r = await runAccountingPracticeWorkflow({
      agentId: "us-accounting-practice",
      userMessage: "When is my sales tax return due?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: failingExecuteTool(),
    });
    assert.doesNotMatch(r.assistantMessage, /fetches this list/i);
    assert.match(r.assistantMessage, /25th/);
  });

  it("get_required_documents reply never leaks the internal 'Fetched with' authoring note", async () => {
    const r = await runAccountingPracticeWorkflow({
      agentId: "us-accounting-practice",
      userMessage: "What documents do I need for my tax return?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: failingExecuteTool(),
    });
    assert.doesNotMatch(r.assistantMessage, /Fetched with/i);
  });
});

describe("events-venue internal-note leak", () => {
  const knowledge = knowledgeFor("us-events-venue.agent.json");
  const tools = ["get_packages", "check_date_availability", "handoff_to_human"];

  it("get_packages knowledge fallback strips the leaked '`get_packages` returns this list' note", async () => {
    const r = await runEventsVenueWorkflow({
      agentId: "us-events-venue",
      userMessage: "What packages do you offer for a wedding?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: failingExecuteTool(),
    });
    assert.doesNotMatch(r.assistantMessage, /returns this list/i);
    assert.match(r.assistantMessage, /Classic wedding/i);
  });

  it("get_packages reply uses the tool's structured result when available", async () => {
    // Use a price/name absent from the real knowledge base so a match can only come from
    // the tool result, not a coincidental substring of the knowledge-dump fallback.
    const r = await runEventsVenueWorkflow({
      agentId: "us-events-venue",
      userMessage: "What packages do you offer for a wedding?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: async () => ({
        ok: true,
        data: { packages: [{ name: "Test Package Omega", capacity: "up to 40 guests", price_from: "$8675309" }] },
      }),
    });
    assert.match(r.assistantMessage, /Test Package Omega/);
    assert.match(r.assistantMessage, /\$8675309/);
  });
});

describe("gym-membership internal-note leak", () => {
  const knowledge = knowledgeFor("us-gym-membership.agent.json");
  const tools = ["get_plans", "handoff_to_human"];

  it("get_plans knowledge fallback strips the leaked '`get_plans` returns this same list' note", async () => {
    const r = await runGymMembershipWorkflow({
      agentId: "us-gym-membership",
      userMessage: "What membership plans do you have?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: failingExecuteTool(),
    });
    assert.doesNotMatch(r.assistantMessage, /returns this same list/i);
    assert.match(r.assistantMessage, /Standard/i);
  });

  it("get_plans reply uses the tool's structured result when available", async () => {
    const r = await runGymMembershipWorkflow({
      agentId: "us-gym-membership",
      userMessage: "What membership plans do you have?",
      messages: [],
      toolNames: tools,
      knowledge,
      executeTool: async () => ({
        ok: true,
        data: { plans: [{ name: "Standard", price: "$25/month", term: "month-to-month" }] },
      }),
    });
    assert.match(r.assistantMessage, /\$25\/month/);
  });
});
