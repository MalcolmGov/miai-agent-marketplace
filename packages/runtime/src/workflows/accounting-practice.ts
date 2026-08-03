/**
 * Multi-step Accounting Practice workflow:
 * deadlines/docs → confirm → capture_onboarding → notify → verify.
 * Tax judgement / advice → CPA handoff (never invent liabilities).
 */

import { wf } from "./i18n.js";
import { handleStopSuppression } from "./stop-suppression.js";

export type ApStepStatus = "pending" | "done" | "skipped" | "failed";

export interface ApWorkflowStep {
  id: string;
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: ApStepStatus;
  resultSummary?: string;
}

export interface ApWorkflowPlan {
  id: string;
  goal: string;
  kind: "onboarding";
  steps: ApWorkflowStep[];
  status: "proposed" | "executing" | "completed" | "cancelled";
}

export interface ApWorkflowTurnResult {
  handled: boolean;
  assistantMessage: string;
  plan?: ApWorkflowPlan;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

const WORKFLOW_RE = /<!--miai-workflow:([\s\S]*?)-->/;

export function isAccountingPractice(agentId: string): boolean {
  return /accounting-practice/i.test(agentId);
}

export function parseApWorkflowFromMessages(
  messages: Array<{ role: string; content: string }>,
): ApWorkflowPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const match = m.content.match(WORKFLOW_RE);
    if (!match) continue;
    try {
      return JSON.parse(match[1]!) as ApWorkflowPlan;
    } catch {
      return null;
    }
  }
  return null;
}

function embed(message: string, plan: ApWorkflowPlan): string {
  return `${message.replace(WORKFLOW_RE, "").trimEnd()}\n\n<!--miai-workflow:${JSON.stringify(plan)}-->`;
}

function isConfirm(text: string): boolean {
  const lower = text.toLowerCase().replace(/##[\s\S]*$/g, " ").trim();
  return (
    /^(yes|yep|yeah|correct|confirmed|ok|okay)\b/.test(lower) ||
    /yes[,.]? (please|go ahead|do it|confirm|sign)/.test(lower) ||
    /go ahead|please (sign|capture|continue)|looks good/.test(lower)
  );
}

export type ExecuteToolFn = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ ok: boolean; data: unknown }>;

function section(knowledge: string | undefined, heading: RegExp): string {
  if (!knowledge) return "";
  return knowledge.match(heading)?.[0]?.slice(0, 1400) ?? "";
}

function extractPhone(text: string): string | undefined {
  return (
    text.match(/(\+?\d[\d\s-]{6,}\d)/)?.[1]?.trim() ||
    text.match(/\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b/)?.[1] ||
    text.match(/\b(555[-.]?\d{4})\b/)?.[1]
  );
}

function extractName(text: string): string | undefined {
  return (
    text.match(/Name'?s\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1] ||
    text.match(/I'?m\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1] ||
    text.match(/—\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*,/)?.[1]
  );
}

export async function runAccountingPracticeWorkflow(input: {
  agentId: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  toolNames: string[];
  knowledge?: string;
  executeTool: ExecuteToolFn;
  replyLanguage?: string;
}): Promise<ApWorkflowTurnResult> {
  if (!isAccountingPractice(input.agentId)) {
    return { handled: false, assistantMessage: "", toolCalls: [] };
  }

  const user = input.userMessage.replace(/##[\s\S]*$/g, "").trim();
  const lower = user.toLowerCase();
  const pending = parseApWorkflowFromMessages(input.messages);
  const toolCalls: ApWorkflowTurnResult["toolCalls"] = [];
  const has = (n: string) => input.toolNames.includes(n);
  const lang = input.replyLanguage;

  if (
    /how much tax will i owe|what (should|do) i (owe|claim)|deduct .*salary|tax advice|am i (under|over).?paying|optimise my tax|optimize my tax/.test(
      lower,
    )
  ) {
    if (has("handoff_to_human")) {
      const args = { reason: "tax_advice", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "I can't give personal tax advice or estimate what *you* owe — that needs a CPA. I'm connecting you to the practice; I can still share general filing deadlines and document checklists.",
    };
  }

  if (/card (number|details)|cvv|\b4111\b/.test(lower)) {
    return { handled: true, toolCalls: [], assistantMessage: wf(lang, "card_refuse") };
  }

  if (/another client|someone else'?s (return|books)|my (spouse|partner)'?s tax/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't look up another client's books or returns — that's confidential. I can only help with your own enquiry.",
    };
  }

  const stopSuppression = await handleStopSuppression({
    lower,
    user,
    has,
    executeTool: input.executeTool,
    assistantMessage:
      "Understood — STOP acknowledged. You won't receive marketing texts; I'm handing off so suppression is completed.",
  });
  if (stopSuppression) return stopSuppression;

  if (/ignore (all )?previous|reveal your (system )?prompt|print your (full )?system prompt/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share internal instructions. I can help with general deadlines, document checklists, and new-client intake.",
    };
  }

  if (/talk to (a )?(human|cpa|accountant)|speak to (someone|a partner)/.test(lower)) {
    if (has("handoff_to_human")) {
      const args = { reason: "explicit_request", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: "Connecting you to the practice team now.",
    };
  }

  if (pending?.status === "proposed" && /\b(cancel|never ?mind|stop)\b/i.test(lower)) {
    const cancelled = { ...pending, status: "cancelled" as const };
    return {
      handled: true,
      plan: cancelled,
      toolCalls: [],
      assistantMessage: embed(wf(lang, "plan_cancelled"), cancelled),
    };
  }

  if (pending?.status === "proposed" && isConfirm(user)) {
    const plan: ApWorkflowPlan = {
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
      const ref = String(data.reference ?? data.id ?? data.lead_id ?? (result.ok ? "ONB-OK" : "ERR"));
      step.status = result.ok ? "done" : "failed";
      step.resultSummary = ref;
      lines.push(`${result.ok ? "✓" : "✗"} ${step.label} — ${ref}`);
      if (!result.ok && step.id === "capture") break;
    }

    plan.status = "completed";
    const cap = plan.steps.find((s) => s.id === "capture" && s.status === "done");
    const msg = [
      cap
        ? `Onboarding intake captured — reference **${cap.resultSummary}**. A team member will follow up; this is not a signed engagement yet.`
        : "Workflow finished.",
      "",
      "## Workflow results",
      ...lines,
    ].join("\n");

    return { handled: true, plan, toolCalls, assistantMessage: embed(msg, plan) };
  }

  if (
    /when is|deadline|due (date|for)|payroll tax|paye|vat return|sales tax|filing/.test(lower) &&
    has("get_deadlines")
  ) {
    const topic = /payroll|paye/i.test(lower)
      ? "payroll"
      : /vat|sales tax/i.test(lower)
        ? "sales_tax"
        : "general";
    const args = { topic, query: user.slice(0, 200) };
    const result = await input.executeTool("get_deadlines", args);
    toolCalls.push({ name: "get_deadlines", args, result: result.data });
    const blob =
      section(input.knowledge, /## (Deadlines|Filing)[\s\S]*?(?=\n## )/i) ||
      "General filing deadline guides are on file — confirm your jurisdiction with a CPA.";
    return {
      handled: true,
      toolCalls,
      assistantMessage: `${blob}\n\nThis is a planning guide, not advice for your specific return.`,
    };
  }

  if (
    /docs? (for|do i need)|what (documents|paperwork)|checklist|w-?2|irp5/.test(lower) &&
    has("get_required_documents")
  ) {
    const args = {
      matter: /personal|individual/i.test(lower) ? "personal_return" : "general",
      query: user.slice(0, 200),
    };
    const result = await input.executeTool("get_required_documents", args);
    toolCalls.push({ name: "get_required_documents", args, result: result.data });
    const blob =
      section(input.knowledge, /## (Documents|Checklist|Required)[\s\S]*?(?=\n## )/i) ||
      "Typical document checklists are on file for common matter types.";
    return { handled: true, toolCalls, assistantMessage: blob };
  }

  const looksLikeOnboard =
    /sign me up|new client|onboard|monthly bookkeeping|start (with )?bookkeeping|engage (you|the practice)/.test(
      lower,
    );

  if (looksLikeOnboard && has("capture_onboarding")) {
    const name = extractName(user);
    const phone = extractPhone(user);
    const args = {
      name,
      phone,
      contact: phone,
      service: /bookkeeping/i.test(lower) ? "monthly_bookkeeping" : "new_client",
      notes: user.slice(0, 240),
    };

    const plan: ApWorkflowPlan = {
      id: `ap-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: "onboarding",
      status: "proposed",
      steps: [
        {
          id: "docs",
          label: "Note intake checklist for new-client pack",
          tool: has("get_required_documents") ? "get_required_documents" : undefined,
          args: { matter: "new_client" },
          status: "pending",
        },
        {
          id: "capture",
          label: `Capture onboarding for ${name ?? "you"}`,
          tool: "capture_onboarding",
          args,
          status: "pending",
        },
        {
          id: "notify",
          label: "Notify practice intake (Slack)",
          tool: "handoff_to_human",
          args: {
            reason: "onboarding_captured",
            summary: `New client intake: ${name ?? ""} ${phone ?? ""} — ${user.slice(0, 160)}`,
          },
          status: "pending",
        },
        {
          id: "verify",
          label: "Confirm intake reference (not a signed engagement)",
          status: "pending",
        },
      ],
    };

    return {
      handled: true,
      plan,
      toolCalls: [],
      assistantMessage: embed(
        [
          "I can start new-client intake — I won't write to the CRM until you confirm.",
          "",
          `**Goal:** ${plan.goal}`,
          "",
          "## Workflow plan",
          ...plan.steps.map((s, i) => `${i + 1}. ${s.label}`),
          "",
          `Is that right — capture intake for **${name ?? "you"}**${phone ? ` (${phone})` : ""}? Reply **yes** / **go ahead** to confirm.`,
        ].join("\n"),
        plan,
      ),
    };
  }

  return { handled: false, assistantMessage: "", toolCalls: [] };
}
