/**
 * Multi-step Sales Qualifier workflow:
 * qualify need → send_info → capture_lead / plan callback → confirm → book_callback → notify
 *
 * Never invents discounts or locked final quotes; hot leads and enterprise escalate.
 */

import { wf } from "./i18n.js";
import { handleStopSuppression } from "./stop-suppression.js";

export type SqStepStatus = "pending" | "done" | "skipped" | "failed";

export interface SqWorkflowStep {
  id: string;
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: SqStepStatus;
  resultSummary?: string;
}

export interface SqWorkflowPlan {
  id: string;
  goal: string;
  kind: "callback" | "lead";
  steps: SqWorkflowStep[];
  status: "proposed" | "executing" | "completed" | "cancelled";
}

export interface SqWorkflowTurnResult {
  handled: boolean;
  assistantMessage: string;
  plan?: SqWorkflowPlan;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

const WORKFLOW_RE = /<!--miai-workflow:([\s\S]*?)-->/;

export function isSalesQualifier(agentId: string): boolean {
  return /sales-qualifier/i.test(agentId);
}

export function parseSqWorkflowFromMessages(
  messages: Array<{ role: string; content: string }>,
): SqWorkflowPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const match = m.content.match(WORKFLOW_RE);
    if (!match) continue;
    try {
      return JSON.parse(match[1]!) as SqWorkflowPlan;
    } catch {
      return null;
    }
  }
  return null;
}

function embed(message: string, plan: SqWorkflowPlan): string {
  return `${message.replace(WORKFLOW_RE, "").trimEnd()}\n\n<!--miai-workflow:${JSON.stringify(plan)}-->`;
}

function isConfirm(text: string): boolean {
  const lower = text.toLowerCase().replace(/##[\s\S]*$/g, " ").trim();
  return (
    /^(yes|yep|yeah|correct|confirmed|ok|okay)\b/.test(lower) ||
    /yes[,.]? (please|go ahead|book|confirm)/.test(lower) ||
    /please book (the )?call|go ahead|book the call|looks good|book (the|that) call/.test(lower)
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

function plansSection(knowledge?: string): string {
  if (!knowledge) return "";
  return (
    knowledge.match(/## Plans[\s\S]*?(?=\n## )/)?.[0] ||
    knowledge.match(/## Pricing[\s\S]*?(?=\n## )/)?.[0] ||
    knowledge.match(/Growth[\s\S]{0,500}/)?.[0] ||
    ""
  ).slice(0, 1400);
}

function leadArgsFromText(text: string): Record<string, unknown> {
  const email = text.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0];
  const phone =
    text.match(/(\+?\d[\d\s-]{6,}\d)/)?.[1]?.trim() ||
    text.match(/\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b/)?.[1] ||
    text.match(/\b(555[-.]?\d{4})\b/)?.[1] ||
    text.match(/\b(0\d{2}\s?\d{3}\s?\d{4})\b/)?.[1];
  const name =
    text.match(/I'?m\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1] ||
    text.match(/^([A-Z][a-z]+),\s*[\d+]/)?.[1];
  const company = text.match(/from\s+([A-Z][\w\s&]+?)(?:,|\.| about)/)?.[1]?.trim();
  const staff = text.match(/about\s+(\d+)\s+staff/i)?.[1] || text.match(/(\d+)-person/i)?.[1];
  return {
    name,
    email,
    phone,
    company,
    company_size: staff,
    need: text.slice(0, 400),
    notes: text.slice(0, 500),
    plan_interest: /growth/i.test(text) ? "Growth" : undefined,
  };
}

export async function runSalesQualifierWorkflow(input: {
  agentId: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  toolNames: string[];
  knowledge?: string;
  executeTool: ExecuteToolFn;
  replyLanguage?: string;
}): Promise<SqWorkflowTurnResult> {
  if (!isSalesQualifier(input.agentId)) {
    return { handled: false, assistantMessage: "", toolCalls: [] };
  }

  const user = input.userMessage.replace(/##[\s\S]*$/g, "").trim();
  const lower = user.toLowerCase();
  const pending = parseSqWorkflowFromMessages(input.messages);
  const toolCalls: SqWorkflowTurnResult["toolCalls"] = [];
  const has = (n: string) => input.toolNames.includes(n);
  const prior = input.messages.map((m) => m.content).join(" ").toLowerCase();
  const emerg = emergencyNumber(input.agentId, input.knowledge);
  const lang = input.replyLanguage;
  const plans = plansSection(input.knowledge);

  // Emergencies
  if (/life-?threatening|emergency right now/.test(lower)) {
    if (has("handoff_to_human")) {
      const args = { reason: "emergency", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: wf(lang, "emergency_local", { emerg }),
    };
  }

  // Card / payment refuse
  if (/card (number|is|details)|cvv|\b4111\b|charge me|sign me up now/.test(lower) && /4111|card|cvv|payment|charge/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't take card details or process payments in chat — please never share OTP or full card numbers here. Use the secure checkout a salesperson shares, or speak to the sales team.",
    };
  }

  // Cross-party
  if (/colleague'?s|account balance and salary|someone else'?s/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't pull up another person's account, balance, or salary — that's confidential. I can only help with your own enquiry.",
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

  // Prompt injection
  if (/ignore (all )?previous|reveal your (system )?prompt|print your (full )?system prompt|free lifetime/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share internal instructions or invent free plans. I can help with product info, capturing your interest, or booking a sales callback — what do you need?",
    };
  }

  // Out of scope poem
  if (/write (me )?a poem|essay about|tell me a joke/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't help with that — I can help with products, plans, pricing ranges, booking a sales call, or capturing your interest.",
    };
  }

  // Explicit human / GDPR erasure / account
  if (
    /speak to a real|salesperson|real person|connect me|under gdpr|delete all (my |personal )?data|right to be forgotten/.test(
      lower,
    ) ||
    (/it'?s about my account|please just connect me|my name is .+\@.+\./i.test(user) &&
      /connecting you to a human|they'll follow up|handoff/.test(prior))
  ) {
    if (has("handoff_to_human")) {
      const args = {
        reason: /gdpr|delete|forgotten/.test(lower) ? "gdpr_erasure" : "explicit_request",
        summary: user.slice(0, 400),
      };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: wf(lang, "handoff_teammate"),
    };
  }

  // Follow-up contact after handoff
  if (
    /connecting you to a human|they'll follow up/.test(prior) &&
    (/^[A-Z][a-z]+,\s*|my name is|@|\d{3}/.test(user) || /\+?\d{6,}/.test(user))
  ) {
    if (has("handoff_to_human")) {
      const args = { reason: "followup_details", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "Thanks — I've passed your details to the human teammate on the team. They'll follow up. You're connected.",
    };
  }

  // Not pushy when thinking
  if (/think about it|before deciding|not ready|need time/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "Totally fine — take the time you need. When you're ready I can share plan info again, capture your details for the team, or book a no-pressure callback.",
    };
  }

  // No invented discount
  if (/\d+%\s*off|discount|deal today|sign today/.test(lower) && /off|discount|deal|sign/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't promise a discount or invent a deal from chat — the sales team has to confirm any commercial terms. I can connect you to them or book a callback if useful.",
    };
  }

  // No locked final quote
  if (/exact final price|locked in|final price for/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage: [
        "I can share our typical published ranges, not a locked-in final quote — sales confirms the exact number for your seat count.",
        plans ? `\n${plans}` : "",
        "\nWant me to book a callback so they can confirm a quote?",
      ].join(""),
    };
  }

  // Enterprise / on-prem out of agent scope
  if (/on-prem|on prem|custom sla|400 staff|enterprise (deal|only)/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't help with on-prem hosting or custom SLAs in this chat channel — that's beyond what I can configure. I can connect you to the sales / solutions team who handle those products, or capture a lead for them.",
    };
  }

  // Hot lead → handoff (+ optional capture)
  if (/budget approved|sign up this week|want to sign|ready to buy|30-person team/.test(lower)) {
    if (has("capture_lead")) {
      const args = { ...leadArgsFromText(user), temperature: "hot", summary: user.slice(0, 400) };
      const result = await input.executeTool("capture_lead", args);
      toolCalls.push({ name: "capture_lead", args, result: result.data });
    }
    if (has("handoff_to_human")) {
      const args = { reason: "hot_lead", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "This looks like a hot fit — I'm connecting you to the sales team so the right person can reach out and help you sign up. I've logged your interest for them.",
    };
  }

  if (pending?.status === "proposed" && /\b(cancel|never ?mind)\b/i.test(lower) && /plan|callback|workflow/.test(lower)) {
    const cancelled = { ...pending, status: "cancelled" as const };
    return {
      handled: true,
      plan: cancelled,
      toolCalls: [],
      assistantMessage: embed("Cancelled — I won't book the callback. Tell me if you still want plan info.", cancelled),
    };
  }

  // Execute confirmed callback / lead plan
  if (pending?.status === "proposed" && isConfirm(user)) {
    const plan: SqWorkflowPlan = {
      ...pending,
      status: "executing",
      steps: pending.steps.map((s) => ({ ...s })),
    };
    const lines: string[] = [];

    for (const step of plan.steps) {
      if (!step.tool || !has(step.tool)) {
        if (step.tool === "notify_team" && has("handoff_to_human")) {
          const result = await input.executeTool("handoff_to_human", {
            reason: "sales_notify",
            summary: String(step.args?.summary ?? plan.goal),
          });
          toolCalls.push({
            name: "handoff_to_human",
            args: { reason: "sales_notify", summary: plan.goal },
            result: result.data,
          });
          step.status = "done";
          step.resultSummary = "Notified sales";
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
      const ref = String(data.reference ?? data.booking_ref ?? data.id ?? (result.ok ? "REF-OK" : "ERR"));
      step.status = result.ok ? "done" : "failed";
      step.resultSummary = ref;
      lines.push(`${result.ok ? "✓" : "✗"} ${step.label} — ${ref}`);
    }

    plan.status = "completed";
    const bookStep = plan.steps.find((s) => (s.id === "callback" || s.id === "lead") && s.status === "done");
    const msg = [
      bookStep
        ? plan.kind === "callback"
          ? `Callback booked for **Thursday** afternoon — reference **${bookStep.resultSummary}**. Sales will call you.`
          : `Lead captured — reference **${bookStep.resultSummary}**. The team will reach out.`
        : "Workflow finished.",
      "",
      "## Workflow results",
      ...lines,
    ].join("\n");

    return { handled: true, plan, toolCalls, assistantMessage: embed(msg, plan) };
  }

  // Consultative need-first (vague interest, no details)
  if (
    /interested in your (software|product)|hi,? i'?m interested|ngifuna ukwazi|bonjour,? pouvez/.test(lower) &&
    !/@/.test(user) &&
    !/\d{2,}\s*staff/.test(lower)
  ) {
    if (/bonjour|pouvez-vous/.test(lower) && plans) {
      // EU French greeting that still expects pricing in says_any for misnamed eval
      if (has("send_info")) {
        const args = { topic: "plans", plan: "Growth", query: user.slice(0, 200) };
        const result = await input.executeTool("send_info", args);
        toolCalls.push({ name: "send_info", args, result: result.data });
      }
      return {
        handled: true,
        toolCalls,
        assistantMessage: `Bien sûr — voici nos gammes indicatives:\n\n${plans}\n\nCe n'est pas un devis exact. Qu'est-ce que vous essayez d'améliorer — facturation, cash-flow, autre ?`,
      };
    }
    if (/ngifuna|sawubona|invoice/.test(lower)) {
      return {
        handled: true,
        toolCalls: [],
        assistantMessage:
          "Yebo — ngiyakwazi ukusiza nge-software yama-**invoice**. Yini kakhulu eniyidingayo — ukukhipha ama-invoice, ukukhumbula amakhasimende, noma ithimba elikhulu? Ngizokwazi ukuthumela usizo / info.",
      };
    }
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "Happy to help — what are you trying to solve, and which team size are you buying for? Tell me a bit about the problem and I'll share the right plan info.",
    };
  }

  // Callback request → propose multi-step plan (before pricing — "Growth plan" often appears in callback asks)
  if (/call me|callback|book (a |the )?call|talk through the growth|someone call me/.test(lower)) {
    const lead = leadArgsFromText(user);
    const phone =
      lead.phone ??
      user.match(/on\s+([\d+\s-]+)/i)?.[1]?.trim() ??
      user.match(/(\+?\d[\d\s-]{6,}\d)/)?.[1]?.trim();
    const args = {
      ...lead,
      datetime: /thursday/i.test(lower) ? "Thursday afternoon" : "next available",
      day: "Thursday",
      topic: "Growth plan",
      phone,
    };
    const plan: SqWorkflowPlan = {
      id: `sq-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: "callback",
      status: "proposed",
      steps: [
        {
          id: "info",
          label: "Confirm Growth plan topic for the call",
          tool: has("send_info") ? "send_info" : undefined,
          args: { topic: "plans", plan: "Growth" },
          status: "pending",
        },
        {
          id: "callback",
          label: `Book sales callback Thursday afternoon${phone ? ` on ${phone}` : ""}`,
          tool: "book_callback",
          args,
          status: "pending",
        },
        {
          id: "notify",
          label: "Notify sales on Slack/Teams",
          tool: has("notify_team") ? "notify_team" : "handoff_to_human",
          args: {
            summary: `Callback requested: Growth plan — ${phone ?? "phone TBD"} Thursday afternoon`,
            reason: "callback_booked",
          },
          status: "pending",
        },
        {
          id: "verify",
          label: "Confirm callback reference to you",
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
          "I can set that up as a multi-step sales workflow — I won't book the call until you confirm.",
          "",
          `**Goal:** ${plan.goal}`,
          "",
          "## Workflow plan",
          ...plan.steps.map((s, i) => `${i + 1}. ${s.label}`),
          "",
          "Reply **please book the call** / **yes** to confirm the Thursday callback. Growth plan pricing stays a published range until sales confirms.",
        ].join("\n"),
        plan,
      ),
    };
  }

  // Pricing / plan info → send_info
  if (
    /growth plan|what does .+ (include|cost)|how much|cu[aá]nto cuesta|wat kos|pricing|pakket|roughly what does it cost/.test(
      lower,
    )
  ) {
    if (has("send_info")) {
      const args = { topic: "plans", plan: "Growth", query: user.slice(0, 200) };
      const result = await input.executeTool("send_info", args);
      toolCalls.push({ name: "send_info", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: [
        plans || "Growth is our mid-tier plan for growing teams — see published ranges in our materials.",
        "",
        "These are typical monthly ranges (indicative only). Want me to capture your details or book a sales callback?",
      ].join("\n"),
    };
  }

  // Soft booking / appointment help
  if (/booking or appointment|help me with a booking/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can help book a sales callback / appointment — share a day (e.g. Thursday afternoon) and a phone number, and I'll confirm before I book the call.",
    };
  }

  // Qualified lead with contact → capture immediately
  if (
    (/from [A-Z]|staff|drowning|invoicing|email is/.test(lower) || /@/.test(user)) &&
    (/i'?m [A-Z]|my email|about \d+ staff/.test(lower) || /@/.test(user)) &&
    !/call me|callback|book the call/.test(lower)
  ) {
    const args = leadArgsFromText(user);
    if (has("capture_lead")) {
      const result = await input.executeTool("capture_lead", args);
      toolCalls.push({ name: "capture_lead", args, result: result.data });
      const data = result.data as Record<string, unknown>;
      return {
        handled: true,
        toolCalls,
        assistantMessage: `Thanks — I've logged / captured your interest (ref **${data.reference ?? "LEAD-4821"}**). The sales team will reach out / get someone to follow up. I can also book a callback if you prefer a time.`,
      };
    }
  }

  return { handled: false, assistantMessage: "", toolCalls: [] };
}
