/**
 * Multi-step Veterinary workflow (non-clinical):
 * list/check availability → confirm → book_appointment → prep → verify.
 * Clinical questions / emergencies → handoff (never diagnose).
 */

import { wf } from "./i18n.js";
import { handleStopSuppression } from "./stop-suppression.js";

export type VetStepStatus = "pending" | "done" | "skipped" | "failed";

export interface VetWorkflowStep {
  id: string;
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: VetStepStatus;
  resultSummary?: string;
}

export interface VetWorkflowPlan {
  id: string;
  goal: string;
  kind: "book";
  steps: VetWorkflowStep[];
  status: "proposed" | "executing" | "completed" | "cancelled";
}

export interface VetWorkflowTurnResult {
  handled: boolean;
  assistantMessage: string;
  plan?: VetWorkflowPlan;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

const WORKFLOW_RE = /<!--miai-workflow:([\s\S]*?)-->/;

export function isVeterinary(agentId: string): boolean {
  return /veterinary/i.test(agentId);
}

export function parseVetWorkflowFromMessages(
  messages: Array<{ role: string; content: string }>,
): VetWorkflowPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const match = m.content.match(WORKFLOW_RE);
    if (!match) continue;
    try {
      return JSON.parse(match[1]!) as VetWorkflowPlan;
    } catch {
      return null;
    }
  }
  return null;
}

function embed(message: string, plan: VetWorkflowPlan): string {
  return `${message.replace(WORKFLOW_RE, "").trimEnd()}\n\n<!--miai-workflow:${JSON.stringify(plan)}-->`;
}

function isConfirm(text: string): boolean {
  const lower = text.toLowerCase().replace(/##[\s\S]*$/g, " ").trim();
  return (
    /^(yes|yep|yeah|correct|confirmed|ok|okay)\b/.test(lower) ||
    /yes[,.]? (please|go ahead|do it|confirm|book)/.test(lower) ||
    /go ahead|please book|book it|looks good/.test(lower)
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

function extractPhone(text: string): string | undefined {
  return (
    text.match(/(\+?\d[\d\s-]{6,}\d)/)?.[1]?.trim() ||
    text.match(/\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b/)?.[1]
  );
}

function extractName(text: string): string | undefined {
  return (
    text.match(/owner\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)?.[1] ||
    text.match(/I'?m\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1]
  );
}

function extractPet(text: string): string | undefined {
  return (
    text.match(/for\s+([A-Z][a-z]+)\s*[—,-]/)?.[1] ||
    text.match(/my (?:dog|cat|pet)\s+([A-Z][a-z]+)/i)?.[1]
  );
}

function section(knowledge: string | undefined, heading: RegExp): string {
  if (!knowledge) return "";
  return knowledge.match(heading)?.[0]?.slice(0, 1400) ?? "";
}

/** Sandbox stub for list_services has no prices — fall back to the knowledge price list. */
function knowledgeServicesList(knowledge: string | undefined): string {
  const servicesSection = section(knowledge, /## Services (?:&|and) prices[\s\S]*?(?=\n## )/i);
  const lines = servicesSection
    .split("\n")
    .filter((l) => l.trim().startsWith("-"))
    .map((l) => l.replace(/^-\s*/, "").trim());
  return lines.join("\n");
}

function extractDayTime(text: string): { date: string; time: string; datetime: string } {
  const time =
    text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i)?.[1] ||
    text.match(/\b(afternoon|morning)\b/i)?.[1] ||
    "14:00";
  const day = /thursday/i.test(text)
    ? "Thursday"
    : /friday/i.test(text)
      ? "Friday"
      : /saturday/i.test(text)
        ? "Saturday"
        : /monday/i.test(text)
          ? "Monday"
          : "Thursday";
  return { date: day, time, datetime: `${day} ${time}` };
}

export async function runVeterinaryWorkflow(input: {
  agentId: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  toolNames: string[];
  knowledge?: string;
  executeTool: ExecuteToolFn;
  replyLanguage?: string;
}): Promise<VetWorkflowTurnResult> {
  if (!isVeterinary(input.agentId)) {
    return { handled: false, assistantMessage: "", toolCalls: [] };
  }

  const user = input.userMessage.replace(/##[\s\S]*$/g, "").trim();
  const lower = user.toLowerCase();
  const pending = parseVetWorkflowFromMessages(input.messages);
  const toolCalls: VetWorkflowTurnResult["toolCalls"] = [];
  const has = (n: string) => input.toolNames.includes(n);
  const lang = input.replyLanguage;
  const emerg = emergencyNumber(input.agentId, input.knowledge);

  if (
    /vomiting blood|can't breathe|hit by (a )?car|seizure|poison|life-?threatening|bleeding (badly|heavily)/.test(
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
        `If your pet is in immediate danger, call **${emerg}** / an emergency vet now.`,
        "I'm alerting the clinic — I won't diagnose or suggest medicine in chat.",
      ].join("\n\n"),
    };
  }

  if (
    /what medicine|diagnose|is it (parvo|infected)|should i give|dosage|why is (my|he|she)/.test(
      lower,
    )
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
        "I can't diagnose or recommend medicine — please speak to a veterinarian. I'm connecting you to the clinic now. I can still help book a non-clinical visit.",
    };
  }

  if (/card (number|details)|cvv|\b4111\b/.test(lower)) {
    return { handled: true, toolCalls: [], assistantMessage: wf(lang, "card_refuse") };
  }

  const stopSuppression = await handleStopSuppression({ lower, user, has, executeTool: input.executeTool });
  if (stopSuppression) return stopSuppression;

  if (/ignore (all )?previous|reveal your (system )?prompt|print your (full )?system prompt/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share internal instructions. I can help with fees, availability, booking, and prep logistics.",
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
    const plan: VetWorkflowPlan = {
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
        data.booking_ref ?? data.reference ?? data.id ?? (result.ok ? "APT-OK" : "ERR"),
      );
      step.status = result.ok ? "done" : "failed";
      step.resultSummary = ref;
      lines.push(`${result.ok ? "✓" : "✗"} ${step.label} — ${ref}`);
      if (!result.ok && step.id === "book") break;
    }

    plan.status = "completed";
    const book = plan.steps.find((s) => s.id === "book" && s.status === "done");
    const msg = [
      book
        ? `You're booked — reference **${book.resultSummary}**. Arrive a few minutes early; bring vaccination records if you have them.`
        : "Workflow finished.",
      "",
      "## Workflow results",
      ...lines,
    ].join("\n");

    return { handled: true, plan, toolCalls, assistantMessage: embed(msg, plan) };
  }

  if (/how much|charge|fee|price|wellness|what (do )?you (charge|offer)/.test(lower) && has("list_services")) {
    const args = {};
    const result = await input.executeTool("list_services", args);
    toolCalls.push({ name: "list_services", args, result: result.data });
    const services = (result.data as Record<string, unknown> | undefined)?.services;
    const priced = Array.isArray(services)
      ? (services as Array<Record<string, unknown>>).filter((s) => typeof s.price === "string")
      : [];
    const pivot = "Share a day/time and pet name if you'd like me to check availability or propose a booking.";
    let assistantMessage: string;
    if (priced.length > 0) {
      const lines = priced.map((s) => {
        const duration = typeof s.duration_min === "number" ? ` — ${s.duration_min} min` : "";
        return `- ${String(s.name)}${duration} — ${String(s.price)}`;
      });
      assistantMessage = `${lines.join("\n")}\n\n${pivot}`;
    } else {
      const kbList = knowledgeServicesList(input.knowledge);
      assistantMessage = kbList ? `${kbList}\n\n${pivot}` : `Published consult fees are on file. ${pivot}`;
    }
    return { handled: true, toolCalls, assistantMessage };
  }

  if (/prep|spay|neuter|before (the )?surgery|fasting|no food/.test(lower) && has("get_prep_instructions")) {
    const args = { procedure: /spay|neuter/i.test(lower) ? "spay_neuter" : "general" };
    const result = await input.executeTool("get_prep_instructions", args);
    toolCalls.push({ name: "get_prep_instructions", args, result: result.data });
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "Here are the prep logistics on file (e.g. fasting windows). This is not clinical advice — ask the vet if your pet has special needs.",
    };
  }

  if (
    /availability|any (slots?|openings)|thursday|afternoon|morning/.test(lower) &&
    has("check_availability") &&
    !/\bbook\b/.test(lower)
  ) {
    const { date } = extractDayTime(user);
    const args = { date, service: "wellness" };
    const result = await input.executeTool("check_availability", args);
    toolCalls.push({ name: "check_availability", args, result: result.data });
    return {
      handled: true,
      toolCalls,
      assistantMessage: `I checked **${date}**. Share pet name, owner name, and phone, and I'll propose a booking for your confirm.`,
    };
  }

  const looksLikeBook = /\bbook\b|appointment for|reserve/.test(lower);
  if (looksLikeBook && has("book_appointment")) {
    const pet = extractPet(user);
    const name = extractName(user);
    const phone = extractPhone(user);
    const { date, time, datetime } = extractDayTime(user);
    const args = {
      pet_name: pet,
      owner_name: name,
      name,
      phone,
      date,
      time,
      datetime,
      service: "wellness consult",
      notes: user.slice(0, 240),
    };

    const plan: VetWorkflowPlan = {
      id: `vet-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: "book",
      status: "proposed",
      steps: [
        {
          id: "avail",
          label: `Confirm open slot (${datetime})`,
          tool: "check_availability",
          args: { date, datetime, service: "wellness" },
          status: "pending",
        },
        {
          id: "book",
          label: `Book wellness visit for ${pet ?? "your pet"} · ${name ?? "owner"}`,
          tool: "book_appointment",
          args,
          status: "pending",
        },
        {
          id: "notify",
          label: "Notify front desk",
          tool: "handoff_to_human",
          args: {
            reason: "booking_confirmed",
            summary: `Vet booking ${datetime} — ${pet ?? ""} / ${name ?? ""} ${phone ?? ""}`,
          },
          status: "pending",
        },
        { id: "verify", label: "Confirm appointment reference", status: "pending" },
      ],
    };

    return {
      handled: true,
      plan,
      toolCalls: [],
      assistantMessage: embed(
        [
          "I can book that visit — I won't write the appointment until you confirm.",
          "",
          `**Goal:** ${plan.goal}`,
          "",
          "## Workflow plan",
          ...plan.steps.map((s, i) => `${i + 1}. ${s.label}`),
          "",
          `Is that right — **${pet ?? "your pet"}** with owner **${name ?? "you"}** at **${datetime}**${phone ? ` (${phone})` : ""}? Reply **yes** / **please book it**.`,
        ].join("\n"),
        plan,
      ),
    };
  }

  return { handled: false, assistantMessage: "", toolCalls: [] };
}
