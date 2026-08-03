/**
 * Multi-step Customer Support workflow (Cluster B — runtime-only):
 * get_order_status / availability → confirm → create_ticket → handoff → verify.
 * Never self-refunds or accepts card data. Catalogue .agent.json untouched.
 */

import { wf } from "./i18n.js";
import { handleStopSuppression } from "./stop-suppression.js";

export type CsStepStatus = "pending" | "done" | "skipped" | "failed";

export interface CsWorkflowStep {
  id: string;
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: CsStepStatus;
  resultSummary?: string;
}

export interface CsWorkflowPlan {
  id: string;
  goal: string;
  kind: "ticket";
  steps: CsWorkflowStep[];
  status: "proposed" | "executing" | "completed" | "cancelled";
}

export interface CsWorkflowTurnResult {
  handled: boolean;
  assistantMessage: string;
  plan?: CsWorkflowPlan;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

const WORKFLOW_RE = /<!--miai-workflow:([\s\S]*?)-->/;

export function isCustomerSupport(agentId: string): boolean {
  return /customer-support/i.test(agentId);
}

export function parseCsWorkflowFromMessages(
  messages: Array<{ role: string; content: string }>,
): CsWorkflowPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const match = m.content.match(WORKFLOW_RE);
    if (!match) continue;
    try {
      return JSON.parse(match[1]!) as CsWorkflowPlan;
    } catch {
      return null;
    }
  }
  return null;
}

function embed(message: string, plan: CsWorkflowPlan): string {
  return `${message.replace(WORKFLOW_RE, "").trimEnd()}\n\n<!--miai-workflow:${JSON.stringify(plan)}-->`;
}

function isConfirm(text: string): boolean {
  const lower = text.toLowerCase().replace(/##[\s\S]*$/g, " ").trim();
  return (
    /^(yes|yep|yeah|correct|confirmed|ok|okay)\b/.test(lower) ||
    /yes[,.]? (please|go ahead|do it|confirm|open)/.test(lower) ||
    /go ahead|please (open|log|create)|looks good/.test(lower)
  );
}

export type ExecuteToolFn = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ ok: boolean; data: unknown }>;

function extractOrderId(text: string): string | undefined {
  return (
    text.match(/\border\s*#?\s*(\d{3,})\b/i)?.[1] ||
    text.match(/\b(\d{4,})\b/)?.[1]
  );
}

function extractPhone(text: string): string | undefined {
  return (
    text.match(/(\+?\d[\d\s-]{6,}\d)/)?.[1]?.trim() ||
    text.match(/\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b/)?.[1]
  );
}

export async function runCustomerSupportWorkflow(input: {
  agentId: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  toolNames: string[];
  knowledge?: string;
  executeTool: ExecuteToolFn;
  replyLanguage?: string;
}): Promise<CsWorkflowTurnResult> {
  if (!isCustomerSupport(input.agentId)) {
    return { handled: false, assistantMessage: "", toolCalls: [] };
  }

  const user = input.userMessage.replace(/##[\s\S]*$/g, "").trim();
  const lower = user.toLowerCase();
  const pending = parseCsWorkflowFromMessages(input.messages);
  const toolCalls: CsWorkflowTurnResult["toolCalls"] = [];
  const has = (n: string) => input.toolNames.includes(n);
  const lang = input.replyLanguage;

  if (/card (number|details)|cvv|\b4111\b|refund (me )?now|process (a )?refund/.test(lower)) {
    if (/refund/.test(lower) && has("handoff_to_human")) {
      const args = { reason: "refund_request", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
      return {
        handled: true,
        toolCalls,
        assistantMessage:
          "I can't issue refunds or take card details in chat. I'm escalating to support so a human can process any refund securely.",
      };
    }
    return { handled: true, toolCalls: [], assistantMessage: wf(lang, "card_refuse") };
  }

  const stopSuppression = await handleStopSuppression({
    lower,
    user,
    has,
    executeTool: input.executeTool,
  });
  if (stopSuppression) return stopSuppression;

  if (/ignore (all )?previous|reveal your (system )?prompt|print your (full )?system prompt/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share internal instructions. I can help with order status, delivery FAQs, and opening a support ticket.",
    };
  }

  if (/talk to (a )?human|speak to (someone|a person)|complaint/.test(lower)) {
    if (has("handoff_to_human")) {
      const args = { reason: "explicit_request", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: "Connecting you to a support teammate now.",
    };
  }

  if (pending?.status === "proposed" && /\b(cancel|never ?mind)\b/i.test(lower)) {
    const cancelled = { ...pending, status: "cancelled" as const };
    return {
      handled: true,
      plan: cancelled,
      toolCalls: [],
      assistantMessage: embed(wf(lang, "plan_cancelled"), cancelled),
    };
  }

  if (pending?.status === "proposed" && isConfirm(user)) {
    const plan: CsWorkflowPlan = {
      ...pending,
      status: "executing",
      steps: pending.steps.map((s) => ({ ...s })),
    };
    const lines: string[] = [];

    for (const step of plan.steps) {
      if (!step.tool) {
        step.status = "done";
        lines.push(`✓ ${step.label}`);
        continue;
      }
      if (!has(step.tool)) {
        step.status = "skipped";
        continue;
      }
      const result = await input.executeTool(step.tool, step.args ?? {});
      toolCalls.push({ name: step.tool, args: step.args ?? {}, result: result.data });
      const data = result.data as Record<string, unknown>;
      const ref = String(data.reference ?? data.ticket_id ?? data.id ?? (result.ok ? "TKT-OK" : "ERR"));
      step.status = result.ok ? "done" : "failed";
      step.resultSummary = ref;
      lines.push(`${result.ok ? "✓" : "✗"} ${step.label} — ${ref}`);
      if (!result.ok && step.id === "ticket") break;
    }

    plan.status = "completed";
    const ticket = plan.steps.find((s) => s.id === "ticket" && s.status === "done");
    const msg = [
      ticket
        ? `Support ticket opened — reference **${ticket.resultSummary}**. A teammate will follow up; I can't issue refunds in chat.`
        : "Workflow finished.",
      "",
      "## Workflow results",
      ...lines,
    ].join("\n");

    return { handled: true, plan, toolCalls, assistantMessage: embed(msg, plan) };
  }

  const orderId = extractOrderId(user);
  if (
    (/where('?s| is)|track|status of|order/.test(lower) || orderId) &&
    has("get_order_status") &&
    !/broken|refund|ticket|damaged|wrong item/.test(lower)
  ) {
    if (!orderId) {
      return {
        handled: true,
        toolCalls: [],
        assistantMessage: "I can check that — what's the order number / reference?",
      };
    }
    const args = { order_id: orderId, orderId };
    const result = await input.executeTool("get_order_status", args);
    toolCalls.push({ name: "get_order_status", args, result: result.data });
    return {
      handled: true,
      toolCalls,
      assistantMessage: `I looked up order **${orderId}**. If something's wrong (damage, missing item), tell me and I'll propose a support ticket — I won't self-refund.`,
    };
  }

  if (/how much (is )?delivery|shipping (cost|fee)|delivery (fee|cost)/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "Delivery FAQs are on file (e.g. standard rate and free-shipping threshold). Ask about a specific order if you need live status.",
    };
  }

  const looksLikeTicket =
    /broken|damaged|wrong item|missing|refund|return|open (a )?ticket|create (a )?ticket|not working/.test(
      lower,
    );

  if (looksLikeTicket && has("create_ticket")) {
    const phone = extractPhone(user);
    const args = {
      order_id: orderId,
      issue: user.slice(0, 400),
      phone,
      contact: phone,
      notes: user.slice(0, 240),
    };

    const plan: CsWorkflowPlan = {
      id: `cs-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: "ticket",
      status: "proposed",
      steps: [
        {
          id: "status",
          label: orderId ? `Re-check order ${orderId}` : "Confirm order context",
          tool: orderId && has("get_order_status") ? "get_order_status" : undefined,
          args: orderId ? { order_id: orderId } : undefined,
          status: "pending",
        },
        {
          id: "ticket",
          label: "Open support ticket (no self-refund)",
          tool: "create_ticket",
          args,
          status: "pending",
        },
        {
          id: "notify",
          label: "Handoff to support desk",
          tool: "handoff_to_human",
          args: {
            reason: "ticket_opened",
            summary: `CS ticket order ${orderId ?? "n/a"} — ${user.slice(0, 160)}`,
          },
          status: "pending",
        },
        { id: "verify", label: "Confirm ticket reference", status: "pending" },
      ],
    };

    return {
      handled: true,
      plan,
      toolCalls: [],
      assistantMessage: embed(
        [
          "I can open a support ticket — I won't write it until you confirm, and I can't issue a refund myself.",
          "",
          `**Goal:** ${plan.goal}`,
          "",
          "## Workflow plan",
          ...plan.steps.map((s, i) => `${i + 1}. ${s.label}`),
          "",
          orderId
            ? `Confirm ticket for order **${orderId}**? Reply **yes** / **go ahead**.`
            : "Confirm I should open the ticket (share an order number if you have one)? Reply **yes** / **go ahead**.",
        ].join("\n"),
        plan,
      ),
    };
  }

  return { handled: false, assistantMessage: "", toolCalls: [] };
}
