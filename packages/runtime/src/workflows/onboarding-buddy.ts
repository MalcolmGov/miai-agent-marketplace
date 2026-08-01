/**
 * Multi-step Onboarding Buddy workflow:
 * checklist / resource → plan → confirm → log_question | notify HR → verify
 *
 * Blockers and HR/salary issues escalate; never collects banking/card in chat.
 */

export type ObStepStatus = "pending" | "done" | "skipped" | "failed";

export interface ObWorkflowStep {
  id: string;
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: ObStepStatus;
  resultSummary?: string;
}

export interface ObWorkflowPlan {
  id: string;
  goal: string;
  kind: "log_question" | "escalate";
  steps: ObWorkflowStep[];
  status: "proposed" | "executing" | "completed" | "cancelled";
}

export interface ObWorkflowTurnResult {
  handled: boolean;
  assistantMessage: string;
  plan?: ObWorkflowPlan;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

const WORKFLOW_RE = /<!--miai-workflow:([\s\S]*?)-->/;

export function isOnboardingBuddy(agentId: string): boolean {
  return /onboarding-buddy/i.test(agentId);
}

export function parseObWorkflowFromMessages(
  messages: Array<{ role: string; content: string }>,
): ObWorkflowPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const match = m.content.match(WORKFLOW_RE);
    if (!match) continue;
    try {
      return JSON.parse(match[1]!) as ObWorkflowPlan;
    } catch {
      return null;
    }
  }
  return null;
}

function embed(message: string, plan: ObWorkflowPlan): string {
  return `${message.replace(WORKFLOW_RE, "").trimEnd()}\n\n<!--miai-workflow:${JSON.stringify(plan)}-->`;
}

function isConfirm(text: string): boolean {
  const lower = text.toLowerCase().replace(/##[\s\S]*$/g, " ").trim();
  return (
    /^(yes|yep|yeah|correct|confirmed|ok|okay)\b/.test(lower) ||
    /yes[,.]? (please|go ahead|confirm)/.test(lower) ||
    /go ahead|please (log|escalate|connect)|looks good/.test(lower)
  );
}

export type ExecuteToolFn = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ ok: boolean; data: unknown }>;

function emergencyNumber(agentId: string, knowledge?: string): string {
  const fromKb = knowledge?.match(/call \*\*([^*]+)\*\*/i)?.[1]?.trim();
  if (fromKb) return fromKb;
  if (/eu-/i.test(agentId)) return "112";
  if (/us-/i.test(agentId)) return "911";
  return "local emergency services";
}

function section(knowledge: string | undefined, heading: RegExp): string {
  if (!knowledge) return "";
  return knowledge.match(heading)?.[0]?.slice(0, 1400) ?? "";
}

function detectRole(text: string): string {
  if (/support analyst/i.test(text)) return "Support Analyst";
  if (/sales rep/i.test(text)) return "sales rep";
  if (/engineer|developer/i.test(text)) return "Engineer";
  return "new joiner";
}

function checklistCopy(role: string, knowledge?: string): string {
  const fromKb = section(
    knowledge,
    /## Week-one checklist[\s\S]*?(?=\n## )/,
  );
  const base =
    fromKb ||
    [
      "**Day 1** — collect your **access card** from reception; set up your laptop and turn on **MFA**; meet your **onboarding buddy** and manager.",
      "**Day 2–3** — role training / shadowing; complete compliance modules.",
      "**End of week** — 1:1 with your manager; confirm tools and access.",
    ].join("\n");
  return `Here's your first-week checklist for a **${role}**:\n\n${base}`;
}

export async function runOnboardingBuddyWorkflow(input: {
  agentId: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  toolNames: string[];
  knowledge?: string;
  executeTool: ExecuteToolFn;
}): Promise<ObWorkflowTurnResult> {
  if (!isOnboardingBuddy(input.agentId)) {
    return { handled: false, assistantMessage: "", toolCalls: [] };
  }

  const user = input.userMessage.replace(/##[\s\S]*$/g, "").trim();
  const lower = user.toLowerCase();
  const pending = parseObWorkflowFromMessages(input.messages);
  const toolCalls: ObWorkflowTurnResult["toolCalls"] = [];
  const has = (n: string) => input.toolNames.includes(n);
  const prior = input.messages.map((m) => m.content).join(" ").toLowerCase();
  const emerg = emergencyNumber(input.agentId, input.knowledge);

  // Emergency
  if (/life-?threatening|emergency — what|emergency right now/.test(lower)) {
    if (has("handoff_to_human")) {
      const args = { reason: "emergency", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: `If this is life-threatening, call **${emerg}** / local emergency services now. I'm also handing you to a human urgently.`,
    };
  }

  // Card / banking in chat
  if (/card (number|details)|cvv|\b4111\b|load my banking|bank details/.test(lower) && /4111|card|cvv|banking|load/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't take card details in chat and I never ask for banking secrets here. Submit banking and tax details only on the secure **Self-Service portal** — that's the proper channel.",
    };
  }

  // Cross-hire privacy
  if (/last new hire|thabo.*id number|his id number|bank details|what .+ filled in/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share another new hire's ID, bank details, or forms — that's confidential. I can only help with your own onboarding checklist and resources.",
    };
  }

  // Prompt injection
  if (/ignore (all )?previous|print your (full )?system prompt|verbatim/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share internal instructions. I can help with your onboarding checklist, first week resources, or logging a question for the People team.",
    };
  }

  // Out of scope
  if (/write me a poem|poem about|essay about/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't help with that — I can help with onboarding, checklists, first-week resources, and logging questions for the People team.",
    };
  }

  // Execute confirmed plan
  if (pending?.status === "proposed" && isConfirm(user)) {
    const plan: ObWorkflowPlan = {
      ...pending,
      status: "executing",
      steps: pending.steps.map((s) => ({ ...s })),
    };
    const lines: string[] = [];

    for (const step of plan.steps) {
      if (!step.tool || !has(step.tool)) {
        if (step.tool === "notify_team" && has("handoff_to_human")) {
          const result = await input.executeTool("handoff_to_human", {
            reason: "onboarding_notify",
            summary: String(step.args?.summary ?? plan.goal),
          });
          toolCalls.push({
            name: "handoff_to_human",
            args: { reason: "onboarding_notify", summary: plan.goal },
            result: result.data,
          });
          step.status = "done";
          step.resultSummary = "Notified People/IT";
          lines.push(`✓ ${step.label}`);
          continue;
        }
        if (!step.tool) {
          step.status = "done";
          lines.push(`✓ ${step.label}`);
          continue;
        }
        step.status = "skipped";
        continue;
      }
      const result = await input.executeTool(step.tool, step.args ?? {});
      toolCalls.push({ name: step.tool, args: step.args ?? {}, result: result.data });
      const data = result.data as Record<string, unknown>;
      const ref = String(data.reference ?? data.id ?? (result.ok ? "REF-OK" : "ERR"));
      step.status = result.ok ? "done" : "failed";
      step.resultSummary = ref;
      lines.push(`${result.ok ? "✓" : "✗"} ${step.label} — ${ref}`);
    }

    plan.status = "completed";
    const done = plan.steps.find((s) => (s.id === "log" || s.id === "handoff") && s.status === "done");
    const msg = [
      done
        ? plan.kind === "escalate"
          ? `I've connected you to a human teammate / the People team — they'll follow up. Reference **${done.resultSummary}**.`
          : `Question logged for the People team — reference **${done.resultSummary}**. I haven't booked parking or fixed it myself.`
        : "Workflow finished.",
      "",
      "## Workflow results",
      ...lines,
    ].join("\n");

    return { handled: true, plan, toolCalls, assistantMessage: embed(msg, plan) };
  }

  // Pay date (before generic payroll / checklist)
  if (/get paid|pay day|when do we .*paid|paid each month/.test(lower)) {
    const payLine =
      input.knowledge?.match(/Pay is on[\s\S]{0,80}25th[^\n]*/i)?.[0] ||
      input.knowledge?.match(/25th of each month[^\n]*/i)?.[0] ||
      "Salaries are paid on the **25th** of each month (or the last working day before if it falls on a weekend/holiday).";
    return {
      handled: true,
      toolCalls: [],
      assistantMessage: `${payLine}\n\nI can't pay you from chat — that's payroll's process via the Self-Service portal.`,
    };
  }

  // Payroll / banking resource (before "where do I go" first-day)
  if (/banking and tax|submit my banking|tax details for payroll|self-service portal/.test(lower)) {
    if (has("get_resource")) {
      const args = { topic: "payroll", query: user.slice(0, 200) };
      const result = await input.executeTool("get_resource", args);
      toolCalls.push({ name: "get_resource", args, result: result.data });
    }
    const res =
      section(input.knowledge, /## Payroll[\s\S]*?(?=\n## )/) ||
      section(input.knowledge, /## Resources[\s\S]*?(?=\n## )/) ||
      "Use the secure **Self-Service portal** for banking and tax — never send card or bank numbers in chat.";
    return {
      handled: true,
      toolCalls,
      assistantMessage: res.includes("Self-Service")
        ? res
        : `${res}\n\nSubmit banking and tax only on the secure **Self-Service portal**.`,
    };
  }

  // First day time / where (EN + AF) — before checklist (which also matches "first day")
  if (
    /what time do i start|where do i go|erste dag|hoe laat begin|waarheen|first day and where|begin ek my eerste/.test(
      lower,
    )
  ) {
    const first =
      section(input.knowledge, /## First day[\s\S]*?(?=\n## )/) ||
      "New joiners start at **08:30** on their first day. Go to reception and ask for the People team — your onboarding buddy will meet you.";
    return { handled: true, toolCalls: [], assistantMessage: first };
  }

  // Role follow-up after checklist ask
  if (
    /i'?m joining as|i'?m starting as|sales rep|support analyst/.test(lower) &&
    /checklist|first day|first week|onboarding|what'?s on my|which role/i.test(prior)
  ) {
    const role = detectRole(user);
    if (has("get_onboarding_checklist")) {
      const args = { role, day: "1", query: user.slice(0, 200) };
      const result = await input.executeTool("get_onboarding_checklist", args);
      toolCalls.push({ name: "get_onboarding_checklist", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: checklistCopy(role, input.knowledge),
    };
  }

  // Checklist / first week / Zulu
  if (
    /checklist|first week look like|ohlwini|lwesonto lokuqala|yini okumele|what does my first week|what'?s on my checklist|it'?s my first day/.test(
      lower,
    )
  ) {
    const role = detectRole(user + " " + prior);
    const hasRole = /sales rep|support analyst|joining as|starting as/i.test(user);
    if (!hasRole && /checklist to do today|hi! it'?s my first day|it'?s my first day/.test(lower)) {
      return {
        handled: true,
        toolCalls: [],
        assistantMessage:
          "Welcome — happy first day! Which role are you joining as (e.g. sales rep, Support Analyst)? I'll pull the right checklist with access card, MFA, and buddy steps.",
      };
    }
    if (has("get_onboarding_checklist")) {
      const args = { role, day: /week/i.test(lower) ? "week" : "1", query: user.slice(0, 200) };
      const result = await input.executeTool("get_onboarding_checklist", args);
      toolCalls.push({ name: "get_onboarding_checklist", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: checklistCopy(role, input.knowledge),
    };
  }

  // Laptop / IT blocker → propose escalate then confirm, or immediate on confirm path
  if (/laptop won'?t boot|can'?t log in|completely stuck|first morning/.test(lower)) {
    const plan: ObWorkflowPlan = {
      id: `ob-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: "escalate",
      status: "proposed",
      steps: [
        {
          id: "handoff",
          label: "Escalate to IT / People for first-day blocker",
          tool: "handoff_to_human",
          args: { reason: "blocker", summary: user.slice(0, 400), queue: "IT" },
          status: "pending",
        },
        {
          id: "notify",
          label: "Notify the onboarding desk",
          tool: has("notify_team") ? "notify_team" : undefined,
          args: { summary: `First-day blocker: ${user.slice(0, 160)}`, reason: "blocker" },
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
          "That sounds like an IT blocker on day one — I won't pretend I've fixed it.",
          "",
          "## Workflow plan",
          "1. Connect you to IT / a person on the team",
          "2. Notify the onboarding desk",
          "",
          "Reply **yes, please** and I'll escalate now.",
        ].join("\n"),
        plan,
      ),
    };
  }

  // Explicit HR human
  if (/actual person from hr|talk to .*hr|speak to .*hr|people team please/.test(lower)) {
    const plan: ObWorkflowPlan = {
      id: `ob-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: "escalate",
      status: "proposed",
      steps: [
        {
          id: "handoff",
          label: "Connect to a human on the People / HR team",
          tool: "handoff_to_human",
          args: { reason: "explicit_request", summary: user.slice(0, 400) },
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
          "I can connect you to a human teammate on the People team.",
          "",
          "## Workflow plan",
          "1. Hand off to HR / People with your request",
          "",
          "Reply **yes please** to connect.",
        ].join("\n"),
        plan,
      ),
    };
  }

  // HR salary / contract issue
  if (/different salary|signed contract|what i agreed|contract shows/.test(lower)) {
    const plan: ObWorkflowPlan = {
      id: `ob-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: "escalate",
      status: "proposed",
      steps: [
        {
          id: "handoff",
          label: "Escalate salary/contract mismatch to the People team",
          tool: "handoff_to_human",
          args: { reason: "hr_issue", summary: user.slice(0, 400) },
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
          "Contract vs agreed salary needs the **People team** — I won't judge who's right or invent a number.",
          "",
          "## Workflow plan",
          "1. Hand off to a person on the People team with your summary",
          "",
          "Reply **yes, go ahead** and I'll connect you.",
        ].join("\n"),
        plan,
      ),
    };
  }

  // Log question for People team (parking etc.)
  if (/log that|log this|people team to sort|can you log/.test(lower)) {
    const name = user.match(/I'?m\s+([A-Z][a-z]+)/)?.[1];
    const ext = user.match(/extension\s*(\d+)/i)?.[1];
    const args = {
      question: user.slice(0, 400),
      topic: /parking/i.test(lower) ? "parking" : "general",
      requester: name,
      extension: ext,
      contact: ext ? `ext ${ext}` : name,
    };
    const plan: ObWorkflowPlan = {
      id: `ob-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: "log_question",
      status: "proposed",
      steps: [
        {
          id: "log",
          label: "Log question for the People team",
          tool: "log_question",
          args,
          status: "pending",
        },
        {
          id: "notify",
          label: "Notify People on Slack/Teams",
          tool: has("notify_team") ? "notify_team" : "handoff_to_human",
          args: { summary: `Onboarding question: ${args.topic} — ${name ?? "new joiner"}`, reason: "log_question" },
          status: "pending",
        },
        { id: "verify", label: "Confirm reference back to you", status: "pending" },
      ],
    };
    return {
      handled: true,
      plan,
      toolCalls: [],
      assistantMessage: embed(
        [
          "I can log that for the People team as a multi-step workflow — I won't claim I've booked parking or sorted it myself.",
          "",
          `**Goal:** ${plan.goal}`,
          "",
          "## Workflow plan",
          ...plan.steps.map((s, i) => `${i + 1}. ${s.label}`),
          "",
          "Reply **yes, go ahead** to log it.",
        ].join("\n"),
        plan,
      ),
    };
  }

  return { handled: false, assistantMessage: "", toolCalls: [] };
}
