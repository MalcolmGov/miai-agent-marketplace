import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAgenticCommerce,
  runAgenticCommerceWorkflow,
  parseAcWorkflowFromMessages,
} from "../dist/workflows/agentic-commerce.js";

function mockCommerceExecute(calls) {
  return async (name, args) => {
    calls.push({ name, args });
    if (name === "search_catalog") {
      return {
        ok: true,
        data: {
          results: [
            {
              sku: "SH-PEG-TR5",
              name: "Pegasus Trail 5 Running Shoes",
              price: 149.00,
              category: "apparel",
              in_stock: true,
              summary: "Responsive cushioning, all-terrain grip.",
            },
          ],
        },
      };
    }
    if (name === "check_inventory") {
      return {
        ok: true,
        data: {
          sku: args.sku,
          available: true,
          stock_count: 42,
          variant: args.variant || "10.5 US",
          dispatch_eta: "Ships in 24 hours",
        },
      };
    }
    if (name === "assemble_cart") {
      const promo = args.promo_code;
      const subtotal = 149.00;
      const discount = promo === "AGENTIC10" ? 14.90 : 0;
      const shipping = 9.00;
      const tax = Number(((subtotal - discount) * 0.0825).toFixed(2));
      const total = Number((subtotal - discount + shipping + tax).toFixed(2));
      return {
        ok: true,
        data: {
          cart_id: "CART-98214",
          line_items: [{ sku: "SH-PEG-TR5", quantity: 1, variant: "10.5 US", price: 149.00 }],
          subtotal,
          discount,
          shipping,
          tax,
          total,
          currency: "USD",
        },
      };
    }
    if (name === "generate_purchase_mandate") {
      return {
        ok: true,
        data: {
          mandate_id: "MND-AUTH-77291",
          cart_id: args.cart_id,
          total_amount: args.max_authorized_spend,
          network_token: "visa-network-token-4242",
          payment_method: "Visa Token Service (•••• 4242)",
          expires_at: "2026-10-01T00:00:00Z",
          consent_required: true,
        },
      };
    }
    if (name === "authorize_checkout") {
      return {
        ok: true,
        data: {
          order_id: "AC-8821",
          status: "confirmed",
          transaction_id: "txn_vts_88219934",
          mandate_id: args.mandate_id,
          idempotency_key: args.idempotency_key,
          total_paid: 154.51,
          currency: "USD",
          payment_token: "visa-token-••••-4242",
          carrier: "FedEx Priority",
          estimated_delivery: "3-5 business days",
          receipt_url: "https://receipts.miai.dev/order/AC-8821",
        },
      };
    }
    if (name === "track_order") {
      return {
        ok: true,
        data: {
          order_id: args.order_id,
          status: "in_transit",
          carrier: "FedEx Priority",
          tracking_number: "FX-9928172635",
          eta: "Thursday by 17:00",
          milestones: [{ status: "Dispatched from Warehouse", time: "Today 10:00" }],
        },
      };
    }
    if (name === "handoff_to_human") {
      return {
        ok: true,
        data: { status: "handed_off", ticket_id: "TKT-COMM-101" },
      };
    }
    return { ok: true, data: { status: "ok" } };
  };
}

describe("agentic-commerce workflow", () => {
  const tools = [
    "search_catalog",
    "check_inventory",
    "assemble_cart",
    "generate_purchase_mandate",
    "authorize_checkout",
    "track_order",
    "handoff_to_human",
  ];

  it("identifies agentic-commerce agents across regions", () => {
    assert.equal(isAgenticCommerce("agentic-commerce"), true);
    assert.equal(isAgenticCommerce("us-agentic-commerce"), true);
    assert.equal(isAgenticCommerce("eu-agentic-commerce"), true);
    assert.equal(isAgenticCommerce("asia-agentic-commerce"), true);
    assert.equal(isAgenticCommerce("africa-agentic-commerce"), true);
    assert.equal(isAgenticCommerce("latam-agentic-commerce"), true);
    assert.equal(isAgenticCommerce("us-customer-support"), false);
  });

  it("discovers products via search_catalog and check_inventory", async () => {
    const calls = [];
    const r = await runAgenticCommerceWorkflow({
      agentId: "agentic-commerce",
      userMessage: "Find running shoes under $160 in size 10.5 US and calculate delivery.",
      messages: [],
      toolNames: tools,
      executeTool: mockCommerceExecute(calls),
    });

    assert.equal(r.handled, true);
    assert.ok(calls.some((c) => c.name === "search_catalog"));
    assert.ok(calls.some((c) => c.name === "check_inventory"));
    assert.match(r.assistantMessage, /Pegasus Trail/i);
    assert.match(r.assistantMessage, /149/);
  });

  it("assembles cart, issues mandate, and enters proposed state for consent", async () => {
    const calls = [];
    const proposed = await runAgenticCommerceWorkflow({
      agentId: "agentic-commerce",
      userMessage: "Buy Pegasus Trail size 10.5 US with promo code AGENTIC10",
      messages: [],
      toolNames: tools,
      executeTool: mockCommerceExecute(calls),
    });

    assert.equal(proposed.handled, true);
    assert.equal(proposed.plan?.status, "proposed");
    assert.equal(proposed.plan?.kind, "checkout");
    assert.ok(calls.some((c) => c.name === "assemble_cart"));
    assert.ok(calls.some((c) => c.name === "generate_purchase_mandate"));
    assert.ok(!calls.some((c) => c.name === "authorize_checkout")); // NO charges yet

    // Message must detail breakdown, token method, and spend ceiling
    assert.match(proposed.assistantMessage, /Purchase Mandate Breakdown/i);
    assert.match(proposed.assistantMessage, /Visa Token Service/i);
    assert.match(proposed.assistantMessage, /Zero-PAN/i);

    // Consent gate: confirm and execute checkout
    const confirmCalls = [];
    const confirmed = await runAgenticCommerceWorkflow({
      agentId: "agentic-commerce",
      userMessage: "Yes, authorize purchase under mandate",
      messages: [{ role: "assistant", content: proposed.assistantMessage }],
      toolNames: tools,
      executeTool: mockCommerceExecute(confirmCalls),
    });

    assert.equal(confirmed.handled, true);
    assert.equal(confirmed.plan?.status, "completed");
    assert.ok(confirmCalls.some((c) => c.name === "authorize_checkout"));
    assert.match(confirmed.assistantMessage, /Order #AC-8821/);
    assert.match(confirmed.assistantMessage, /Visa Token Service/);
  });

  it("cancels proposed purchase mandate on user decline", async () => {
    const calls = [];
    const proposed = await runAgenticCommerceWorkflow({
      agentId: "agentic-commerce",
      userMessage: "Buy Pegasus Trail size 10.5 US",
      messages: [],
      toolNames: tools,
      executeTool: mockCommerceExecute(calls),
    });

    const cancelCalls = [];
    const cancelled = await runAgenticCommerceWorkflow({
      agentId: "agentic-commerce",
      userMessage: "Cancel order, never mind",
      messages: [{ role: "assistant", content: proposed.assistantMessage }],
      toolNames: tools,
      executeTool: mockCommerceExecute(cancelCalls),
    });

    assert.equal(cancelled.handled, true);
    assert.equal(cancelled.plan?.status, "cancelled");
    assert.equal(cancelCalls.length, 0); // No tools called on cancel
    assert.match(cancelled.assistantMessage, /Purchase mandate cancelled/i);
  });

  it("enforces strict Zero-PAN policy and rejects raw card numbers", async () => {
    const calls = [];
    const r = await runAgenticCommerceWorkflow({
      agentId: "agentic-commerce",
      userMessage: "Charge my card 4111222233334444 cvv 123",
      messages: [],
      toolNames: tools,
      executeTool: mockCommerceExecute(calls),
    });

    assert.equal(r.handled, true);
    assert.equal(calls.length, 0); // Must not invoke any backend tools with raw PAN
    assert.match(r.assistantMessage, /PCI-DSS standards/i);
    assert.match(r.assistantMessage, /never share raw 16-digit card numbers/i);
  });

  it("tracks live parcel shipments via track_order", async () => {
    const calls = [];
    const r = await runAgenticCommerceWorkflow({
      agentId: "agentic-commerce",
      userMessage: "Where is my order AC-8821?",
      messages: [],
      toolNames: tools,
      executeTool: mockCommerceExecute(calls),
    });

    assert.equal(r.handled, true);
    assert.ok(calls.some((c) => c.name === "track_order" && c.args.order_id === "AC-8821"));
    assert.match(r.assistantMessage, /Order Tracking: #AC-8821/);
    assert.match(r.assistantMessage, /FedEx Priority/);
    assert.match(r.assistantMessage, /IN TRANSIT/);
  });

  it("hands off bulk orders or payment disputes to merchant customer service", async () => {
    const calls = [];
    const r = await runAgenticCommerceWorkflow({
      agentId: "agentic-commerce",
      userMessage: "I need to talk to merchant customer service for a bulk order of 50 monitors.",
      messages: [],
      toolNames: tools,
      executeTool: mockCommerceExecute(calls),
    });

    assert.equal(r.handled, true);
    assert.ok(calls.some((c) => c.name === "handoff_to_human"));
    assert.match(r.assistantMessage, /connected you to merchant customer service/i);
  });
});
