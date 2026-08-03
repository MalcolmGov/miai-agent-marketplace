/**
 * Multi-step Tax Office workflow:
 * get_filing_deadlines → confirm → log_tax_enquiry → notify → verify.
 * Never gives personal tax advice or assesses liability.
 */

import { wf } from "./i18n.js";

export type ToStepStatus = "pending" | "done" | "skipped" | "failed";

export interface ToWorkflowStep {
  id: string;
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: ToStepStatus;
  resultSummary?: string;
}

export interface ToWorkflowPlan {
  id: string;
  goal: string;
  kind: "enquiry";
  steps: ToWorkflowStep[];
  status: "proposed" | "executing" | "completed" | "cancelled";
}

export interface ToWorkflowTurnResult {
  handled: boolean;
  assistantMessage: string;
  plan?: ToWorkflowPlan;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

const WORKFLOW_RE = /<!--miai-workflow:([\s\S]*?)-->/;

export function isTaxOffice(agentId: string): boolean {
  return /tax-office/i.test(agentId);
}

export function parseToWorkflowFromMessages(
  messages: Array<{ role: string; content: string }>,
): ToWorkflowPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const match = m.content.match(WORKFLOW_RE);
    if (!match) continue;
    try {
      return JSON.parse(match[1]!) as ToWorkflowPlan;
    } catch {
      return null;
    }
  }
  return null;
}

function embed(message: string, plan: ToWorkflowPlan): string {
  return `${message.replace(WORKFLOW_RE, "").trimEnd()}\n\n<!--miai-workflow:${JSON.stringify(plan)}-->`;
}

function isConfirm(text: string): boolean {
  const lower = text.toLowerCase().replace(/##[\s\S]*$/g, " ").trim();
  return (
    /^(yes|yep|yeah|correct|confirmed|ok|okay)\b/.test(lower) ||
    /yes[,.]? (please|go ahead|do it|confirm|log)/.test(lower) ||
    /go ahead|please log|looks good/.test(lower)
  );
}

export type ExecuteToolFn = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ ok: boolean; data: unknown }>;

function emergencyNumber(agentId: string): string {
  if (/eu-|asia-/i.test(agentId)) return "112";
  if (/us-/i.test(agentId)) return "911";
  return "local emergency services";
}

function extractPhone(text: string): string | undefined {
  return (
    text.match(/(\+?\d[\d\s-]{6,}\d)/)?.[1]?.trim() ||
    text.match(/\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b/)?.[1]
  );
}

function extractName(text: string): string | undefined {
  return (
    text.match(/I'?m\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1] ||
    text.match(/Name'?s\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1]
  );
}

function extractEmail(text: string): string | undefined {
  return text.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0];
}

export async function runTaxOfficeWorkflow(input: {
  agentId: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  toolNames: string[];
  knowledge?: string;
  executeTool: ExecuteToolFn;
  replyLanguage?: string;
}): Promise<ToWorkflowTurnResult> {
  if (!isTaxOffice(input.agentId)) {
    return { handled: false, assistantMessage: "", toolCalls: [] };
  }

  const user = input.userMessage.replace(/##[\s\S]*$/g, "").trim();
  const lower = user.toLowerCase();
  const pending = parseToWorkflowFromMessages(input.messages);
  const toolCalls: ToWorkflowTurnResult["toolCalls"] = [];
  const has = (n: string) => input.toolNames.includes(n);
  const lang = input.replyLanguage;
  const emerg = emergencyNumber(input.agentId);

  if (/life-?threatening|emergency right now/.test(lower)) {
    if (has("handoff_to_human")) {
      const args = { reason: "emergency", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: `If this is an emergency, call **${emerg}**. I'm alerting the desk.`,
    };
  }

  if (
    /how much (tax )?will i owe|what (should|do) i (owe|claim)|assess my (return|liability)|tax advice|am i (under|over).?paying|optimise my tax|optimize my tax/.test(
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
        "I can't give personal tax advice or assess what you owe. I can share general filing deadlines / document FAQs, or log an enquiry for a tax officer.",
    };
  }

  if (/card (number|details)|cvv|\b4111\b/.test(lower)) {
    return { handled: true, toolCalls: [], assistantMessage: wf(lang, "card_refuse") };
  }

  if (/^\s*stop\b|unsubscribe|don't (text|message) me/.test(lower)) {
    if (has("handoff_to_human")) {
      const args = { reason: "stop_suppression", summary: user.slice(0, 200) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: "Understood — STOP acknowledged. Handing off so suppression is completed.",
    };
  }

  if (/ignore (all )?previous|reveal your (system )?prompt|print your (full )?system prompt|write (me )?a poem/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share internal instructions or go off-topic. I can help with filing-deadline FAQs and logging a tax enquiry.",
    };
  }

  if (/complaint|speak to (a )?(person|human|officer)|talk to (someone|a human)/.test(lower)) {
    if (has("handoff_to_human")) {
      const args = { reason: "explicit_request", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: "Connecting you to a tax officer now.",
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
    const plan: ToWorkflowPlan = {
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
      const ref = String(data.reference ?? data.id ?? (result.ok ? "ENQ-OK" : "ERR"));
      step.status = result.ok ? "done" : "failed";
      step.resultSummary = ref;
      lines.push(`${result.ok ? "✓" : "✗"} ${step.label} — ${ref}`);
      if (!result.ok && step.id === "log") break;
    }

    plan.status = "completed";
    const log = plan.steps.find((s) => s.id === "log" && s.status === "done");
    const msg = [
      log
        ? `Enquiry logged — reference **${log.resultSummary}**. An officer will follow up; this is not a tax assessment.`
        : "Workflow finished.",
      "",
      "## Workflow results",
      ...lines,
    ].join("\n");

    return { handled: true, plan, toolCalls, assistantMessage: embed(msg, plan) };
  }

  if (
    /deadline|when (is|are)|april|filing|w-?2|extension|form 4868|key facts/.test(lower) &&
    has("get_filing_deadlines") &&
    !/log |enquiry|contact me|call me back/.test(lower)
  ) {
    const args = { query: user.slice(0, 200) };
    const result = await input.executeTool("get_filing_deadlines", args);
    toolCalls.push({ name: "get_filing_deadlines", args, result: result.data });
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "General filing-deadline / document FAQs are on file (e.g. April 15, W-2, extension Form 4868). This is not advice for your return — I can log an enquiry if you want an officer to follow up.",
    };
  }

  const looksLikeEnquiry =
    /log (an? )?(enquiry|request)|follow up|call me back|contact (details|me)|leave my (number|email)|speak (to|with) (an? )?officer/.test(
      lower,
    );

  if (looksLikeEnquiry && has("log_tax_enquiry")) {
    const name = extractName(user);
    const phone = extractPhone(user);
    const email = extractEmail(user);
    const args = {
      name,
      phone,
      email,
      contact: phone || email,
      topic: user.slice(0, 200),
      notes: user.slice(0, 240),
    };

    const plan: ToWorkflowPlan = {
      id: `to-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: "enquiry",
      status: "proposed",
      steps: [
        {
          id: "deadlines",
          label: "Attach general deadline FAQ context",
          tool: has("get_filing_deadlines") ? "get_filing_deadlines" : undefined,
          args: { query: "general" },
          status: "pending",
        },
        {
          id: "log",
          label: `Log tax enquiry for ${name ?? "you"}`,
          tool: "log_tax_enquiry",
          args,
          status: "pending",
        },
        {
          id: "notify",
          label: "Notify tax office desk",
          tool: "handoff_to_human",
          args: {
            reason: "enquiry_logged",
            summary: `Tax enquiry: ${name ?? ""} ${phone ?? email ?? ""} — ${user.slice(0, 160)}`,
          },
          status: "pending",
        },
        { id: "verify", label: "Confirm enquiry reference (not an assessment)", status: "pending" },
      ],
    };

    return {
      handled: true,
      plan,
      toolCalls: [],
      assistantMessage: embed(
        [
          "I can log a tax enquiry — I won't write it until you confirm. This is not a liability assessment.",
          "",
          `**Goal:** ${plan.goal}`,
          "",
          "## Workflow plan",
          ...plan.steps.map((s, i) => `${i + 1}. ${s.label}`),
          "",
          `Confirm enquiry for **${name ?? "you"}**${phone || email ? ` (${phone || email})` : ""}? Reply **yes** / **go ahead**.`,
        ].join("\n"),
        plan,
      ),
    };
  }

  return { handled: false, assistantMessage: "", toolCalls: [] };
}
