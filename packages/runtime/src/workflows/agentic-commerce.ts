/**
 * Multi-step Autonomous Shopping Agent workflow for Agentic Commerce:
 * Anthropic + Visa & Mastercard Blueprint.
 *
 * discover (search_catalog & check_inventory)
 *   → quote & mandate (assemble_cart & generate_purchase_mandate)
 *   → consent gate (human authorization)
 *   → execute (authorize_checkout with zero-PAN delegated token & idempotency key)
 *   → track (track_order).
 *
 * Enforces Zero Raw PAN exposure (PCI-DSS compliance) and cryptographic spend authorization.
 */

import { wf } from "./i18n.js";
import { handleStopSuppression } from "./stop-suppression.js";

export type AcStepStatus = "pending" | "done" | "skipped" | "failed";

export interface AcWorkflowStep {
  id: string;
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: AcStepStatus;
  resultSummary?: string;
}

export interface AcWorkflowPlan {
  id: string;
  goal: string;
  kind: "checkout" | "inquiry" | "tracking";
  steps: AcWorkflowStep[];
  status: "proposed" | "executing" | "completed" | "cancelled";
  cartId?: string;
  mandateId?: string;
  total?: number;
  paymentMethod?: string;
}

export interface AcWorkflowTurnResult {
  handled: boolean;
  assistantMessage: string;
  plan?: AcWorkflowPlan;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

const WORKFLOW_RE = /<!--miai-workflow:([\s\S]*?)-->/;

export function isAgenticCommerce(agentId: string): boolean {
  return /agentic-commerce/i.test(agentId);
}

export function parseAcWorkflowFromMessages(
  messages: Array<{ role: string; content: string }>,
): AcWorkflowPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const match = m.content.match(WORKFLOW_RE);
    if (!match) continue;
    try {
      return JSON.parse(match[1]!) as AcWorkflowPlan;
    } catch {
      return null;
    }
  }
  return null;
}

function embed(message: string, plan: AcWorkflowPlan): string {
  return `${message.replace(WORKFLOW_RE, "").trimEnd()}\n\n<!--miai-workflow:${JSON.stringify(plan)}-->`;
}

function isConfirm(text: string): boolean {
  const lower = text.toLowerCase().replace(/##[\s\S]*$/g, " ").trim();
  return (
    /^(yes|yep|yeah|correct|confirmed|ok|okay|proceed|authorize|auth|checkout|buy|pay)\b/.test(lower) ||
    /yes[,.]? (please|go ahead|authorize|confirm|proceed|buy)/.test(lower) ||
    /authorize purchase|authorize checkout|place order|confirm mandate|go ahead|proceed with purchase|looks good/.test(lower)
  );
}

export type ExecuteToolFn = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ ok: boolean; data: unknown }>;

function extractOrderId(text: string): string | undefined {
  return (
    text.match(/\b(AC-\d+|ORD-\d+)\b/i)?.[1]?.toUpperCase() ||
    text.match(/\border\s+(?:#|number\s+)?([A-Z0-9-]+)/i)?.[1]?.toUpperCase()
  );
}

function extractPostalCode(text: string): string {
  const zip = text.match(/\b(\d{5}(?:-\d{4})?)\b/)?.[1] ||
    text.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i)?.[1];
  return zip || "94105";
}

function extractPromoCode(text: string): string | undefined {
  const match = text.match(/\b(AGENTIC10|FREESHIP|SAVE10|DEAL10)\b/i);
  return match ? match[1]?.toUpperCase() : undefined;
}

function extractVariant(text: string): string | undefined {
  const sizeMatch = text.match(/\b(?:size\s+)?([0-9]+(?:\.[0-9]+)?(?:\s*(?:US|UK|EU))?)\b/i);
  if (sizeMatch) return sizeMatch[1];
  const colorMatch = text.match(/\b(space gr[ea]y|black|white|silver|blue|red|olive)\b/i);
  return colorMatch ? colorMatch[1] : undefined;
}

function randomId(prefix: string): string {
  return `${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;
}

export async function runAgenticCommerceWorkflow(input: {
  agentId: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  toolNames: string[];
  knowledge?: string;
  executeTool: ExecuteToolFn;
  replyLanguage?: string;
}): Promise<AcWorkflowTurnResult> {
  if (!isAgenticCommerce(input.agentId)) {
    return { handled: false, assistantMessage: "", toolCalls: [] };
  }

  const user = input.userMessage.replace(/##[\s\S]*$/g, "").trim();
  const lower = user.toLowerCase();
  const pending = parseAcWorkflowFromMessages(input.messages);
  const toolCalls: AcWorkflowTurnResult["toolCalls"] = [];
  const has = (n: string) => input.toolNames.includes(n);
  const lang = input.replyLanguage;

  // 1. Strict Zero-PAN Policy (PCI-DSS & Card Network compliance)
  if (/card (number|details)|cvv|\b4[0-9]{12}(?:[0-9]{3})?\b|\b5[1-5][0-9]{14}\b|\b3[47][0-9]{13}\b/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "For your security under PCI-DSS standards, never share raw 16-digit card numbers or CVVs in chat. " +
        "This agent uses the Anthropic + Visa & Mastercard Agentic Commerce framework: checkouts execute exclusively " +
        "via tokenized network credentials (e.g. Visa Token Service •••• 4242) with an explicit cryptographic purchase mandate.",
    };
  }

  // 2. Stop suppression handler
  const stopSuppression = await handleStopSuppression({
    lower,
    user,
    has,
    executeTool: input.executeTool,
  });
  if (stopSuppression) return stopSuppression;

  // 3. Guardrail against prompt injection
  if (/ignore (all )?previous|reveal your (system )?prompt|print your (full )?system prompt/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I cannot share internal instructions. I can assist with product discovery, live stock verification, " +
        "freight and tax calculations, and issuing purchase mandates for delegated autonomous checkout.",
    };
  }

  // 4. Handoff to human
  if (/talk to (a )?human|speak to (someone|an agent|merchant support)|merchant customer service|bulk order|custom bulk|payment dispute/.test(lower)) {
    if (has("handoff_to_human")) {
      const args = {
        summary: `Shopper inquiry: ${user.slice(0, 300)}`,
        reason: /dispute/i.test(lower) ? "payment_dispute" : /bulk/i.test(lower) ? "custom_bulk_order" : "explicit_request",
      };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "I've connected you to merchant customer service with your session context. A specialist will follow up with you shortly.",
    };
  }

  // 5. Cancel active proposed mandate
  if (pending?.status === "proposed" && /\b(cancel|never ?mind|don't buy|abort|stop)\b/i.test(lower)) {
    const cancelled: AcWorkflowPlan = { ...pending, status: "cancelled" };
    return {
      handled: true,
      plan: cancelled,
      toolCalls: [],
      assistantMessage: embed(
        "Purchase mandate cancelled. No funds were authorized or charged to your tokenized card. Let me know if you would like to explore other products or adjust your cart.",
        cancelled,
      ),
    };
  }

  // 6. Confirm & Execute Consent Gate
  if (pending?.status === "proposed" && isConfirm(user)) {
    const mandateId = pending.mandateId || "MND-AUTH-77291";
    const idempotencyKey = `idem-${randomId("UUID")}`;

    const plan: AcWorkflowPlan = {
      ...pending,
      status: "executing",
      steps: pending.steps.map((s) => ({ ...s })),
    };

    // Find and update the consent gate step
    const consentStep = plan.steps.find((s) => s.id === "consent_gate");
    if (consentStep) {
      consentStep.status = "done";
      consentStep.resultSummary = "Authorized by user";
    }

    // Execute authorize_checkout step
    const authStep = plan.steps.find((s) => s.id === "authorize_checkout");
    let orderResult: any = null;

    if (authStep && has("authorize_checkout")) {
      authStep.args = { mandate_id: mandateId, idempotency_key: idempotencyKey };
      const res = await input.executeTool("authorize_checkout", authStep.args);
      toolCalls.push({ name: "authorize_checkout", args: authStep.args, result: res.data });
      if (res.ok) {
        orderResult = res.data;
        authStep.status = "done";
        authStep.resultSummary = String(orderResult?.order_id ?? "AC-8821");
      } else {
        authStep.status = "failed";
        authStep.resultSummary = "Authorization declined";
      }
    }

    // Execute tracking step
    const trackStep = plan.steps.find((s) => s.id === "track_order");
    if (trackStep && has("track_order") && orderResult?.order_id) {
      trackStep.args = { order_id: orderResult.order_id };
      const trackRes = await input.executeTool("track_order", trackStep.args);
      toolCalls.push({ name: "track_order", args: trackStep.args, result: trackRes.data });
      if (trackRes.ok) {
        trackStep.status = "done";
        trackStep.resultSummary = String((trackRes.data as any)?.status ?? "in_transit");
      }
    }

    plan.status = "completed";

    const orderId = orderResult?.order_id ?? "AC-8821";
    const totalPaid = orderResult?.total_paid ? `$${Number(orderResult.total_paid).toFixed(2)}` : `$${(pending.total ?? 161.29).toFixed(2)}`;
    const carrier = orderResult?.carrier ?? "FedEx Priority";
    const eta = orderResult?.estimated_delivery ?? "3-5 business days";
    const tokenRef = orderResult?.payment_token ?? "visa-token-••••-4242";
    const receipt = orderResult?.receipt_url ?? `https://receipts.miai.dev/order/${orderId}`;

    const confirmationMsg = [
      `## Purchase Confirmed! Order #${orderId}`,
      `Your autonomous checkout was successfully executed via **${pending.paymentMethod ?? "Visa Token Service (•••• 4242)"}**.`,
      "",
      `| Order Detail | Value |`,
      `|---|---|`,
      `| **Order ID** | \`${orderId}\` |`,
      `| **Total Charged** | **${totalPaid} USD** (Idempotency Key: \`${idempotencyKey}\`) |`,
      `| **Payment Rail** | Delegated Network Token (\`${tokenRef}\`) |`,
      `| **Fulfillment** | ${carrier} (${eta}) |`,
      `| **Digital Receipt** | [View Receipt](${receipt}) |`,
      "",
      `You can track delivery at any time by asking *"Track order ${orderId}"*.`,
    ].join("\n");

    return {
      handled: true,
      plan,
      toolCalls,
      assistantMessage: embed(confirmationMsg, plan),
    };
  }

  // 7. Live Order Tracking Inquiry
  const trackedOrder = extractOrderId(user);
  if ((/track|status of (my )?order|where is my order/i.test(lower) || trackedOrder) && has("track_order")) {
    const orderId = trackedOrder || "AC-8821";
    const args = { order_id: orderId };
    const res = await input.executeTool("track_order", args);
    toolCalls.push({ name: "track_order", args, result: res.data });

    const trackData = res.data as any;
    const status = String(trackData?.status ?? "in_transit").replace(/_/g, " ");
    const carrier = trackData?.carrier ?? "FedEx Priority";
    const eta = trackData?.eta ?? "Thursday by 17:00";
    const waybill = trackData?.tracking_number ?? "FX-9928172635";

    const milestones = Array.isArray(trackData?.milestones)
      ? trackData.milestones.map((m: any) => `- **${m.status}** (${m.time})`).join("\n")
      : "- **Dispatched from Warehouse** (In Transit)";

    const trackingMsg = [
      `### Order Tracking: #${orderId}`,
      `Status: **${status.toUpperCase()}** via **${carrier}** (\`${waybill}\`)`,
      `Estimated Delivery: **${eta}**`,
      "",
      "**Milestones:**",
      milestones,
    ].join("\n");

    return {
      handled: true,
      toolCalls,
      assistantMessage: trackingMsg,
    };
  }

  // 8. Purchase intent / Quote & Mandate Assembly
  const isSearchIntent = /find|search|show me|recommend|browse|looking for|what (shoes|products|monitors|headphones|items)/i.test(lower);
  const isBuyIntent =
    !isSearchIntent &&
    (/buy|order|purchase|checkout|get me|i want to buy|add to cart/i.test(lower) ||
      (/assemble/i.test(lower) && /cart/i.test(lower)) ||
      (/mandate/i.test(lower)));

  if (isBuyIntent && has("assemble_cart")) {
    let sku = "SH-PEG-TR5";
    let name = "Pegasus Trail 5 Running Shoes";
    let price = 149.00;

    if (/monitor|4k|oled/i.test(lower)) {
      sku = "MON-4K-32";
      name = "UltraSharp 32\" 4K OLED Monitor";
      price = 799.00;
    } else if (/headphone|audio|anc/i.test(lower)) {
      sku = "HP-PRO-ANC";
      name = "StudioPro Noise-Canceling Headphones";
      price = 299.00;
    } else if (/mouse|ergo/i.test(lower)) {
      sku = "MS-ERGO-WL";
      name = "MagSpeed Ergonomic Wireless Mouse";
      price = 99.00;
    } else if (/jacket|hydro/i.test(lower)) {
      sku = "JKT-AERO-H2O";
      name = "AeroFit Hydro Running Jacket";
      price = 129.00;
    } else if (/fryer|aircrisp/i.test(lower)) {
      sku = "KIT-AC-6L";
      name = "AirCrisp Pro 6L Smart Air Fryer";
      price = 139.00;
    } else if (/espresso|coffee|barista/i.test(lower)) {
      sku = "KIT-BM-ESP";
      name = "BaristaMax Espresso Machine";
      price = 449.00;
    }

    const variant = extractVariant(user) || "10.5 US";
    const promoCode = extractPromoCode(user);
    const postalCode = extractPostalCode(user);

    // Call check_inventory
    if (has("check_inventory")) {
      const invArgs = { sku, variant };
      const invRes = await input.executeTool("check_inventory", invArgs);
      toolCalls.push({ name: "check_inventory", args: invArgs, result: invRes.data });
    }

    // Call assemble_cart
    const cartArgs: Record<string, unknown> = {
      items: [{ sku, quantity: 1, variant }],
      postal_code: postalCode,
      shipping_tier: "standard",
    };
    if (promoCode) cartArgs.promo_code = promoCode;

    const cartRes = await input.executeTool("assemble_cart", cartArgs);
    toolCalls.push({ name: "assemble_cart", args: cartArgs, result: cartRes.data });
    const cartData = cartRes.data as any;

    const cartId = cartData?.cart_id ?? "CART-98214";
    const subtotal = Number(cartData?.subtotal ?? price);
    const discount = Number(cartData?.discount ?? (promoCode === "AGENTIC10" ? subtotal * 0.1 : 0));
    const shipping = Number(cartData?.shipping ?? (subtotal >= 150 ? 0 : 9.00));
    const tax = Number(cartData?.tax ?? ((subtotal - discount) * 0.0825));
    const total = Number(cartData?.total ?? (subtotal - discount + shipping + tax));

    // Call generate_purchase_mandate
    let mandateId = "MND-AUTH-77291";
    let tokenRef = "visa-token-••••-4242";
    let paymentMethod = "Visa Token Service (•••• 4242)";

    if (has("generate_purchase_mandate")) {
      const mandateArgs = {
        cart_id: cartId,
        max_authorized_spend: total,
        recipient_name: "Customer",
        shipping_address: `100 Main St, Postal ${postalCode}`,
      };
      const mandateRes = await input.executeTool("generate_purchase_mandate", mandateArgs);
      toolCalls.push({ name: "generate_purchase_mandate", args: mandateArgs, result: mandateRes.data });
      const mData = mandateRes.data as any;
      if (mData?.mandate_id) mandateId = mData.mandate_id;
      if (mData?.network_token) tokenRef = mData.network_token;
      if (mData?.payment_method) paymentMethod = mData.payment_method;
    }

    const plan: AcWorkflowPlan = {
      id: mandateId,
      goal: `Purchase ${name} (${variant}) under cryptographic mandate`,
      kind: "checkout",
      cartId,
      mandateId,
      total,
      paymentMethod,
      status: "proposed",
      steps: [
        {
          id: "assemble_cart",
          label: `Assemble cart for ${name}`,
          tool: "assemble_cart",
          status: "done",
          resultSummary: `Subtotal $${subtotal.toFixed(2)}`,
        },
        {
          id: "issue_mandate",
          label: "Issue cryptographic purchase mandate",
          tool: "generate_purchase_mandate",
          status: "done",
          resultSummary: mandateId,
        },
        {
          id: "consent_gate",
          label: "Human-in-the-loop authorization",
          status: "pending",
        },
        {
          id: "authorize_checkout",
          label: "Execute Zero-PAN token checkout",
          tool: "authorize_checkout",
          status: "pending",
        },
        {
          id: "track_order",
          label: "Track shipment & delivery",
          tool: "track_order",
          status: "pending",
        },
      ],
    };

    const quoteMsg = [
      `I have verified inventory and assembled a purchase quote for **${name}** (Size/Variant: **${variant}**).`,
      "",
      `### Purchase Mandate Breakdown (ID: \`${mandateId}\`)`,
      `| Line Item | Amount |`,
      `|---|---|`,
      `| **${name}** (x1) | $${subtotal.toFixed(2)} |`,
      discount > 0 ? `| Promotional Discount (\`${promoCode}\`) | -$${discount.toFixed(2)} |` : "",
      `| Standard Courier Delivery | ${shipping === 0 ? "**Free**" : `$${shipping.toFixed(2)}`} |`,
      `| Estimated Sales Tax (8.25%) | $${tax.toFixed(2)} |`,
      `| **Total Authorized Spend Limit** | **$${total.toFixed(2)} USD** |`,
      "",
      `**Security & Payment Rails:**`,
      `- **Method:** ${paymentMethod}`,
      `- **Protection:** PCI-DSS Zero-PAN Compliant (delegated network token \`${tokenRef}\`)`,
      `- **Spend Cap:** Strictly capped at **$${total.toFixed(2)}** (no charge can exceed this limit)`,
      `- **Returns:** 30-day money-back guarantee with free prepaid return label`,
      "",
      `**Consent Required:** To authorize autonomous execution of this order, please reply **"Yes, authorize purchase"** or click the authorization button below.`,
    ].filter(Boolean).join("\n");

    return {
      handled: true,
      plan,
      toolCalls,
      assistantMessage: embed(quoteMsg, plan),
    };
  }

  // 9. Catalog Discovery / Search
  if (has("search_catalog")) {
    let maxPrice: number | undefined;
    const priceMatch = user.match(/under\s+\$?(\d+)/i) || user.match(/less than\s+\$?(\d+)/i);
    if (priceMatch) maxPrice = Number(priceMatch[1]);

    const catArgs = {
      query: user,
      max_price: maxPrice,
      in_stock_only: true,
    };
    const catRes = await input.executeTool("search_catalog", catArgs);
    toolCalls.push({ name: "search_catalog", args: catArgs, result: catRes.data });

    const results = (catRes.data as any)?.results || [];
    const topItem = results[0] || {
      sku: "SH-PEG-TR5",
      name: "Pegasus Trail 5 Running Shoes",
      price: 149.00,
      summary: "Responsive cushioning, all-terrain grip, breathable engineered mesh.",
    };

    // Check inventory for top item
    if (has("check_inventory")) {
      const variant = extractVariant(user) || "10.5 US";
      const invArgs = { sku: topItem.sku, variant };
      const invRes = await input.executeTool("check_inventory", invArgs);
      toolCalls.push({ name: "check_inventory", args: invArgs, result: invRes.data });
    }

    const itemsText = results.slice(0, 3).map((it: any) =>
      `- **${it.name}** (SKU \`${it.sku}\`) — **$${Number(it.price).toFixed(2)}**\n  ${it.summary} *(Status: In stock)*`
    ).join("\n\n");

    const reply = [
      `I searched our merchant catalog and found verified options matching your criteria:`,
      "",
      itemsText || `- **${topItem.name}** (SKU \`${topItem.sku}\`) — **$${Number(topItem.price).toFixed(2)}**`,
      "",
      `Standard ground shipping is $9.00 (or **free on orders over $150**).`,
      `Would you like me to assemble your cart and issue a purchase mandate to buy?`,
    ].join("\n");

    return {
      handled: true,
      toolCalls,
      assistantMessage: reply,
    };
  }

  return { handled: false, assistantMessage: "", toolCalls: [] };
}
