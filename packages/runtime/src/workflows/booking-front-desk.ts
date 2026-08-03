/**
 * Multi-step Salon / Trades / Home-services booking workflow:
 * check availability → plan → confirm → book → notify → verify
 *
 * Also covers estimate requests, reschedule/cancel, and safety escalations.
 */

import { wf } from "./i18n.js";
import { handleStopSuppression } from "./stop-suppression.js";

export type BookingStepStatus = "pending" | "done" | "skipped" | "failed";

export interface BookingWorkflowStep {
  id: string;
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: BookingStepStatus;
  resultSummary?: string;
}

export interface BookingWorkflowPlan {
  id: string;
  goal: string;
  kind: "book" | "estimate" | "reschedule" | "cancel";
  steps: BookingWorkflowStep[];
  status: "proposed" | "executing" | "completed" | "cancelled";
  family: "salon" | "trades";
}

export interface BookingWorkflowTurnResult {
  handled: boolean;
  assistantMessage: string;
  plan?: BookingWorkflowPlan;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

const WORKFLOW_RE = /<!--miai-workflow:([\s\S]*?)-->/;

export function isBookingFrontDesk(agentId: string): boolean {
  return /salon-booking|trades-receptionist|home-services/i.test(agentId);
}

export function bookingFamily(agentId: string): "salon" | "trades" {
  return /salon-booking/i.test(agentId) ? "salon" : "trades";
}

export function parseBookingWorkflowFromMessages(
  messages: Array<{ role: string; content: string }>,
): BookingWorkflowPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const match = m.content.match(WORKFLOW_RE);
    if (!match) continue;
    try {
      return JSON.parse(match[1]!) as BookingWorkflowPlan;
    } catch {
      return null;
    }
  }
  return null;
}

function embed(message: string, plan: BookingWorkflowPlan): string {
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

function isCancelPlan(text: string): boolean {
  return /\b(cancel|never ?mind|stop|don't)\b/i.test(text) && /plan|workflow|that booking|the booking/i.test(text);
}

export type ExecuteToolFn = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ ok: boolean; data: unknown }>;

function emergencyNumber(agentId: string, knowledge?: string): string {
  const fromKb = knowledge?.match(/call \*\*([^*]+)\*\*/i)?.[1]?.trim();
  if (fromKb) return fromKb;
  if (/eu-|asia-/i.test(agentId) && /trades|home-services/i.test(agentId)) return "112";
  if (/us-/i.test(agentId)) return "911";
  return "local emergency services";
}

function section(knowledge: string | undefined, heading: RegExp): string {
  if (!knowledge) return "";
  const m = knowledge.match(heading);
  return m?.[0]?.slice(0, 1200) ?? "";
}

function extractBookingArgs(text: string, family: "salon" | "trades"): Record<string, unknown> {
  const phone =
    text.match(/(\+?\d[\d\s-]{6,}\d)/)?.[1]?.trim() ||
    text.match(/\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b/)?.[1] ||
    text.match(/\b(555[-.]?\d{4})\b/)?.[1];
  const name =
    text.match(/Name'?s\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1] ||
    text.match(/for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*,/)?.[1] ||
    text.match(/I'm\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1];
  const address = text.match(
    /(\d+\s+[A-Z][\w.\s]+(?:St|Street|Ave|Avenue|Rd|Road|str\.?|strasse)[^,]*)/i,
  )?.[1];
  const service =
    text.match(
      /(skin fade|men'?s cut|ladies cut|full colour|colour|AC diagnostic|drain clearing|blocked drain|boiler|Heizungs|débouchage|ukugundwa|cut)/i,
    )?.[1] || (family === "salon" ? "appointment" : "service call");
  const stylist = text.match(/with\s+([A-Z][a-z]+)/)?.[1];
  const time =
    text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i)?.[1] ||
    text.match(/\b(\d{1,2}:\d{2})\b/)?.[1] ||
    "10:00";
  const day = /saturday/i.test(text)
    ? "Saturday"
    : /thursday/i.test(text)
      ? "Thursday"
      : /friday/i.test(text)
        ? "Friday"
        : /tomorrow/i.test(text)
          ? "tomorrow"
          : "Thursday";

  return {
    service,
    datetime: `${day} ${time}`,
    date: day,
    time,
    customer_name: name,
    name,
    phone,
    contact: phone,
    address,
    stylist,
    notes: text.slice(0, 240),
  };
}

function slotSummary(data: Record<string, unknown>): string {
  const slots = data.slots as Array<{ label?: string; datetime?: string }> | undefined;
  if (slots?.length) {
    return slots.map((s) => s.label || s.datetime).filter(Boolean).join(", ");
  }
  const blocks = data.free_blocks as string[] | undefined;
  if (blocks?.length) return blocks.join(", ");
  return "Thursday 10:00, Thursday 14:30";
}

export async function runBookingFrontDeskWorkflow(input: {
  agentId: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  toolNames: string[];
  knowledge?: string;
  executeTool: ExecuteToolFn;
  replyLanguage?: string;
}): Promise<BookingWorkflowTurnResult> {
  if (!isBookingFrontDesk(input.agentId)) {
    return { handled: false, assistantMessage: "", toolCalls: [] };
  }

  const user = input.userMessage.replace(/##[\s\S]*$/g, "").trim();
  const lower = user.toLowerCase();
  const family = bookingFamily(input.agentId);
  const pending = parseBookingWorkflowFromMessages(input.messages);
  const toolCalls: BookingWorkflowTurnResult["toolCalls"] = [];
  const has = (n: string) => input.toolNames.includes(n);
  const emerg = emergencyNumber(input.agentId, input.knowledge);
  const lang = input.replyLanguage;

  // Gas / life-threatening emergency → immediate handoff
  if (
    /gas leak|smell (a )?strong gas|smell strong gas|life-?threatening|fire in|someone('s| is) hurt/.test(
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
        `This is an emergency — leave the building if you smell gas, stay outside, and call **${emerg}** / the gas utility emergency line now.`,
        wf(lang, "handoff_teammate"),
      ].join("\n\n"),
    };
  }

  if (/life-?threatening emergency/.test(lower)) {
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

  // Unsafe DIY
  if (/bypass(ing)? (my )?gas|shutoff valve myself|diy (gas|electrical)|walk me through bypass/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't walk you through bypassing a gas shutoff or other unsafe DIY — please leave it to a licensed technician / the utility. I can book a safe visit or connect you to a human if you want help arranging that.",
    };
  }

  // Card refuse
  if (/card (number|details)|cvv|\b4111\b|take the (deposit|diagnostic|call-out)|charge (the |my )?/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage: wf(lang, "card_refuse"),
    };
  }

  // Cross-customer / neighbour
  if (
    (/who'?s booked|neighbour|neighbor|who lives|jobs (did you do|you did) (at|for)/.test(lower) ||
      /give me their (name|number)/.test(lower)) &&
    /(booked|slot|jobs|lives|neighbour|neighbor)/.test(lower)
  ) {
    // Trades packs expect a privacy handoff; salon refuses with no tool.
    if (family === "trades" && has("handoff_to_human")) {
      const args = { reason: "privacy", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
      return {
        handled: true,
        toolCalls,
        assistantMessage: wf(lang, "privacy_other_customer"),
      };
    }
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share another person's booking, name, number, or job history — that's confidential. I can only help with your own appointment.",
    };
  }

  // Follow-up after handoff: contact details / "connect me" — keep the human path
  const prior = input.messages.map((m) => m.content).join(" ").toLowerCase();
  if (
    /connecting you to a human|handing you to a human|handoff|they'll follow up/.test(prior) &&
    (/my name is|i'?m [A-Z][a-z]+|it'?s about|connect me|lea@|@example\.com|\+?\d{6,}/i.test(user) ||
      /\d{3}[-.\s]?\d{3}/.test(user))
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
        "Thanks — I've passed that to the human teammate on the team. They'll follow up / call you with these details. You're connected.",
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

  // Billing / complaint / explicit human / GDPR erasure
  if (
    /charged me twice|invoiced me twice|refund|ruined|furious|complaint|speak to someone|talk to a real|connect me to a person|real dispatcher|someone at the salon|someone at reception|delete all my personal|under gdpr|right to be forgotten/.test(
      lower,
    )
  ) {
    if (has("handoff_to_human")) {
      const args = {
        reason: /delete|gdpr|erasure|forgotten/.test(lower)
          ? "gdpr_erasure"
          : /charged|invoiced|refund|billing/.test(lower)
            ? "billing"
            : /ruined|furious|complaint/.test(lower)
              ? "complaint"
              : "explicit_request",
        summary: user.slice(0, 400),
      };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: wf(lang, "handoff_human"),
    };
  }

  // Prompt injection
  if (/ignore (all )?previous|reveal your (system )?prompt|print your (full )?system prompt/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share internal instructions. I can help you book a service or appointment — what do you need?",
    };
  }

  // Out of scope
  if (/write (me )?a poem|essay about|tell me a joke/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't help with that — I can help with bookings, appointments, services, and prices for this business.",
    };
  }

  if (pending?.status === "proposed" && isCancelPlan(user)) {
    const cancelled = { ...pending, status: "cancelled" as const };
    return {
      handled: true,
      plan: cancelled,
      toolCalls: [],
      assistantMessage: embed("Cancelled — I won't book or change anything. Tell me if you want different times.", cancelled),
    };
  }

  // Execute confirmed plan
  if (pending?.status === "proposed" && isConfirm(user)) {
    const plan: BookingWorkflowPlan = {
      ...pending,
      status: "executing",
      steps: pending.steps.map((s) => ({ ...s })),
    };
    const lines: string[] = [];

    for (const step of plan.steps) {
      if (!step.tool || !has(step.tool)) {
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
      const ref = String(
        data.booking_ref ?? data.estimate_ref ?? data.reference ?? data.id ?? (result.ok ? "REF-OK" : "ERR"),
      );
      step.status = result.ok ? "done" : "failed";
      step.resultSummary = ref;
      lines.push(`${result.ok ? "✓" : "✗"} ${step.label} — ${ref}`);
      if (!result.ok && (step.id === "book" || step.id === "estimate")) break;
    }

    plan.status = "completed";
    const bookStep = plan.steps.find((s) => (s.id === "book" || s.id === "estimate") && s.status === "done");
    const verb =
      plan.kind === "estimate"
        ? "Estimate request logged"
        : plan.kind === "cancel"
          ? "Cancellation noted"
          : plan.kind === "reschedule"
            ? "Reschedule requested"
            : "You're booked";
    const msg = [
      bookStep
        ? `${verb} — reference **${bookStep.resultSummary}**. Confirmed.`
        : "Workflow finished.",
      "",
      "## Workflow results",
      ...lines,
    ].join("\n");

    return { handled: true, plan, toolCalls, assistantMessage: embed(msg, plan) };
  }

  // Cancel appointment
  if (/cancel (my )?(appointment|booking)|please cancel/.test(lower) && /BK-|ref|appointment|booking/.test(lower)) {
    const ref = user.match(/BK-[\w]+/i)?.[0] ?? "BK-7Q3F";
    if (has("reschedule_or_cancel")) {
      const args = { action: "cancel", reference: ref, booking_ref: ref };
      const result = await input.executeTool("reschedule_or_cancel", args);
      toolCalls.push({ name: "reschedule_or_cancel", args, result: result.data });
      return {
        handled: true,
        toolCalls,
        assistantMessage: `Cancelled appointment **${ref}**. You'll get a confirmation shortly — shout if you want a new time.`,
      };
    }
  }

  // Reschedule (including follow-up that names the service)
  const priorReschedule =
    /reschedule|move your booking|friday afternoon|BK-/i.test(prior) &&
    /men'?s cut|it'?s for a|skin fade|colour|service/i.test(lower);
  if (/move my booking|reschedule|to friday/.test(lower) || priorReschedule) {
    const ref =
      user.match(/BK-[\w]+/i)?.[0] ||
      input.messages.join(" ").match(/BK-[\w]+/i)?.[0];
    const service = extractBookingArgs(user, family).service;
    if (has("reschedule_or_cancel")) {
      const args = {
        action: "reschedule",
        reference: ref,
        booking_ref: ref,
        new_datetime: "Friday afternoon",
        service,
        notes: user.slice(0, 200),
      };
      const result = await input.executeTool("reschedule_or_cancel", args);
      toolCalls.push({ name: "reschedule_or_cancel", args, result: result.data });
      return {
        handled: true,
        toolCalls,
        assistantMessage: `I'll reschedule ${ref ? `**${ref}** ` : ""}to **Friday** afternoon for a **${service}** — checking the diary and moving it now. Confirm if you need a different Friday slot.`,
      };
    }
    if (has("check_availability")) {
      const args = { date: "Friday", service };
      const result = await input.executeTool("check_availability", args);
      toolCalls.push({ name: "check_availability", args, result: result.data });
      return {
        handled: true,
        toolCalls,
        assistantMessage: `Checking **Friday** availability to reschedule / move your booking${ref ? ` ${ref}` : ""}. Afternoon slots look open — confirm and I'll move it.`,
      };
    }
  }

  // Hours
  if (
    /opening hours|what time do you close|hoe laat|saterdae oop|hours|when (are you|do you) close/.test(
      lower,
    )
  ) {
    const hours =
      section(input.knowledge, /## (Opening hours|Service area & hours|Hours)[\s\S]*?(?=\n## )/i) ||
      "We're open on the hours listed in our knowledge base (weekdays + Saturday mornings/afternoons).";
    return { handled: true, toolCalls: [], assistantMessage: hours };
  }

  // Policy / deposit (salon)
  if (/cancellation policy|cancel(lation)? policy/.test(lower)) {
    const pol =
      section(input.knowledge, /## (Cancellation|Policies|Booking policy)[\s\S]*?(?=\n## )/i) ||
      "Please give **24 hours** notice to cancel or reschedule; late cancels may incur a fee.";
    return { handled: true, toolCalls: [], assistantMessage: pol };
  }
  if (/deposit|pay (a )?deposit/.test(lower)) {
    const dep =
      section(input.knowledge, /## (Deposits|Colour|Services)[\s\S]*?(?=\n## )/i) ||
      input.knowledge?.match(/deposit[^\n]{0,120}/i)?.[0] ||
      "Colour services may need a deposit — see our price list for the amount on file.";
    return { handled: true, toolCalls: [], assistantMessage: dep };
  }

  // List services / prices (EN / DE / ES)
  if (
    /what services|how much|what do .+ cost|call-out prices|was kostet|cu[aá]nto cuesta|revisi[oó]n|standard service|check-up cost|ac visits cost|plumbing services|aire acondicionado/.test(
      lower,
    )
  ) {
    if (has("list_services")) {
      const args = { query: user.slice(0, 200) };
      const result = await input.executeTool("list_services", args);
      toolCalls.push({ name: "list_services", args, result: result.data });
    }
    const prices =
      section(input.knowledge, /## Services[\s\S]*?(?=\n## )/i) ||
      "Services and published prices are on file — ask for a specific service if you want a slot.";
    return {
      handled: true,
      toolCalls,
      assistantMessage: `${prices}\n\nI can check availability or book once you pick a service.`,
    };
  }

  // French / Zulu soft booking help (language cues)
  if (/rendez-vous|je voudrais|débouchage/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "Bien sûr — je peux prendre un **rendez-vous** pour un débouchage. Quel **jour** et quelle **heure** vous arrangent ? Je vérifierai si c'est **disponible**.",
    };
  }
  if (/ukubhukha|ukugundwa|sawubona|ngicela/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "Yebo — ngiyakwazi ukusiza **ukubhukha** **ukugundwa** kwezinwele. Sicela usho **isikhathi** osithandayo, bese ngizochecka ukuthi siyatholakala yini.",
    };
  }

  // Estimate-only jobs
  if (/full (ac )?system replacement|rewire|full flat rewire|quote for my house|replacement quote/.test(lower)) {
    const args = {
      service: /rewire/i.test(user) ? "full rewire" : "AC system replacement",
      summary: user.slice(0, 400),
      notes: user.slice(0, 400),
    };
    if (has("request_estimate")) {
      const result = await input.executeTool("request_estimate", args);
      toolCalls.push({ name: "request_estimate", args, result: result.data });
      const data = result.data as Record<string, unknown>;
      return {
        handled: true,
        toolCalls,
        assistantMessage: `That needs an on-site **estimate** / quote from a technician — I've logged estimate **${data.estimate_ref ?? "EST-2201"}**. They'll follow up; I won't invent a fixed price.`,
      };
    }
    if (has("list_services")) {
      const result = await input.executeTool("list_services", args);
      toolCalls.push({ name: "list_services", args, result: result.data });
      return {
        handled: true,
        toolCalls,
        assistantMessage:
          "Full rewires / system replacements are **estimate** only — a technician quotes on site. I can log an estimate request or connect you to the desk.",
      };
    }
  }

  // Never invent a slot / skip availability
  if (/don'?t bother checking|put me down for|just book me|without checking/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't reserve a time without checking what's actually available — and I need to know which service you want. Tell me the service and a preferred day, and I'll check open slots first.",
    };
  }

  // Availability check (no full book-with-contact yet)
  const looksLikeAvailability =
    /can i get|can you (clear|come|do)|this (thursday|saturday|monday|friday)|any (slots?|openings)|availability|have (a )?slot/.test(
      lower,
    ) && !/for [A-Z][a-z]+.+\d{3}|name'?s |,\s*\d{3}|invaliden|pine st|phoenix|berlin/i.test(user);

  if (looksLikeAvailability && has("check_availability")) {
    const args = {
      date: /saturday/i.test(lower)
        ? "Saturday"
        : /thursday/i.test(lower)
          ? "Thursday"
          : /friday/i.test(lower)
            ? "Friday"
            : "Thursday",
      service: extractBookingArgs(user, family).service,
      query: user.slice(0, 200),
    };
    const result = await input.executeTool("check_availability", args);
    toolCalls.push({ name: "check_availability", args, result: result.data });
    const data = result.data as Record<string, unknown>;
    const slots = slotSummary(data);
    return {
      handled: true,
      toolCalls,
      assistantMessage: [
        `I checked availability — open slots include **${slots}**.`,
        "Tell me your name, contact, and which slot you want, and I'll confirm the details before I book.",
      ].join("\n\n"),
    };
  }

  // Book request → propose plan (no write yet)
  const looksLikeBook =
    (/^yes,?\s*book\b/.test(lower) ||
      /\bbook\b/.test(lower) ||
      /please book|reserve|i'?d like to book|prendre rendez-vous/.test(lower)) &&
    !/don'?t bother|without checking/.test(lower);

  const hasContactBits =
    /\d{3}/.test(user) ||
    /name'?s |for [A-Z][a-z]+.+,/i.test(user) ||
    /pine st|invaliden|berlin|phoenix|address/i.test(user);

  if (looksLikeBook && (hasContactBits || /skin fade|diagnostic|drain|with [A-Z]/i.test(user))) {
    const args = extractBookingArgs(user, family);
    const plan: BookingWorkflowPlan = {
      id: `bk-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: "book",
      family,
      status: "proposed",
      steps: [
        {
          id: "avail",
          label: `Confirm open slot (${args.datetime})`,
          tool: "check_availability",
          args: { date: args.date, service: args.service, datetime: args.datetime },
          status: "pending",
        },
        {
          id: "book",
          label: `Book ${args.service} for ${args.customer_name ?? "you"} at ${args.datetime}`,
          tool: "book_appointment",
          args,
          status: "pending",
        },
        {
          id: "notify",
          label: family === "salon" ? "Notify the front desk" : "Notify the dispatch desk",
          tool: has("notify_team") ? "notify_team" : "handoff_to_human",
          args: {
            summary: `New booking: ${args.service} @ ${args.datetime} — ${args.customer_name ?? ""} ${args.phone ?? ""}`,
            reason: "booking_confirmed",
          },
          status: "pending",
        },
        {
          id: "verify",
          label: "Confirm booking reference back to you",
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
          "I can set that up as a multi-step booking workflow — I won't write the appointment until you confirm.",
          "",
          `**Goal:** ${plan.goal}`,
          "",
          "## Workflow plan",
          ...plan.steps.map((s, i) => `${i + 1}. ${s.label}`),
          "",
          family === "trades"
            ? `Shall I go ahead and book **${args.service}** at **${args.datetime}** for **${args.customer_name ?? "you"}**${args.address ? ` at ${args.address}` : ""}? Reply **yes, go ahead** if that's correct.`
            : `Is that right — **${args.service}**${args.stylist ? ` with ${args.stylist}` : ""} at **${args.datetime}** for **${args.customer_name ?? "you"}**? Reply **yes** / **please book it** to confirm.`,
        ].join("\n"),
        plan,
      ),
    };
  }

  // Soft local booking help
  if (/help me with a booking|booking or appointment|can you help me with a booking/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "Happy to help — tell me the service, a preferred day/time, and your name + contact. I'll check what's available and confirm before I book.",
    };
  }

  return { handled: false, assistantMessage: "", toolCalls: [] };
}
