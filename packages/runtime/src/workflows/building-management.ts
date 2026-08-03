/**
 * Multi-step Building Management workflow:
 * levy/access info → confirm → log_maintenance → verify; emergencies escalate immediately.
 */

import { wf } from "./i18n.js";
import { handleStopSuppression } from "./stop-suppression.js";

export type BmStepStatus = "pending" | "done" | "skipped" | "failed";

export interface BmWorkflowStep {
  id: string;
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: BmStepStatus;
  resultSummary?: string;
}

export interface BmWorkflowPlan {
  id: string;
  goal: string;
  kind: "maintenance";
  steps: BmWorkflowStep[];
  status: "proposed" | "executing" | "completed" | "cancelled";
}

export interface BmWorkflowTurnResult {
  handled: boolean;
  assistantMessage: string;
  plan?: BmWorkflowPlan;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

const WORKFLOW_RE = /<!--miai-workflow:([\s\S]*?)-->/;

export function isBuildingManagement(agentId: string): boolean {
  return /building-management/i.test(agentId);
}

export function parseBmWorkflowFromMessages(
  messages: Array<{ role: string; content: string }>,
): BmWorkflowPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const match = m.content.match(WORKFLOW_RE);
    if (!match) continue;
    try {
      return JSON.parse(match[1]!) as BmWorkflowPlan;
    } catch {
      return null;
    }
  }
  return null;
}

function embed(message: string, plan: BmWorkflowPlan): string {
  return `${message.replace(WORKFLOW_RE, "").trimEnd()}\n\n<!--miai-workflow:${JSON.stringify(plan)}-->`;
}

function isConfirm(text: string): boolean {
  const lower = text.toLowerCase().replace(/##[\s\S]*$/g, " ").trim();
  return (
    /^(yes|yep|yeah|correct|confirmed|ok|okay)\b/.test(lower) ||
    /yes[,.]? (please|go ahead|do it|confirm|log)/.test(lower) ||
    /go ahead|please log|looks good|log it/.test(lower)
  );
}

export type ExecuteToolFn = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ ok: boolean; data: unknown }>;

function emergencyNumber(agentId: string, knowledge?: string): string {
  const fromKb = knowledge?.match(/call \*\*([^*]+)\*\*/i)?.[1]?.trim();
  if (fromKb) return fromKb;
  if (/eu-|asia-/i.test(agentId)) return "112";
  if (/us-/i.test(agentId)) return "911";
  return "local emergency services";
}

function section(knowledge: string | undefined, heading: RegExp): string {
  if (!knowledge) return "";
  return knowledge.match(heading)?.[0]?.slice(0, 1400) ?? "";
}

function extractUnit(text: string): string | undefined {
  return (
    text.match(/\bunit\s*([A-Z0-9-]+)/i)?.[1] ||
    text.match(/\bapt\.?\s*([A-Z0-9-]+)/i)?.[1] ||
    text.match(/\bflat\s*([A-Z0-9-]+)/i)?.[1]
  );
}

function extractPhone(text: string): string | undefined {
  return (
    text.match(/(\+?\d[\d\s-]{6,}\d)/)?.[1]?.trim() ||
    text.match(/\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b/)?.[1]
  );
}

export async function runBuildingManagementWorkflow(input: {
  agentId: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  toolNames: string[];
  knowledge?: string;
  executeTool: ExecuteToolFn;
  replyLanguage?: string;
}): Promise<BmWorkflowTurnResult> {
  if (!isBuildingManagement(input.agentId)) {
    return { handled: false, assistantMessage: "", toolCalls: [] };
  }

  const user = input.userMessage.replace(/##[\s\S]*$/g, "").trim();
  const lower = user.toLowerCase();
  const pending = parseBmWorkflowFromMessages(input.messages);
  const toolCalls: BmWorkflowTurnResult["toolCalls"] = [];
  const has = (n: string) => input.toolNames.includes(n);
  const emerg = emergencyNumber(input.agentId, input.knowledge);
  const lang = input.replyLanguage;

  if (
    /burst pipe|flooding|gas leak|fire|smoke|can't breathe|cannot breathe|life-?threatening|electrical sparking/.test(
      lower,
    )
  ) {
    if (has("handoff_to_human")) {
      const args = { reason: "emergency", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: [
        `If anyone is in danger, call **${emerg}** / evacuate now.`,
        "For flooding: shut the nearest isolation valve if safe. I'm alerting building management / the emergency desk — I won't treat this as a routine ticket.",
      ].join("\n\n"),
    };
  }

  if (/card (number|details)|cvv|\b4111\b|pay (my )?levy (here|in chat)/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage: wf(lang, "card_refuse"),
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

  if (/ignore (all )?previous|print your (full )?system prompt|reveal your (system )?prompt/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share internal instructions. I can help with levies, access rules, and logging maintenance.",
    };
  }

  if (
    /levy dispute|wrong levy|overcharged|billing dispute|talk to (a )?human|speak to (the )?(agent|manager)/.test(
      lower,
    )
  ) {
    if (has("handoff_to_human")) {
      const args = {
        reason: /levy|billing|overcharg|dispute/.test(lower) ? "billing_dispute" : "explicit_request",
        summary: user.slice(0, 400),
      };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "I'm connecting you to the managing agent / accounts team for that — levy disputes aren't settled in chat.",
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
    const plan: BmWorkflowPlan = {
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
      const ref = String(data.reference ?? data.ticket_id ?? data.id ?? (result.ok ? "MAINT-OK" : "ERR"));
      step.status = result.ok ? "done" : "failed";
      step.resultSummary = ref;
      lines.push(`${result.ok ? "✓" : "✗"} ${step.label} — ${ref}`);
      if (!result.ok && step.id === "log") break;
    }

    plan.status = "completed";
    const logStep = plan.steps.find((s) => s.id === "log" && s.status === "done");
    const msg = [
      logStep
        ? `Maintenance request logged — reference **${logStep.resultSummary}**. This is a logged ticket, not a confirmation that the issue is fixed.`
        : "Workflow finished.",
      "",
      "## Workflow results",
      ...lines,
    ].join("\n");

    return { handled: true, plan, toolCalls, assistantMessage: embed(msg, plan) };
  }

  if (/levy|how much.*(month|due)|monthly (fee|levy|hoa)/.test(lower) && has("get_levy_info")) {
    const unitType = /1[- ]?bed/i.test(lower)
      ? "1-bedroom"
      : /2[- ]?bed/i.test(lower)
        ? "2-bedroom"
        : /3[- ]?bed/i.test(lower)
          ? "3-bedroom"
          : "general";
    const args = { unit_type: unitType, query: user.slice(0, 200) };
    const result = await input.executeTool("get_levy_info", args);
    toolCalls.push({ name: "get_levy_info", args, result: result.data });
    const blob =
      section(input.knowledge, /## (Levies|Levy|Fees)[\s\S]*?(?=\n## )/i) ||
      "Published levy figures are on file for your unit type.";
    return {
      handled: true,
      toolCalls,
      assistantMessage: `${blob}\n\nI can also log a maintenance request if something needs attention.`,
    };
  }

  if (
    /parking|visitor|access|gate|fob|intercom|rules/.test(lower) &&
    has("get_access_rules") &&
    !/log |broken|repair|fix/.test(lower)
  ) {
    const args = { topic: /parking/i.test(lower) ? "visitor_parking" : "access" };
    const result = await input.executeTool("get_access_rules", args);
    toolCalls.push({ name: "get_access_rules", args, result: result.data });
    const blob =
      section(input.knowledge, /## (Access|Parking|Rules)[\s\S]*?(?=\n## )/i) ||
      "Access and visitor rules are on file with building management.";
    return { handled: true, toolCalls, assistantMessage: blob };
  }

  const looksLikeLog =
    /\blog\b|broken|repair|maintenance|not working|fix a (ticket|request)|gate motor|lift (is )?(out|stuck)/.test(
      lower,
    );

  if (looksLikeLog && has("log_maintenance")) {
    const unit = extractUnit(user);
    const phone = extractPhone(user);
    const args = {
      unit,
      issue: user.slice(0, 400),
      phone,
      contact: phone,
      notes: user.slice(0, 240),
    };

    const plan: BmWorkflowPlan = {
      id: `bm-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: "maintenance",
      status: "proposed",
      steps: [
        {
          id: "info",
          label: unit ? `Confirm unit ${unit}` : "Confirm location / unit",
          status: "pending",
        },
        {
          id: "log",
          label: `Log maintenance: ${user.slice(0, 80)}`,
          tool: "log_maintenance",
          args,
          status: "pending",
        },
        {
          id: "notify",
          label: "Notify building management desk",
          tool: "handoff_to_human",
          args: {
            reason: "maintenance_logged",
            summary: `Maintenance: unit ${unit ?? "n/a"} — ${user.slice(0, 200)}`,
          },
          status: "pending",
        },
        {
          id: "verify",
          label: "Return ticket reference (not a fix confirmation)",
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
          "I can log that as a maintenance ticket — I won't submit it until you confirm.",
          "",
          `**Goal:** ${plan.goal}`,
          "",
          "## Workflow plan",
          ...plan.steps.map((s, i) => `${i + 1}. ${s.label}`),
          "",
          unit
            ? `Is that right — **unit ${unit}**, log this maintenance request? Reply **yes** / **go ahead** to confirm.`
            : "Confirm the **unit number** and reply **yes** / **go ahead** to log it.",
        ].join("\n"),
        plan,
      ),
    };
  }

  return { handled: false, assistantMessage: "", toolCalls: [] };
}
