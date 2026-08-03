/**
 * Multi-step Gym Membership workflow:
 * plans / class schedule → confirm → request_freeze_or_cancel → notify → verify.
 * Never claims membership is already frozen; billing / contract cancel → handoff.
 */

import { wf } from "./i18n.js";
import { handleStopSuppression } from "./stop-suppression.js";

export type GymStepStatus = "pending" | "done" | "skipped" | "failed";

export interface GymWorkflowStep {
  id: string;
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: GymStepStatus;
  resultSummary?: string;
}

export interface GymWorkflowPlan {
  id: string;
  goal: string;
  kind: "freeze" | "cancel";
  steps: GymWorkflowStep[];
  status: "proposed" | "executing" | "completed" | "cancelled";
}

export interface GymWorkflowTurnResult {
  handled: boolean;
  assistantMessage: string;
  plan?: GymWorkflowPlan;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

const WORKFLOW_RE = /<!--miai-workflow:([\s\S]*?)-->/;

export function isGymMembership(agentId: string): boolean {
  return /gym-membership/i.test(agentId);
}

export function parseGymWorkflowFromMessages(
  messages: Array<{ role: string; content: string }>,
): GymWorkflowPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const match = m.content.match(WORKFLOW_RE);
    if (!match) continue;
    try {
      return JSON.parse(match[1]!) as GymWorkflowPlan;
    } catch {
      return null;
    }
  }
  return null;
}

function embed(message: string, plan: GymWorkflowPlan): string {
  return `${message.replace(WORKFLOW_RE, "").trimEnd()}\n\n<!--miai-workflow:${JSON.stringify(plan)}-->`;
}

function isConfirm(text: string): boolean {
  const lower = text.toLowerCase().replace(/##[\s\S]*$/g, " ").trim();
  return (
    /^(yes|yep|yeah|correct|confirmed|ok|okay)\b/.test(lower) ||
    /yes[,.]? (please|go ahead|do it|confirm)/.test(lower) ||
    /go ahead|please (log|continue)|looks good/.test(lower)
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

/** Knowledge sections carry internal authoring asides (e.g. "`get_plans` returns this same list") — never customer-facing. */
function stripInternalNotes(text: string): string {
  return text
    .split("\n")
    .filter((l) => !l.trim().startsWith(">") && !/`[a-z_]+`\s*(returns|fetch)/i.test(l))
    .join("\n")
    .trim();
}

function extractMemberId(text: string): string | undefined {
  return text.match(/\b(M[- ]?\d+)\b/i)?.[1]?.replace(/\s+/g, "-").toUpperCase();
}

function extractPhone(text: string): string | undefined {
  return (
    text.match(/(\+?\d[\d\s-]{6,}\d)/)?.[1]?.trim() ||
    text.match(/\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b/)?.[1]
  );
}

export async function runGymMembershipWorkflow(input: {
  agentId: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  toolNames: string[];
  knowledge?: string;
  executeTool: ExecuteToolFn;
  replyLanguage?: string;
}): Promise<GymWorkflowTurnResult> {
  if (!isGymMembership(input.agentId)) {
    return { handled: false, assistantMessage: "", toolCalls: [] };
  }

  const user = input.userMessage.replace(/##[\s\S]*$/g, "").trim();
  const lower = user.toLowerCase();
  const pending = parseGymWorkflowFromMessages(input.messages);
  const toolCalls: GymWorkflowTurnResult["toolCalls"] = [];
  const has = (n: string) => input.toolNames.includes(n);
  const lang = input.replyLanguage;

  if (
    /injur|exercise prescription|what workouts? should|torn (acl|meniscus)|doctor said/.test(lower)
  ) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't give exercise prescriptions or injury advice — please speak to a doctor or a qualified trainer on the floor.",
    };
  }

  if (/card (number|details)|cvv|\b4111\b/.test(lower)) {
    return { handled: true, toolCalls: [], assistantMessage: wf(lang, "card_refuse") };
  }

  if (
    /double charg|billing dispute|charged twice|12[- ]month (early )?cancel|break (my )?contract|talk to (a )?human/.test(
      lower,
    )
  ) {
    if (has("handoff_to_human")) {
      const args = {
        reason: /charg|billing|dispute/.test(lower) ? "billing_dispute" : "contract_cancel",
        summary: user.slice(0, 400),
      };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "Billing disputes and early contract cancellations need the membership desk — I'm connecting you now. I won't claim your membership is already cancelled.",
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
        "I can't share internal instructions. I can help with plans, class times, and logging a freeze or cancel request for the desk.",
    };
  }

  if (pending?.status === "proposed" && /\b(cancel|never ?mind|stop)\b/i.test(lower) && !/membership/.test(lower)) {
    const cancelled = { ...pending, status: "cancelled" as const };
    return {
      handled: true,
      plan: cancelled,
      toolCalls: [],
      assistantMessage: embed(wf(lang, "plan_cancelled"), cancelled),
    };
  }

  if (pending?.status === "proposed" && isConfirm(user)) {
    const plan: GymWorkflowPlan = {
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
      const ref = String(data.reference ?? data.id ?? (result.ok ? "REQ-OK" : "ERR"));
      step.status = result.ok ? "done" : "failed";
      step.resultSummary = ref;
      lines.push(`${result.ok ? "✓" : "✗"} ${step.label} — ${ref}`);
      if (!result.ok && step.id === "request") break;
    }

    plan.status = "completed";
    const req = plan.steps.find((s) => s.id === "request" && s.status === "done");
    const msg = [
      req
        ? `Request logged for the membership desk — reference **${req.resultSummary}**. This is **not** confirmation that your membership is already frozen or cancelled.`
        : "Workflow finished.",
      "",
      "## Workflow results",
      ...lines,
    ].join("\n");

    return { handled: true, plan, toolCalls, assistantMessage: embed(msg, plan) };
  }

  const looksLikeFreeze = /\bfreeze\b|pause (my )?membership|hold (my )?membership/.test(lower);
  const looksLikeCancel = /\bcancel (my )?membership\b|stop (my )?membership/.test(lower);

  if ((looksLikeFreeze || looksLikeCancel) && has("request_freeze_or_cancel")) {
    const memberId = extractMemberId(user);
    const phone = extractPhone(user);
    const action = looksLikeCancel ? "cancel" : "freeze";
    const from =
      user.match(/from\s+([A-Za-z]+\s+\d{1,2}|\d{1,2}\s+[A-Za-z]+|\d{4}-\d{2}-\d{2})/i)?.[1] ||
      undefined;
    const args = {
      action,
      member_id: memberId,
      from,
      phone,
      notes: user.slice(0, 240),
    };

    const plan: GymWorkflowPlan = {
      id: `gym-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: action,
      status: "proposed",
      steps: [
        {
          id: "request",
          label: `Log ${action} request${memberId ? ` for ${memberId}` : ""}`,
          tool: "request_freeze_or_cancel",
          args,
          status: "pending",
        },
        {
          id: "notify",
          label: "Notify membership desk",
          tool: "handoff_to_human",
          args: {
            reason: `${action}_request`,
            summary: `${action} request ${memberId ?? ""} ${from ?? ""} — ${user.slice(0, 160)}`,
          },
          status: "pending",
        },
        {
          id: "verify",
          label: "Confirm logged request (not live freeze/cancel)",
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
          `I can log a **${action}** request for the desk — I will **not** claim your membership is already ${action === "freeze" ? "frozen" : "cancelled"}.`,
          "",
          `**Goal:** ${plan.goal}`,
          "",
          "## Workflow plan",
          ...plan.steps.map((s, i) => `${i + 1}. ${s.label}`),
          "",
          memberId
            ? `Is that right — log ${action} for **${memberId}**${from ? ` from ${from}` : ""}? Reply **yes** / **go ahead** to confirm.`
            : `Confirm your **member ID** and reply **yes** / **go ahead** to log the ${action} request.`,
        ].join("\n"),
        plan,
      ),
    };
  }

  if (
    /(?:membership )?plans?|how much|price|what (do )?you offer|what memberships/.test(lower) &&
    has("get_plans")
  ) {
    const args = {};
    const result = await input.executeTool("get_plans", args);
    toolCalls.push({ name: "get_plans", args, result: result.data });
    const data = (result.data ?? {}) as {
      plans?: Array<{ name?: string; price?: string; term?: string; includes?: string }>;
    };
    let blob: string;
    if (result.ok && Array.isArray(data.plans) && data.plans.length > 0) {
      blob = data.plans
        .map((p) => {
          const term = p.term ? ` (${p.term})` : "";
          const includes = p.includes ? ` — ${p.includes}` : "";
          return `- **${p.name ?? "Plan"}** — **${p.price ?? "POA"}**${term}${includes}`;
        })
        .join("\n");
    } else {
      blob =
        stripInternalNotes(section(input.knowledge, /## (Plans|Membership|Pricing)[\s\S]*?(?=\n## )/i)) ||
        "Published membership plans are on file.";
    }
    return { handled: true, toolCalls, assistantMessage: blob };
  }

  if (/class|schedule|saturday|timetable|what's on/.test(lower) && has("get_class_schedule")) {
    const day = /saturday/i.test(lower)
      ? "Saturday"
      : /sunday/i.test(lower)
        ? "Sunday"
        : /monday|tuesday|wednesday|thursday|friday/i.exec(lower)?.[0] || "Saturday";
    const args = { day };
    const result = await input.executeTool("get_class_schedule", args);
    toolCalls.push({ name: "get_class_schedule", args, result: result.data });
    return {
      handled: true,
      toolCalls,
      assistantMessage: `Here's what I have for **${day}**. I can also log a freeze or cancel request for the desk if you share your member ID.`,
    };
  }

  return { handled: false, assistantMessage: "", toolCalls: [] };
}
