/**
 * Multi-step Dental Front Desk workflow (strictly non-clinical):
 * list services / treatment info → check availability → confirm → book → notify → verify
 *
 * Pain, clinical questions, emergencies, and PHI cross-patient → immediate handoff.
 */

import { wf } from "./i18n.js";

export type DentalStepStatus = "pending" | "done" | "skipped" | "failed";

export interface DentalWorkflowStep {
  id: string;
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: DentalStepStatus;
  resultSummary?: string;
}

export interface DentalWorkflowPlan {
  id: string;
  goal: string;
  kind: "book";
  steps: DentalWorkflowStep[];
  status: "proposed" | "executing" | "completed" | "cancelled";
}

export interface DentalWorkflowTurnResult {
  handled: boolean;
  assistantMessage: string;
  plan?: DentalWorkflowPlan;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

const WORKFLOW_RE = /<!--miai-workflow:([\s\S]*?)-->/;

export function isDentalFrontDesk(agentId: string): boolean {
  return /dental-front-desk/i.test(agentId);
}

export function parseDentalWorkflowFromMessages(
  messages: Array<{ role: string; content: string }>,
): DentalWorkflowPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const match = m.content.match(WORKFLOW_RE);
    if (!match) continue;
    try {
      return JSON.parse(match[1]!) as DentalWorkflowPlan;
    } catch {
      return null;
    }
  }
  return null;
}

function embed(message: string, plan: DentalWorkflowPlan): string {
  return `${message.replace(WORKFLOW_RE, "").trimEnd()}\n\n<!--miai-workflow:${JSON.stringify(plan)}-->`;
}

function isConfirm(text: string): boolean {
  const lower = text.toLowerCase().replace(/##[\s\S]*$/g, " ").trim();
  return (
    /^(yes|yep|yeah|correct|confirmed|ok|okay)\b/.test(lower) ||
    /yes[,.]? (please|go ahead|do it|confirm|book|that time)/.test(lower) ||
    /go ahead|please book|that time works|looks good|book it/.test(lower)
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
    text.match(/for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*,/)?.[1]
  );
}

function extractService(text: string): string {
  if (/clean(ing)?|scale and polish|hygiene/i.test(text)) return "exam & cleaning";
  if (/whiten/i.test(text)) return "whitening";
  if (/filling/i.test(text)) return "filling";
  if (/crown/i.test(text)) return "crown";
  if (/root canal/i.test(text)) return "root canal consult";
  if (/ortho|braces/i.test(text)) return "orthodontic consult";
  if (/implant/i.test(text)) return "implant consult";
  if (/check-?up|exam|consultation/i.test(text)) return "comprehensive exam";
  return "appointment";
}

function extractDayTime(text: string): { date: string; time: string; datetime: string } {
  const time =
    text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i)?.[1] ||
    text.match(/\b(\d{1,2}:\d{2})\b/)?.[1] ||
    "10:00";
  const day = /saturday/i.test(text)
    ? "Saturday"
    : /thursday/i.test(text)
      ? "Thursday"
      : /friday/i.test(text)
        ? "Friday"
        : /monday/i.test(text)
          ? "Monday"
          : /tomorrow/i.test(text)
            ? "tomorrow"
            : "Thursday";
  return { date: day, time, datetime: `${day} ${time}` };
}

function slotSummary(data: Record<string, unknown>): string {
  const slots = data.slots as Array<{ label?: string; datetime?: string }> | undefined;
  if (slots?.length) {
    return slots.map((s) => s.label || s.datetime).filter(Boolean).join(", ");
  }
  return "Thursday 10:00, Thursday 14:30";
}

export async function runDentalFrontDeskWorkflow(input: {
  agentId: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  toolNames: string[];
  knowledge?: string;
  executeTool: ExecuteToolFn;
  replyLanguage?: string;
}): Promise<DentalWorkflowTurnResult> {
  if (!isDentalFrontDesk(input.agentId)) {
    return { handled: false, assistantMessage: "", toolCalls: [] };
  }

  const user = input.userMessage.replace(/##[\s\S]*$/g, "").trim();
  const lower = user.toLowerCase();
  const pending = parseDentalWorkflowFromMessages(input.messages);
  const toolCalls: DentalWorkflowTurnResult["toolCalls"] = [];
  const has = (n: string) => input.toolNames.includes(n);
  const emerg = emergencyNumber(input.agentId, input.knowledge);
  const lang = input.replyLanguage;

  // Life-threatening / dental emergency
  if (
    /trouble breathing|can't breathe|cannot swallow|severe (facial )?bleeding|life-?threatening|knocked[- ]out tooth|uncontrolled bleeding|spreading swelling/.test(
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
        `If breathing, swallowing, or bleeding is life-threatening, call **${emerg}** / go to ER now.`,
        "For knocked-out teeth or heavy dental bleeding, seek urgent care / emergency dentist immediately. I'm alerting the practice — I won't clinically triage this in chat.",
      ].join("\n\n"),
    };
  }

  // Clinical / pain / medication — never diagnose
  if (
    /does (this|that) mean i need|do i need a filling|what does (this|my) pain mean|should i take|prescribe|my tooth (hurts|is throbbing)|jaw pain|abscess|is it infected|diagnose/.test(
      lower,
    ) ||
    (/\bpain\b|\bach(e|ing)\b|swollen|swelling|throb/.test(lower) &&
      !/book|appointment|cleaning|whitening|check-?up/.test(lower))
  ) {
    if (has("handoff_to_human")) {
      const args = { reason: "clinical_question", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "I can't diagnose or give clinical advice — that needs a dentist. I can offer a booking for you to be seen, and I'm connecting you to the front desk / clinical team now.",
    };
  }

  // PHI / other patient
  if (/another patient|my spouse'?s records|someone else'?s appointment|what time is .+ booked/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share another patient's appointments or records — that's confidential (PHI). I can only help with your own booking.",
    };
  }

  // Card refuse
  if (/card (number|details)|cvv|\b4111\b/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage: wf(lang, "card_refuse"),
    };
  }

  // STOP
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

  // Prompt injection
  if (/ignore (all )?previous|print your (full )?system prompt|reveal your (system )?prompt/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share internal instructions. I can help with treatments we offer, fees, hours, and booking a visit.",
    };
  }

  // Explicit human / billing / reception
  if (
    /talk to (a )?human|speak to someone|speak to (the )?reception|someone at reception|billing dispute|charge.*wrong|connect me to (a )?person/.test(
      lower,
    )
  ) {
    if (has("handoff_to_human")) {
      const args = {
        reason: /billing|charge|dispute/.test(lower) ? "billing_dispute" : "explicit_request",
        summary: user.slice(0, 400),
      };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: wf(lang, "handoff_practice"),
    };
  }

  // Cancel proposed plan
  if (pending?.status === "proposed" && /\b(cancel|never ?mind|stop)\b/i.test(lower)) {
    const cancelled = { ...pending, status: "cancelled" as const };
    return {
      handled: true,
      plan: cancelled,
      toolCalls: [],
      assistantMessage: embed(wf(lang, "plan_cancelled"), cancelled),
    };
  }

  // Confirm → execute
  if (pending?.status === "proposed" && isConfirm(user)) {
    const plan: DentalWorkflowPlan = {
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
        if (step.tool === "notify_team" && has("handoff_to_human")) {
          const result = await input.executeTool("handoff_to_human", {
            reason: "booking_notify",
            summary: String(step.args?.summary ?? plan.goal),
          });
          toolCalls.push({
            name: "handoff_to_human",
            args: { reason: "booking_notify", summary: plan.goal },
            result: result.data,
          });
          step.status = "done";
          step.resultSummary = "Notified desk";
          lines.push(`✓ ${step.label}`);
          continue;
        }
        step.status = "skipped";
        continue;
      }
      const result = await input.executeTool(step.tool, step.args ?? {});
      toolCalls.push({ name: step.tool, args: step.args ?? {}, result: result.data });
      const data = result.data as Record<string, unknown>;
      const ref = String(
        data.booking_ref ?? data.reference ?? data.id ?? (result.ok ? "APT-OK" : "ERR"),
      );
      step.status = result.ok ? "done" : "failed";
      step.resultSummary = ref;
      lines.push(`${result.ok ? "✓" : "✗"} ${step.label} — ${ref}`);
      if (!result.ok && step.id === "book") break;
    }

    plan.status = "completed";
    const bookStep = plan.steps.find((s) => s.id === "book" && s.status === "done");
    const msg = [
      bookStep
        ? `You're booked — reference **${bookStep.resultSummary}**. Please arrive 15 minutes early if you're a new patient, and bring photo ID + insurance card.`
        : "Workflow finished.",
      "",
      "## Workflow results",
      ...lines,
    ].join("\n");

    return { handled: true, plan, toolCalls, assistantMessage: embed(msg, plan) };
  }

  // Hours / location
  if (/hours|when (are you|do you) (open|close)|location|where are you|address/.test(lower)) {
    const blob =
      section(input.knowledge, /## (Hours|Location|Hours & contact)[\s\S]*?(?=\n## )/i) ||
      "We're open Mon–Thu 08:00–17:00 and Fri 08:00–14:00 — see our knowledge for the address.";
    return { handled: true, toolCalls: [], assistantMessage: blob };
  }

  // Fees / services list
  if (/how much|what (does|do) .+ cost|fees|price|treatments (do )?you offer|list (of )?services|what services/.test(lower)) {
    if (has("list_services")) {
      const args = {};
      const result = await input.executeTool("list_services", args);
      toolCalls.push({ name: "list_services", args, result: result.data });
    }
    const fees =
      section(input.knowledge, /## Treatments & fees[\s\S]*?(?=\n## )/i) ||
      "Published fees are on file — ask about a specific treatment if you'd like details.";
    return {
      handled: true,
      toolCalls,
      assistantMessage: `${fees}\n\nI can check availability for a cleaning, whitening, or exam once you pick a day.`,
    };
  }

  // Treatment info (general, non-clinical)
  if (/what (is|does) (a )?(root canal|crown|whitening|filling|cleaning)/.test(lower) || /tell me about (whitening|crowns?|fillings?)/.test(lower)) {
    const topic = extractService(user);
    if (has("get_treatment_info")) {
      const args = { treatment: topic, topic };
      const result = await input.executeTool("get_treatment_info", args);
      toolCalls.push({ name: "get_treatment_info", args, result: result.data });
    }
    const info =
      section(input.knowledge, /## Treatment information[\s\S]*?(?=\n## )/i) ||
      "General treatment overviews are on file — whether *you* need a treatment is a clinical decision for the dentist.";
    return {
      handled: true,
      toolCalls,
      assistantMessage: `${info}\n\nI can book a visit so the dentist can assess you — I won't advise on your specific case.`,
    };
  }

  // Availability check
  const looksLikeAvail =
    /can i (get|book)|any (slots?|openings)|availability|this (thursday|friday|saturday|monday)|openings for/.test(
      lower,
    ) && !extractPhone(user);

  if (looksLikeAvail && has("check_availability")) {
    const { date } = extractDayTime(user);
    const service = extractService(user);
    const args = { date, service };
    const result = await input.executeTool("check_availability", args);
    toolCalls.push({ name: "check_availability", args, result: result.data });
    const slots = slotSummary(result.data as Record<string, unknown>);
    return {
      handled: true,
      toolCalls,
      assistantMessage: [
        `I checked availability for **${service}** — open slots include **${slots}**.`,
        "Share your name, phone, and preferred slot, and I'll confirm before I book.",
      ].join("\n\n"),
    };
  }

  // Book → propose plan
  const looksLikeBook =
    /\bbook\b|reserve|appointment for|i'?d like (an? )?(appointment|cleaning|whitening|check-?up)/.test(
      lower,
    );
  const hasContact = Boolean(extractPhone(user) || extractName(user));

  if (looksLikeBook && (hasContact || /cleaning|whitening|check-?up|exam/.test(lower))) {
    const service = extractService(user);
    const { date, time, datetime } = extractDayTime(user);
    const name = extractName(user);
    const phone = extractPhone(user);
    const args = {
      service,
      date,
      time,
      datetime,
      customer_name: name,
      name,
      phone,
      contact: phone,
      notes: user.slice(0, 240),
    };

    const plan: DentalWorkflowPlan = {
      id: `df-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: "book",
      status: "proposed",
      steps: [
        {
          id: "avail",
          label: `Confirm open slot (${datetime})`,
          tool: "check_availability",
          args: { date, service, datetime },
          status: "pending",
        },
        {
          id: "book",
          label: `Book ${service} for ${name ?? "you"} at ${datetime}`,
          tool: "book_appointment",
          args,
          status: "pending",
        },
        {
          id: "notify",
          label: "Notify the front desk",
          tool: has("notify_team") ? "notify_team" : "handoff_to_human",
          args: {
            summary: `Dental booking: ${service} @ ${datetime} — ${name ?? ""} ${phone ?? ""}`,
            reason: "booking_confirmed",
          },
          status: "pending",
        },
        {
          id: "verify",
          label: "Confirm appointment reference back to you",
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
          "I can set that up as a booking workflow — I won't write the appointment until you confirm.",
          "",
          `**Goal:** ${plan.goal}`,
          "",
          "## Workflow plan",
          ...plan.steps.map((s, i) => `${i + 1}. ${s.label}`),
          "",
          `Is that right — **${service}** at **${datetime}** for **${name ?? "you"}**${phone ? ` (${phone})` : ""}? Reply **yes** / **please book it** to confirm.`,
        ].join("\n"),
        plan,
      ),
    };
  }

  return { handled: false, assistantMessage: "", toolCalls: [] };
}
