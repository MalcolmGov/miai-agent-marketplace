/**
 * Multi-step Events & Venue workflow:
 * packages / date check → confirm → book_site_visit (and/or capture_enquiry) → notify → verify.
 */

import { wf } from "./i18n.js";

export type EvStepStatus = "pending" | "done" | "skipped" | "failed";

export interface EvWorkflowStep {
  id: string;
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: EvStepStatus;
  resultSummary?: string;
}

export interface EvWorkflowPlan {
  id: string;
  goal: string;
  kind: "site_visit" | "enquiry";
  steps: EvWorkflowStep[];
  status: "proposed" | "executing" | "completed" | "cancelled";
}

export interface EvWorkflowTurnResult {
  handled: boolean;
  assistantMessage: string;
  plan?: EvWorkflowPlan;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

const WORKFLOW_RE = /<!--miai-workflow:([\s\S]*?)-->/;

export function isEventsVenue(agentId: string): boolean {
  return /events-venue/i.test(agentId);
}

export function parseEvWorkflowFromMessages(
  messages: Array<{ role: string; content: string }>,
): EvWorkflowPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const match = m.content.match(WORKFLOW_RE);
    if (!match) continue;
    try {
      return JSON.parse(match[1]!) as EvWorkflowPlan;
    } catch {
      return null;
    }
  }
  return null;
}

function embed(message: string, plan: EvWorkflowPlan): string {
  return `${message.replace(WORKFLOW_RE, "").trimEnd()}\n\n<!--miai-workflow:${JSON.stringify(plan)}-->`;
}

function isConfirm(text: string): boolean {
  const lower = text.toLowerCase().replace(/##[\s\S]*$/g, " ").trim();
  return (
    /^(yes|yep|yeah|correct|confirmed|ok|okay)\b/.test(lower) ||
    /yes[,.]? (please|go ahead|book|confirm)/.test(lower) ||
    /please book|go ahead|book it|looks good/.test(lower)
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
    text.match(/\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b/)?.[1]
  );
}

function extractName(text: string): string | undefined {
  return (
    text.match(/Name'?s\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1] ||
    text.match(/I'?m\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1] ||
    text.match(/—\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*,/)?.[1]
  );
}

function extractDayTime(text: string): { date: string; time: string; datetime: string } {
  const time =
    text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i)?.[1] ||
    text.match(/\b(\d{1,2}:\d{2})\b/)?.[1] ||
    "10:00";
  const date =
    text.match(/\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/i)?.[1] ||
    (/saturday/i.test(text)
      ? "Saturday"
      : /thursday/i.test(text)
        ? "Thursday"
        : /friday/i.test(text)
          ? "Friday"
          : /monday/i.test(text)
            ? "Monday"
            : "Thursday");
  return { date, time, datetime: `${date} ${time}` };
}

export async function runEventsVenueWorkflow(input: {
  agentId: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  toolNames: string[];
  knowledge?: string;
  executeTool: ExecuteToolFn;
  replyLanguage?: string;
}): Promise<EvWorkflowTurnResult> {
  if (!isEventsVenue(input.agentId)) {
    return { handled: false, assistantMessage: "", toolCalls: [] };
  }

  const user = input.userMessage.replace(/##[\s\S]*$/g, "").trim();
  const lower = user.toLowerCase();
  const pending = parseEvWorkflowFromMessages(input.messages);
  const toolCalls: EvWorkflowTurnResult["toolCalls"] = [];
  const has = (n: string) => input.toolNames.includes(n);
  const lang = input.replyLanguage;

  if (/card (number|details)|cvv|\b4111\b|deposit (here|in chat)|pay (the )?deposit/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't take card details or deposits in chat. Use the secure payment link the events team sends, or speak to the coordinator.",
    };
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
      assistantMessage:
        "Understood — STOP acknowledged. You won't receive marketing texts; I'm handing off so suppression is completed.",
    };
  }

  if (/ignore (all )?previous|reveal your (system )?prompt|print your (full )?system prompt/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share internal instructions. I can help with packages, date checks, enquiries, and site visits.",
    };
  }

  if (
    /multi-?day|complex (event|wedding)|talk to (a )?human|speak to (the )?coordinator|custom quote/.test(
      lower,
    )
  ) {
    if (has("handoff_to_human")) {
      const args = { reason: "complex_enquiry", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: "Connecting you to the events coordinator for that.",
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
    const plan: EvWorkflowPlan = {
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
      const ref = String(
        data.booking_ref ?? data.reference ?? data.id ?? (result.ok ? "VISIT-OK" : "ERR"),
      );
      step.status = result.ok ? "done" : "failed";
      step.resultSummary = ref;
      lines.push(`${result.ok ? "✓" : "✗"} ${step.label} — ${ref}`);
      if (!result.ok && (step.id === "book" || step.id === "enquiry")) break;
    }

    plan.status = "completed";
    const book = plan.steps.find((s) => (s.id === "book" || s.id === "enquiry") && s.status === "done");
    const msg = [
      book
        ? `You're set — reference **${book.resultSummary}**. The events team will confirm details; this is not a venue hire contract.`
        : "Workflow finished.",
      "",
      "## Workflow results",
      ...lines,
    ].join("\n");

    return { handled: true, plan, toolCalls, assistantMessage: embed(msg, plan) };
  }

  if (/package|how much|price|wedding packages|what (do )?you offer/.test(lower) && has("get_packages")) {
    const args = {};
    const result = await input.executeTool("get_packages", args);
    toolCalls.push({ name: "get_packages", args, result: result.data });
    const blob =
      section(input.knowledge, /## (Packages|Pricing)[\s\S]*?(?=\n## )/i) ||
      "Published packages are on file — ask about a site visit if you'd like to see the space.";
    return {
      handled: true,
      toolCalls,
      assistantMessage: `${blob}\n\nI can check a date or book a site visit once you share a preferred day.`,
    };
  }

  if (
    (/available|availability|is .+ free|open (on|for)/.test(lower) || /\d{4}/.test(lower)) &&
    has("check_date_availability") &&
    !/book a site|site visit/.test(lower)
  ) {
    const { date } = extractDayTime(user);
    const args = { date, event_date: date };
    const result = await input.executeTool("check_date_availability", args);
    toolCalls.push({ name: "check_date_availability", args, result: result.data });
    return {
      handled: true,
      toolCalls,
      assistantMessage: [
        `I checked **${date}** against our calendar.`,
        "Share your name, phone, and a site-visit slot if you'd like me to propose a booking workflow.",
      ].join("\n\n"),
    };
  }

  const looksLikeVisit = /book a site visit|site visit|tour (the )?(venue|estate|grounds)/.test(lower);
  const looksLikeEnquiry =
    /capture (an? )?enquiry|quote for|wedding for \d+|120-guest|corporate (event|away)/.test(lower);

  if ((looksLikeVisit || looksLikeEnquiry) && (has("book_site_visit") || has("capture_enquiry"))) {
    const name = extractName(user);
    const phone = extractPhone(user);
    const { date, time, datetime } = extractDayTime(user);
    const guests = user.match(/(\d+)\s*-?\s*guest/i)?.[1];

    if (looksLikeEnquiry && has("capture_enquiry") && !looksLikeVisit) {
      const args = {
        name,
        phone,
        guests,
        event_type: /wedding/i.test(lower) ? "wedding" : "corporate",
        notes: user.slice(0, 240),
      };
      const plan: EvWorkflowPlan = {
        id: `ev-${Date.now().toString(36)}`,
        goal: user.slice(0, 240),
        kind: "enquiry",
        status: "proposed",
        steps: [
          {
            id: "enquiry",
            label: `Capture enquiry for ${name ?? "you"}`,
            tool: "capture_enquiry",
            args,
            status: "pending",
          },
          {
            id: "notify",
            label: "Notify events coordinator",
            tool: "handoff_to_human",
            args: { reason: "enquiry_captured", summary: user.slice(0, 200) },
            status: "pending",
          },
          { id: "verify", label: "Confirm enquiry reference", status: "pending" },
        ],
      };
      return {
        handled: true,
        plan,
        toolCalls: [],
        assistantMessage: embed(
          [
            "I can capture that enquiry — I won't write it until you confirm.",
            "",
            "## Workflow plan",
            ...plan.steps.map((s, i) => `${i + 1}. ${s.label}`),
            "",
            "Reply **yes** / **go ahead** to confirm.",
          ].join("\n"),
          plan,
        ),
      };
    }

    const args = {
      name,
      phone,
      date,
      time,
      datetime,
      notes: user.slice(0, 240),
    };

    const plan: EvWorkflowPlan = {
      id: `ev-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: "site_visit",
      status: "proposed",
      steps: [
        {
          id: "avail",
          label: `Check calendar for ${datetime}`,
          tool: "check_date_availability",
          args: { date, datetime },
          status: "pending",
        },
        {
          id: "book",
          label: `Book site visit for ${name ?? "you"} at ${datetime}`,
          tool: "book_site_visit",
          args,
          status: "pending",
        },
        {
          id: "notify",
          label: "Notify events desk",
          tool: "handoff_to_human",
          args: {
            reason: "site_visit_booked",
            summary: `Site visit ${datetime} — ${name ?? ""} ${phone ?? ""}`,
          },
          status: "pending",
        },
        { id: "verify", label: "Confirm visit reference", status: "pending" },
      ],
    };

    return {
      handled: true,
      plan,
      toolCalls: [],
      assistantMessage: embed(
        [
          "I can book a site visit — I won't write the calendar event until you confirm.",
          "",
          `**Goal:** ${plan.goal}`,
          "",
          "## Workflow plan",
          ...plan.steps.map((s, i) => `${i + 1}. ${s.label}`),
          "",
          `Is that right — site visit **${datetime}** for **${name ?? "you"}**${phone ? ` (${phone})` : ""}? Reply **yes** / **please book it** to confirm.`,
        ].join("\n"),
        plan,
      ),
    };
  }

  return { handled: false, assistantMessage: "", toolCalls: [] };
}
