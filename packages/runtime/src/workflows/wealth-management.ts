/**
 * Multi-step Wealth Management workflow:
 * list_wealth_services → confirm → capture_wealth_meeting → notify → verify.
 * Never gives investment advice or portfolio recommendations.
 */

import { wf } from "./i18n.js";
import { handleStopSuppression } from "./stop-suppression.js";

export type WmStepStatus = "pending" | "done" | "skipped" | "failed";

export interface WmWorkflowStep {
  id: string;
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: WmStepStatus;
  resultSummary?: string;
}

export interface WmWorkflowPlan {
  id: string;
  goal: string;
  kind: "meeting";
  steps: WmWorkflowStep[];
  status: "proposed" | "executing" | "completed" | "cancelled";
}

export interface WmWorkflowTurnResult {
  handled: boolean;
  assistantMessage: string;
  plan?: WmWorkflowPlan;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

const WORKFLOW_RE = /<!--miai-workflow:([\s\S]*?)-->/;

export function isWealthManagement(agentId: string): boolean {
  return /wealth-management/i.test(agentId);
}

export function parseWmWorkflowFromMessages(
  messages: Array<{ role: string; content: string }>,
): WmWorkflowPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const match = m.content.match(WORKFLOW_RE);
    if (!match) continue;
    try {
      return JSON.parse(match[1]!) as WmWorkflowPlan;
    } catch {
      return null;
    }
  }
  return null;
}

function embed(message: string, plan: WmWorkflowPlan): string {
  return `${message.replace(WORKFLOW_RE, "").trimEnd()}\n\n<!--miai-workflow:${JSON.stringify(plan)}-->`;
}

function isConfirm(text: string): boolean {
  const lower = text.toLowerCase().replace(/##[\s\S]*$/g, " ").trim();
  return (
    /^(yes|yep|yeah|correct|confirmed|ok|okay)\b/.test(lower) ||
    /yes[,.]? (please|go ahead|do it|confirm|book)/.test(lower) ||
    /go ahead|please (book|log|capture)|looks good/.test(lower)
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
    text.match(/Name'?s\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1] ||
    text.match(/—\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*,/)?.[1]
  );
}

function extractEmail(text: string): string | undefined {
  return text.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0];
}

export async function runWealthManagementWorkflow(input: {
  agentId: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  toolNames: string[];
  knowledge?: string;
  executeTool: ExecuteToolFn;
  replyLanguage?: string;
}): Promise<WmWorkflowTurnResult> {
  if (!isWealthManagement(input.agentId)) {
    return { handled: false, assistantMessage: "", toolCalls: [] };
  }

  const user = input.userMessage.replace(/##[\s\S]*$/g, "").trim();
  const lower = user.toLowerCase();
  const pending = parseWmWorkflowFromMessages(input.messages);
  const toolCalls: WmWorkflowTurnResult["toolCalls"] = [];
  const has = (n: string) => input.toolNames.includes(n);
  const lang = input.replyLanguage;
  const emerg = emergencyNumber(input.agentId);

  if (/life-?threatening|suicide|emergency right now/.test(lower)) {
    if (has("handoff_to_human")) {
      const args = { reason: "emergency", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: `If this is a life-threatening emergency, call **${emerg}** now. I'm also alerting the desk.`,
    };
  }

  if (
    /what should i (buy|invest)|recommend (a |an )?(stock|fund|etf|portfolio)|guaranteed returns|is .+ a good investment|allocate my/.test(
      lower,
    )
  ) {
    if (has("handoff_to_human")) {
      const args = { reason: "investment_advice", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "I can't give investment advice or portfolio recommendations. I can share desk FAQs (fiduciary overlay, AUM minimums) or log a discovery meeting — connecting you to an advisor for advice.",
    };
  }

  if (/card (number|details)|cvv|\b4111\b/.test(lower)) {
    return { handled: true, toolCalls: [], assistantMessage: wf(lang, "card_refuse") };
  }

  const stopSuppression = await handleStopSuppression({ lower, user, has, executeTool: input.executeTool });
  if (stopSuppression) return stopSuppression;

  if (/ignore (all )?previous|reveal your (system )?prompt|print your (full )?system prompt|write (me )?a poem/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share internal instructions or go off-topic. I can help with wealth-desk FAQs and logging a discovery meeting.",
    };
  }

  if (/complaint|speak to (a )?(person|human|advisor)|talk to (someone|a human)/.test(lower)) {
    if (has("handoff_to_human")) {
      const args = { reason: "explicit_request", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: "Connecting you to the wealth desk now.",
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
    const plan: WmWorkflowPlan = {
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
      const ref = String(data.reference ?? data.id ?? (result.ok ? "MTG-OK" : "ERR"));
      step.status = result.ok ? "done" : "failed";
      step.resultSummary = ref;
      lines.push(`${result.ok ? "✓" : "✗"} ${step.label} — ${ref}`);
      if (!result.ok && step.id === "capture") break;
    }

    plan.status = "completed";
    const cap = plan.steps.find((s) => s.id === "capture" && s.status === "done");
    const msg = [
      cap
        ? `Meeting intake logged — reference **${cap.resultSummary}**. An advisor will follow up; this is not investment advice.`
        : "Workflow finished.",
      "",
      "## Workflow results",
      ...lines,
    ].join("\n");

    return { handled: true, plan, toolCalls, assistantMessage: embed(msg, plan) };
  }

  if (
    /key facts|what (do )?you offer|services|aum|minimum|fiduciary|discovery/.test(lower) &&
    has("list_wealth_services") &&
    !/book|schedule|log|meeting|capture/.test(lower)
  ) {
    const args = {};
    const result = await input.executeTool("list_wealth_services", args);
    toolCalls.push({ name: "list_wealth_services", args, result: result.data });
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "Here are the wealth-desk FAQs (fiduciary overlay, typical AUM minimums, discovery meeting). I can log a meeting request if you share your name and contact — I won't give portfolio advice.",
    };
  }

  const looksLikeMeeting =
    /book (a )?meeting|discovery meeting|schedule (a )?(call|meeting)|log (a )?(request|meeting)|capture.*(meeting|intake)|speak with an advisor/.test(
      lower,
    );

  if (looksLikeMeeting && has("capture_wealth_meeting")) {
    const name = extractName(user);
    const phone = extractPhone(user);
    const email = extractEmail(user);
    const args = {
      name,
      phone,
      email,
      contact: phone || email,
      notes: user.slice(0, 240),
      meeting_type: "discovery",
    };

    const plan: WmWorkflowPlan = {
      id: `wm-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: "meeting",
      status: "proposed",
      steps: [
        {
          id: "services",
          label: "Confirm discovery / desk FAQ context",
          tool: has("list_wealth_services") ? "list_wealth_services" : undefined,
          status: "pending",
        },
        {
          id: "capture",
          label: `Capture wealth meeting for ${name ?? "you"}`,
          tool: "capture_wealth_meeting",
          args,
          status: "pending",
        },
        {
          id: "notify",
          label: "Notify wealth desk",
          tool: "handoff_to_human",
          args: {
            reason: "meeting_captured",
            summary: `Wealth discovery: ${name ?? ""} ${phone ?? email ?? ""}`,
          },
          status: "pending",
        },
        { id: "verify", label: "Confirm intake reference (not advice)", status: "pending" },
      ],
    };

    return {
      handled: true,
      plan,
      toolCalls: [],
      assistantMessage: embed(
        [
          "I can log a discovery meeting — I won't write it until you confirm. This is intake only, not investment advice.",
          "",
          `**Goal:** ${plan.goal}`,
          "",
          "## Workflow plan",
          ...plan.steps.map((s, i) => `${i + 1}. ${s.label}`),
          "",
          `Confirm intake for **${name ?? "you"}**${phone || email ? ` (${phone || email})` : ""}? Reply **yes** / **go ahead**.`,
        ].join("\n"),
        plan,
      ),
    };
  }

  return { handled: false, assistantMessage: "", toolCalls: [] };
}
