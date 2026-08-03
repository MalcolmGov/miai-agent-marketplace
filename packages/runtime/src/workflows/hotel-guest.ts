/**
 * Multi-step Hotel Guest Concierge workflow:
 * amenity / local info → propose guest request → confirm → make_guest_request → verify
 *
 * Billing, reservation changes, complaints, other-guest privacy → handoff.
 */

import { wf } from "./i18n.js";
import { handleStopSuppression } from "./stop-suppression.js";

export type HotelStepStatus = "pending" | "done" | "skipped" | "failed";

export interface HotelWorkflowStep {
  id: string;
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: HotelStepStatus;
  resultSummary?: string;
}

export interface HotelWorkflowPlan {
  id: string;
  goal: string;
  kind: "guest_request";
  steps: HotelWorkflowStep[];
  status: "proposed" | "executing" | "completed" | "cancelled";
}

export interface HotelWorkflowTurnResult {
  handled: boolean;
  assistantMessage: string;
  plan?: HotelWorkflowPlan;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

const WORKFLOW_RE = /<!--miai-workflow:([\s\S]*?)-->/;

export function isHotelGuest(agentId: string): boolean {
  return /hotel-guest/i.test(agentId);
}

export function parseHotelWorkflowFromMessages(
  messages: Array<{ role: string; content: string }>,
): HotelWorkflowPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const match = m.content.match(WORKFLOW_RE);
    if (!match) continue;
    try {
      return JSON.parse(match[1]!) as HotelWorkflowPlan;
    } catch {
      return null;
    }
  }
  return null;
}

function embed(message: string, plan: HotelWorkflowPlan): string {
  return `${message.replace(WORKFLOW_RE, "").trimEnd()}\n\n<!--miai-workflow:${JSON.stringify(plan)}-->`;
}

function isConfirm(text: string): boolean {
  const lower = text.toLowerCase().replace(/##[\s\S]*$/g, " ").trim();
  return (
    /^(yes|yep|yeah|correct|confirmed|ok|okay)\b/.test(lower) ||
    /yes[,.]? (please|go ahead|do it|confirm|log|send)/.test(lower) ||
    /go ahead|please (log|send|request)|looks good|that'?s right/.test(lower)
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

function extractRoom(text: string): string | undefined {
  return (
    text.match(/\broom\s*#?\s*(\d{2,4})\b/i)?.[1] ||
    text.match(/\b#(\d{2,4})\b/)?.[1]
  );
}

function requestKind(text: string): string {
  if (/extra towel|towels/i.test(text)) return "housekeeping_towels";
  if (/housekeeping|clean(ing)?/i.test(text)) return "housekeeping";
  if (/wake-?up/i.test(text)) return "wake_up";
  if (/late check-?out/i.test(text)) return "late_checkout";
  if (/transfer|airport|taxi/i.test(text)) return "transfer";
  if (/pillow|blanket|amenit/i.test(text)) return "amenities";
  return "guest_request";
}

function amenityTopic(text: string): string {
  if (/check-?in|check in/i.test(text)) return "check_in";
  if (/check-?out|check out/i.test(text)) return "check_out";
  if (/breakfast|frühstück|petit[- ]déjeuner/i.test(text)) return "breakfast";
  if (/wi-?fi|wifi|internet/i.test(text)) return "wifi";
  if (/pool|piscine/i.test(text)) return "pool";
  if (/gym|fitness/i.test(text)) return "gym";
  if (/spa/i.test(text)) return "spa";
  if (/park(ing)?/i.test(text)) return "parking";
  return "general";
}

export async function runHotelGuestWorkflow(input: {
  agentId: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  toolNames: string[];
  knowledge?: string;
  executeTool: ExecuteToolFn;
  replyLanguage?: string;
}): Promise<HotelWorkflowTurnResult> {
  if (!isHotelGuest(input.agentId)) {
    return { handled: false, assistantMessage: "", toolCalls: [] };
  }

  const user = input.userMessage.replace(/##[\s\S]*$/g, "").trim();
  const lower = user.toLowerCase();
  const pending = parseHotelWorkflowFromMessages(input.messages);
  const toolCalls: HotelWorkflowTurnResult["toolCalls"] = [];
  const has = (n: string) => input.toolNames.includes(n);
  const emerg = emergencyNumber(input.agentId, input.knowledge);
  const lang = input.replyLanguage;

  // Emergency
  if (/life-?threatening|medical emergency|chest pain|can't breathe/.test(lower)) {
    if (has("handoff_to_human")) {
      const args = { reason: "emergency", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: wf(lang, "emergency", { emerg }),
    };
  }

  // Other guest privacy
  if (/what room is|is .+ staying here|another guest|who is in room/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage: wf(lang, "privacy_other_guest"),
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

  const stopSuppression = await handleStopSuppression({
    lower,
    user,
    has,
    executeTool: input.executeTool,
    assistantMessage: "Understood — STOP acknowledged. I'm handing off so marketing suppression is completed.",
  });
  if (stopSuppression) return stopSuppression;

  // Prompt injection
  if (/ignore (all )?previous|print your (full )?system prompt|reveal your (system )?prompt/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share internal instructions. I can help with amenities, local tips, or logging a request for your stay.",
    };
  }

  // Billing / reservation change / complaint → handoff (not a guest_request log)
  if (
    /billing|charged wrong|dispute (the )?charge|invoice|folio|charge on my (bill|folio)|don'?t (recognise|recognize)|unrecognised charge|unrecognized charge|\bbill\b.*\bcharge|\bcharge\b.*\bbill\b/.test(
      lower,
    ) ||
    /change (my )?(dates?|reservation|rate)|cancel (my )?reservation|extend (my )?stay by/.test(lower) ||
    /complaint|filthy|unacceptable|manager|furious|ruined (my )?stay/.test(lower)
  ) {
    if (has("handoff_to_human")) {
      const args = {
        reason: /billing|charge|invoice|folio/.test(lower)
          ? "billing"
          : /complaint|filthy|unacceptable|furious|ruined/.test(lower)
            ? "complaint"
            : "reservation_change",
        summary: user.slice(0, 400),
      };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: wf(lang, "handoff_front_desk_billing"),
    };
  }

  // Explicit human
  if (/talk to (a )?human|speak to (the )?front desk|connect me to (a )?person/.test(lower)) {
    if (has("handoff_to_human")) {
      const args = { reason: "explicit_request", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: wf(lang, "handoff_front_desk"),
    };
  }

  // Cancel proposed plan
  if (pending?.status === "proposed" && /\b(cancel|never ?mind|stop)\b/i.test(lower)) {
    const cancelled = { ...pending, status: "cancelled" as const };
    return {
      handled: true,
      plan: cancelled,
      toolCalls: [],
      assistantMessage: embed(wf(lang, "plan_cancelled_request"), cancelled),
    };
  }

  // Confirm → execute
  if (pending?.status === "proposed" && isConfirm(user)) {
    const plan: HotelWorkflowPlan = {
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
        data.request_ref ?? data.reference ?? data.id ?? (result.ok ? "GR-OK" : "ERR"),
      );
      step.status = result.ok ? "done" : "failed";
      step.resultSummary = ref;
      lines.push(`${result.ok ? "✓" : "✗"} ${step.label} — ${ref}`);
      if (!result.ok && step.id === "request") break;
    }

    plan.status = "completed";
    const reqStep = plan.steps.find((s) => s.id === "request" && s.status === "done");
    const msg = [
      reqStep
        ? `Request logged — reference **${reqStep.resultSummary}**. The team will follow up; this is a request only — the desk must confirm any late check-out time.`
        : "Workflow finished.",
      "",
      "## Workflow results",
      ...lines,
    ].join("\n");

    return { handled: true, plan, toolCalls, assistantMessage: embed(msg, plan) };
  }

  // Late check-out is a guest request (must run before amenity FAQ)
  // Amenity / policy questions
  if (
    !/late check-?out/.test(lower) &&
    /check-?in|check-?out|breakfast|wi-?fi|wifi|pool|gym|spa|parking|what time|password|hours|frühstück|piscine|petit[- ]déjeuner/.test(
      lower,
    )
  ) {
    const topic = amenityTopic(user);
    if (has("get_amenity_info")) {
      const args = { topic };
      const result = await input.executeTool("get_amenity_info", args);
      toolCalls.push({ name: "get_amenity_info", args, result: result.data });
      const data = result.data as Record<string, unknown>;
      if (typeof data.info === "string" && data.info.length > 20) {
        return {
          handled: true,
          toolCalls,
          assistantMessage: String(data.info),
        };
      }
    }
    // NOTE: this used to be an unconditional `||` chain of section() lookups tried in a fixed
    // order, completely ignoring `topic` above — so it always returned whichever section
    // appeared first in the knowledge doc (Check-in/check-out), regardless of what was actually
    // asked. One of those lines was also missing the [\s\S]*?(?=\n## ) "capture to next heading"
    // suffix every other line had, so .match() returned just the matched heading text itself
    // ("## Check-in", 12 chars) and — being first in the chain — always won over everything else.
    // Route on the already-computed `topic` instead, so breakfast/wifi/parking questions actually
    // get the breakfast section, pool/gym/spa questions get the pool section, etc.
    const checkInOut = section(input.knowledge, /## Check-in \/ check-out[\s\S]*?(?=\n## )/i);
    const breakfastWifiParking = section(input.knowledge, /## Breakfast, Wi[\s\S]*?(?=\n## )/i);
    const poolGymSpa = section(input.knowledge, /## Pool, gym, spa[\s\S]*?(?=\n## )/i);
    const fallback =
      "Amenity details are on file — ask about check-in, breakfast, Wi‑Fi, pool, gym, spa, or parking.";
    const blob =
      (topic === "check_in" || topic === "check_out"
        ? checkInOut
        : topic === "breakfast" || topic === "wifi" || topic === "parking"
          ? breakfastWifiParking
          : topic === "pool" || topic === "gym" || topic === "spa"
            ? poolGymSpa
            : "") || checkInOut || breakfastWifiParking || poolGymSpa || fallback;
    return { handled: true, toolCalls, assistantMessage: blob };
  }

  // Local recommendations
  if (
    /restaurant|where (to )?eat|attractions?|things to do|museum|transport|uber|u-?bahn|nearby|worth seeing|near the hotel|local tip|what'?s (nearby|around)/.test(
      lower,
    )
  ) {
    const kind = /transport|uber|taxi|u-?bahn|airport/i.test(lower)
      ? "transport"
      : /museum|attraction|park|gate|things to do/i.test(lower)
        ? "attractions"
        : "restaurants";
    if (has("get_local_recommendations")) {
      const args = { kind };
      const result = await input.executeTool("get_local_recommendations", args);
      toolCalls.push({ name: "get_local_recommendations", args, result: result.data });
    }
    const local =
      section(input.knowledge, /## Local recommendations[\s\S]*?(?=\n## )/i) ||
      "I can share our curated local guide — restaurants, attractions, and transport tips.";
    return { handled: true, toolCalls, assistantMessage: local };
  }

  // Guest request → propose plan
  const looksLikeRequest =
    /need (extra )?towels|extra towels|please (bring|send)|housekeeping|wake-?up call|late check-?out|airport transfer|can (i|you) (have|get|send)|request (for|extra)/.test(
      lower,
    );

  if (looksLikeRequest) {
    const room = extractRoom(user);
    const kind = requestKind(user);
    if (!room && /towel|housekeeping|wake|pillow|blanket/i.test(lower)) {
      return {
        handled: true,
        toolCalls: [],
        assistantMessage:
          "Happy to log that — what's your **room number**? I'll confirm the details before I send it to the team.",
      };
    }

    const args = {
      type: kind,
      kind,
      room,
      room_number: room,
      summary: user.slice(0, 400),
      notes: user.slice(0, 400),
    };

    const plan: HotelWorkflowPlan = {
      id: `hg-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: "guest_request",
      status: "proposed",
      steps: [
        {
          id: "request",
          label: `Log guest request (${kind}${room ? `, room ${room}` : ""})`,
          tool: "make_guest_request",
          args,
          status: "pending",
        },
        {
          id: "verify",
          label: "Confirm request reference back to you",
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
          "I can log that as a guest request — I won't send it to the team until you confirm.",
          "",
          `**Goal:** ${plan.goal}`,
          "",
          "## Workflow plan",
          ...plan.steps.map((s, i) => `${i + 1}. ${s.label}`),
          "",
          room
            ? `Shall I log **${kind.replace(/_/g, " ")}** for **room ${room}**? Reply **yes** / **please log it** to confirm.`
            : `Shall I log **${kind.replace(/_/g, " ")}**? Reply **yes** / **please log it** to confirm.`,
        ].join("\n"),
        plan,
      ),
    };
  }

  return { handled: false, assistantMessage: "", toolCalls: [] };
}
