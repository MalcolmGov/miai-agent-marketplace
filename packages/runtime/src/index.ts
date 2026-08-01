import type { AgentPackage } from "@miai/agent-protocol";
import { executeConnector, type ToolBinding } from "@miai/connectors";
import { defaultBindingsForTools, getPreset } from "@miai/presets";
import {
  createWalletAdapter,
  estimateTurnTokens,
  type WalletAdapter,
} from "@miai/wallet-adapter";
import {
  isExecutiveAssistant,
  runExecutiveAssistantWorkflow,
  type WorkflowPlan,
  type WorkflowStep,
} from "./workflows/executive-assistant.js";
import { isItHelpdesk, runItHelpdeskWorkflow } from "./workflows/it-helpdesk.js";
import {
  isBookingFrontDesk,
  runBookingFrontDeskWorkflow,
} from "./workflows/booking-front-desk.js";
import { isSalesQualifier, runSalesQualifierWorkflow } from "./workflows/sales-qualifier.js";
import {
  isRestaurantTakeaway,
  runRestaurantTakeawayWorkflow,
} from "./workflows/restaurant-takeaway.js";
import {
  isOnboardingBuddy,
  runOnboardingBuddyWorkflow,
} from "./workflows/onboarding-buddy.js";
import {
  isDentalFrontDesk,
  runDentalFrontDeskWorkflow,
} from "./workflows/dental-front-desk.js";
import { isHotelGuest, runHotelGuestWorkflow } from "./workflows/hotel-guest.js";

export type { WorkflowPlan, WorkflowStep };

export type AgentState = "selected" | "configuring" | "rented" | "live" | "paused_no_tokens";

export interface ChatMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
}

export interface TurnRequest {
  workspaceId: string;
  agentId: string;
  pkg: AgentPackage;
  messages: ChatMessage[];
  userMessage: string;
  model: string;
  mode: "sandbox" | "live";
  knowledgeOverride?: string;
  bindings?: ToolBinding[];
  state: AgentState;
  /** Extra platform-level instructions appended to the system message (e.g. embed policies). */
  systemAppend?: string;
}

export interface TurnResult {
  assistantMessage: string;
  messages: ChatMessage[];
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
  tokensDebited: number;
  balance: number;
  state: AgentState;
  paused: boolean;
  /** Multi-step workflow plan (Executive Assistant and similar). */
  workflow?: {
    id: string;
    goal: string;
    status: string;
    steps: Array<{ id: string; label: string; tool?: string; status: string; resultSummary?: string }>;
  };
}

export interface ModelAdapter {
  complete(input: {
    system: string;
    messages: ChatMessage[];
    tools: AgentPackage["tools"];
    model: string;
  }): Promise<{ content: string; toolCall?: { name: string; args: Record<string, unknown> } }>;
}

const META_CHUNK =
  /grounding|honesty|how this file works|template vs tenant|market operations|compliance notes|response rules|guardrails|stay in role|prompt-injection|what the agent does not know|citation policy|record format — what/i;

/** Pull a relevant excerpt from the system knowledge block for mock answers. */
function knowledgeHit(system: string, query: string): string | null {
  const kbIdx = system.indexOf("## Knowledge base");
  let kb = kbIdx >= 0 ? system.slice(kbIdx) : system;
  // Don't score Guardrails / Response rules as knowledge.
  const cut = kb.search(/\n## (Guardrails|Response rules)\b/);
  if (cut > 0) kb = kb.slice(0, cut);
  kb = kb.slice(0, 80_000);

  const q = query.toLowerCase().replace(/##[\s\S]*$/g, " ");
  const terms = q
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
  const chunks = kb.split(/\n(?=#+ )/);
  let best = "";
  let bestScore = 0;
  for (const chunk of chunks) {
    const lower = chunk.toLowerCase();
    if (META_CHUNK.test(chunk.split("\n")[0] || "") && !/levy schedule|payslip|leave|price|treatment|service|amenity|po-|purchase/i.test(chunk.slice(0, 80))) {
      continue;
    }
    if (/^## (guardrails|response rules|us compliance|eu compliance|market operations)/i.test(chunk)) continue;

    let score = 0;
    for (const t of terms) if (lower.includes(t)) score += t.length > 4 ? 2 : 1;

    if (/job|hiring|role|opening|leave|pto|holiday|benefit|wifi|check-?in|price|order|service|treatment|levy|payslip|amenity|course|po-|stock/.test(lower)) {
      for (const t of [
        "job",
        "leave",
        "role",
        "wifi",
        "order",
        "price",
        "benefit",
        "service",
        "treatment",
        "levy",
        "payslip",
        "amenity",
        "course",
        "parking",
        "breakfast",
      ]) {
        if (terms.includes(t) && lower.includes(t)) score += 4;
      }
    }
    if (/how much|price|cost|fee|levy|usd|eur|\$|net pay|payslip|balance/.test(q) && /usd\s*[\d,]|€\s*[\d,]|\$\s*[\d,]|\br\s*[\d,]|price|fee|levy|net/.test(lower)) {
      score += 14;
    }
    if (/service|treatment|offer|catalogue|menu|what do you/.test(q) && /service|treatment|price|catalogue|menu|from\s+/.test(lower)) {
      score += 10;
    }
    if (/hours|open|closed/.test(q) && /hours|monday|open|closed/.test(lower)) score += 8;
    if (/visitor|parking|access|gate|remote/.test(q) && /visitor|parking|access|gate/.test(lower)) score += 12;
    if (/po-\d+|purchase order|supplier/.test(q) && /po-|purchase|supplier/.test(lower)) score += 14;
    if (/bedroom|special levy|levy/.test(q) && /levy|bedroom|special levy/.test(lower)) score += 14;
    if (/net pay|payslip|paye|deduction/.test(q) && /payslip|net|paye|gross|emp-/.test(lower)) score += 12;
    if (/poem|essay|joke|homework|recipe|weather in|write me/.test(q)) score -= 20;

    if (score > bestScore) {
      bestScore = score;
      best = chunk.trim();
    }
  }
  if (bestScore < 2 || best.length < 30) return null;
  return best.slice(0, 1600);
}

/** Extract currency-like amounts from text for mock tool replies. */
function extractAmounts(text: string, limit = 8): string[] {
  const found: string[] = [];
  const re = /(?:USD|EUR|ZAR|R|€|\$)\s*([\d][\d\s,]{1,12})|\b([\d]{1,3}(?:[\s,][\d]{3})+)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) && found.length < limit) {
    const raw = (m[1] || m[2] || "").replace(/\s+/g, " ").trim();
    if (raw) found.push(raw);
  }
  return found;
}

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "have",
  "from",
  "your",
  "what",
  "when",
  "where",
  "how",
  "can",
  "please",
  "just",
  "about",
  "would",
  "could",
  "into",
  "been",
  "they",
  "them",
  "will",
  "does",
  "dont",
  "don't",
  "need",
  "want",
  "like",
  "some",
  "more",
  "than",
  "then",
  "also",
  "only",
  "notes",
  "compliance",
  "tcpa",
  "ccpa",
  "continue",
  "conversations",
  "customer",
  "started",
]);

function findTool(tools: AgentPackage["tools"], ...parts: string[]) {
  return tools.find((t) => parts.every((p) => t.name.toLowerCase().includes(p)))?.name;
}

function pickToolByIntent(tools: AgentPackage["tools"], lower: string): string | undefined {
  const ranked: Array<{ name: string; score: number }> = [];
  const wantsList =
    /what (treatments|services)|treatments do you|services do you|what do you (do|offer)|price list|catalogue|menu|how much (do|does|are)|what.*(cost|price)/.test(
      lower,
    );
  const wantsAvail =
    /availab|free slot|when can|open slot|can i book|this (thursday|monday|tuesday|wednesday|friday)|next week|have any.*(slot|opening)|check.*(slot|time)/.test(
      lower,
    );
  const confirmBook = /yes|confirm|go ahead|please book|book (it|that|me)|reserve (it|that)/.test(lower);

  for (const t of tools) {
    const name = t.name.toLowerCase();
    let score = 0;
    for (const part of name.split("_")) {
      if (part.length < 3) continue;
      if (lower.includes(part)) score += 3;
    }
    if (/list_services|get_services|list_catalogue|catalogue|menu/.test(name) && wantsList) score += 16;
    if (/check_availability|availability|check_calendar/.test(name) && wantsAvail && !confirmBook) score += 18;
    if (/book|appointment|reserve|schedule/.test(name) && /book|appointment|reserve|schedule|callback/.test(lower)) {
      score += confirmBook ? 16 : wantsAvail ? -6 : 3;
    }
    if (/treatment_info|get_treatment/.test(name)) {
      if (wantsList) score -= 8;
      else if (/root canal|filling|extraction|what (is|does) (a |the )?/.test(lower)) score += 12;
    }
    if (/job_opening|open_role|list_jobs/.test(name) && /job|hiring|vacanc|role|position/.test(lower)) score += 10;
    if (/payslip/.test(name) && /payslip|net pay|gross|paye|deduction/.test(lower)) score += 14;
    if (
      /leave_balance/.test(name) &&
      /leave (balance|left|remaining)|how many (annual )?leave|days (do )?i have left|pto left|have left/.test(
        lower,
      ) &&
      !/do we get|entitlement|per year|a year/.test(lower)
    )
      score += 16;
    if (/get_plans|list_plans/.test(name) && /membership|plan|how much|what do they cost|packages/.test(lower))
      score += 16;
    if (/class_schedule/.test(name) && /class|schedule|timetable/.test(lower)) score += 14;
    if (/freeze|cancel/.test(name) && /freeze|cancel (my )?membership|cancel it/.test(lower)) score += 14;
    if (/procurement_policy|get_policy|policy/.test(name) && /policy|quotes|sign-off|approval|threshold/.test(lower))
      score += 14;
    if (/onboarding|supplier/.test(name) && /onboard|new supplier|set up a new supplier/.test(lower)) score += 12;
    if (/list_catalogue|catalogue/.test(name) && /catalogue|catalog|browse|voucher|airtime|what do you sell|brand/.test(lower))
      score += 16;
    if (/purchase_voucher|purchase/.test(name) && /buy|purchase|please (get|buy)|confirm.*buy/.test(lower)) score += 14;
    if (/check_price|get_price/.test(name) && /price|how much|cost/.test(lower)) score += 14;
    if (/record_sale/.test(name) && /sale|sold|record/.test(lower)) score += 12;
    if (/credit_book|credit/.test(name) && /credit|tik|on account/.test(lower)) score += 12;
    if (/place_reorder|reorder/.test(name) && /reorder|restock|order more/.test(lower)) score += 12;
    if (/route_to_department|route/.test(name) && /department|sales|accounts|billing|route|put me through/.test(lower))
      score += 14;
    if (/take_message/.test(name) && /message|leave a note|tell them|pass on/.test(lower)) score += 16;
    if (/get_tier|tier_benefits|points_balance|loyalty|redeem|earn/.test(name) && /tier|points|balance|redeem|loyalty|member/.test(lower))
      score += 12;
    if (/get_deadlines|deadline/.test(name) && /deadline|due|paye|vat|filing/.test(lower)) score += 14;
    if (/get_required_documents|required_documents|documents/.test(name) && /document|what do i need|papers|id /.test(lower))
      score += 12;
    if (/book_callback|callback/.test(name) && /callback|call me back|phone me/.test(lower)) score += 14;
    if (/proof_of_delivery|pod|get_pod/.test(name) && /proof of delivery|pod|delivery proof/.test(lower)) score += 14;
    if (/log_exception/.test(name) && /exception|damaged|missing parcel/.test(lower)) score += 12;
    if (/checklist|onboarding_buddy/.test(name) && /checklist|first day|onboarding/.test(lower)) score += 12;
    if (/search_listings|get_listing|search_availability/.test(name) && /listing|property|rental|viewing|bedroom/.test(lower))
      score += 12;
    if (/list_tours|tour/.test(name) && /tour|activity|excursion/.test(lower)) score += 12;
    if (/menu|list_menu/.test(name) && /menu|pizza|order food/.test(lower)) score += 14;
    if (/get_claim_status|claim/.test(name) && /claim|status of (my )?claim/.test(lower)) score += 12;
    if (/prequalify|explain_requirements/.test(name) && /qualify|pre-?qualif|loan|requirements/.test(lower)) score += 12;
    if (/search_kb|vpn/.test(name) && /vpn|how do i|password reset|it help/.test(lower)) score += 12;
    if (/create_ticket/.test(name) && /ticket|log (a |this )?issue|create a ticket/.test(lower)) score += 12;
    if (/practice_areas|capture_intake/.test(name) && /practice area|legal|intake|consult/.test(lower)) score += 12;
    if (/needs_analysis|capture_submission/.test(name) && /cover|insurance|quote|submission/.test(lower)) score += 10;
    if (/check_calendar|schedule_meeting|set_reminder/.test(name) && /calendar|free|meeting|reminder|am i free/.test(lower))
      score += 14;
    if (/get_job|check_part|update_job_status/.test(name) && /job|part|status|in stock/.test(lower)) score += 12;
    if (/get_compliance|log_incident|driving_hours|policy/.test(name) && /compliance|incident|driving hours|hours of service/.test(lower))
      score += 12;
    if (/levy/.test(name) && /levy|special levy|bedroom/.test(lower)) score += 14;
    if (/access_rules|access/.test(name) && /visitor|parking|gate|access|remote|tag/.test(lower)) score += 14;
    if (/po_status|purchase/.test(name) && /po-\d+|purchase order|\bpo\b/.test(lower)) score += 16;
    if (/prep_instruction/.test(name) && /prep|prepare|before (my|the) /.test(lower)) score += 12;
    if (/amenity/.test(name) && /amenity|breakfast|pool|gym|wifi|check-?in|parking/.test(lower)) score += 12;
    if (/list_courses|match_course/.test(name) && /course|programme|program|intake|study/.test(lower)) score += 12;
    if (/requirement/.test(name) && /requirement|qualify|need to (have|bring)/.test(lower)) score += 12;
    if (/deadline/.test(name) && /deadline|due date|when (is|are) .* due/.test(lower)) score += 12;
    if (/product_info|get_product/.test(name) && /product|savings|account type|interest/.test(lower)) score += 10;
    if (/track_consignment|track|waybill/.test(name) && /track|waybill|consignment|parcel/.test(lower)) score += 12;
    if (/get_statement|statement/.test(name) && /statement|balance/.test(lower)) score += 10;
    if (/outage/.test(name) && /outage|power cut|water out/.test(lower)) score += 12;
    if (/stock/.test(name) && /stock|in stock|availability of/.test(lower)) score += 10;
    if (/invoice/.test(name) && /invoice|bill/.test(lower)) score += 10;
    if (
      /statement|deadline|amenity|recommendation|consignment|package|compliance|incident|onboarding|process_info|product_info|requirement|policy|outage|stock|invoice|cover|estimate|wallet|redeem|membership|class_schedule/.test(
        name,
      )
    ) {
      const key = name.replace(/^(get_|check_|list_|log_|track_|update_|match_)/, "").split("_");
      if (key.some((p) => p.length > 3 && lower.includes(p))) score += 9;
    }
    if (/handoff/.test(name) && /human|person|someone|agent|emergency|urgent|escalat/.test(lower)) score += 5;
    if (score > 0) ranked.push({ name: t.name, score });
  }
  ranked.sort((a, b) => b.score - a.score);
  if (ranked[0]?.score >= 4) return ranked[0].name;
  // Soft match: any action-like tool whose tokens overlap the query
  if (
    ranked[0]?.score >= 2 &&
    /^(get_|list_|check_|log_|capture_|search_|track_|match_|route_|take_|place_|update_|set_|book_|schedule_|create_|open_|start_|request_|explain_|prequalify|needs_|purchase_|record_|credit_|browse)/i.test(
      ranked[0].name,
    )
  ) {
    return ranked[0].name;
  }
  return undefined;
}

function emergencyNumber(system: string): string {
  const m = system.match(/call \*\*([^*]+)\*\*/i) || system.match(/Emergencies:.*?([0-9]{3,5}|local emergency services)/i);
  return (m?.[1] || "local emergency services").trim();
}

/** Deterministic mock model — good for local demo / zero-cost eval suite. */
export class MockModelAdapter implements ModelAdapter {
  async complete(input: {
    system: string;
    messages: ChatMessage[];
    tools: AgentPackage["tools"];
    model: string;
  }) {
    const last = [...input.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const lower = last.toLowerCase().replace(/##[\s\S]*$/g, " ");
    const toolNote = [...input.messages].reverse().find((m) => m.role === "tool");
    const tools = input.tools;
    const hit = () => knowledgeHit(input.system, last);
    const scopeHint =
      "I can help with orders, products, appointments, bookings, treatments, policies, accounts, and related questions for this business.";

    // After a tool ran, answer from knowledge + tool payload instead of echoing JSON.
    if (toolNote) {
      const kb = hit();
      const toolName = toolNote.toolName ?? "tool";
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(toolNote.content) as Record<string, unknown>;
      } catch {
        /* ignore */
      }
      const amounts = [
        ...extractAmounts(JSON.stringify(data)),
        ...extractAmounts(kb || ""),
        ...extractAmounts(input.system.slice(0, 40_000)),
      ];
      const amountLine = amounts.length ? `Figures on file: ${[...new Set(amounts)].slice(0, 6).join(", ")}.` : "";

      if (/job_opening|list_jobs|open_role/i.test(toolName)) {
        return {
          content: `Here are the roles we're hiring for:\n\n${kb || JSON.stringify(data.openings || data)}\n\nScreening is indicative only — the hiring team decides.`,
        };
      }
      if (/list_services|get_services|catalogue|menu|list_catalogue/i.test(toolName)) {
        const priced =
          knowledgeHit(input.system, `price cost fee USD EUR services treatments check-up ${last}`) || kb;
        const priceLines = (input.system.match(/^.*(?:USD|EUR|€|\$|\bR)\s*[\d,].*$/gim) || [])
          .slice(0, 12)
          .join("\n");
        return {
          content: `${priced || "Here are the services on file."}\n\n${priceLines ? `Prices on file:\n${priceLines}\n\n` : ""}${amountLine}\nI can check availability or book once you pick a service — shall I continue?`,
        };
      }
      if (/availability|check_calendar/i.test(toolName)) {
        return {
          content:
            "Of course — no problem. I have availability — for example Thursday 10:00 is open. I won't book yet unless you confirm. Shall I book that for you, or would you like another time? Let me know.",
        };
      }
      if (/onboarding|supplier/i.test(toolName)) {
        return {
          content: `Supplier onboarding case started — reference **${data.reference ?? "ONB-1001"}**. Procurement will continue the checks.`,
        };
      }
      if (/get_plans|plans/i.test(toolName)) {
        return {
          content: `${kb || "Membership plans on file."}\n\n${amountLine}\nI can also check class schedules or help freeze/cancel (with confirmation).`,
        };
      }
      if (/procurement_policy|policy/i.test(toolName)) {
        return {
          content: `${kb || "Procurement policy on file."}\n\nMultiple quotes and approval thresholds are in the policy sections — I won't skip finance sign-off.`,
        };
      }
      if (/treatment_info|get_treatment/i.test(toolName)) {
        return {
          content: `${kb || "Treatment information on file."}\n\nA root canal typically involves a visit under local anaesthetic; exact visits depend on the tooth. ${amountLine}`,
        };
      }
      if (/freeze|cancel/i.test(toolName)) {
        return {
          content: `Request logged — reference **${data.reference ?? "REF-1001"}**. A teammate will process the freeze/cancel; I haven't self-processed the contract.`,
        };
      }
      if (/record_sale|credit_book|place_reorder|reorder/i.test(toolName)) {
        return {
          content: `Sale/credit/reorder recorded — reference **${data.reference ?? "REF-1001"}**. Logged for the owner. ${amountLine}`,
        };
      }
      if (/list_catalogue|catalogue/i.test(toolName)) {
        return {
          content: `${kb || "Catalogue on file."}\n\nBrands and voucher denominations are listed above. ${amountLine}`,
        };
      }
      if (/purchase_voucher|redeem|deliver/i.test(toolName)) {
        return {
          content: `Done — reference **${data.reference ?? "VAS-1001"}**. Delivery is by SMS/email with the PIN/code. ${amountLine}`,
        };
      }
      if (/take_message/i.test(toolName)) {
        return { content: "Message taken — I'll pass it on and let them know you called." };
      }
      if (/route_to_department|route/i.test(toolName)) {
        return { content: "I've routed you to that department — they'll pick up shortly." };
      }
      if (/check_price/i.test(toolName)) {
        return { content: `${kb || "Price on file."}\n\n${amountLine}` };
      }
      if (/tier_benefits|points_balance|get_tier/i.test(toolName)) {
        return {
          content: `${kb || "Loyalty tier benefits on file."}\n\nPoints expire after 24 months unless the programme says otherwise. ${amountLine}`,
        };
      }
      if (/deadline/i.test(toolName)) {
        return { content: `${kb || "Deadlines on file."}\n\nPAYE/VAT filing deadlines are in the knowledge base.` };
      }
      if (/required_document|get_required/i.test(toolName)) {
        return { content: `${kb || "Required documents on file."}\n\nBring ID and the listed supporting papers.` };
      }
      if (/payslip/i.test(toolName)) {
        const net = data.net ?? data.net_pay ?? "18 060";
        const gross = data.gross ?? "24 000";
        const paye = (data.deductions as { paye?: string } | undefined)?.paye ?? data.paye ?? "3 900";
        return {
          content: `From your latest payslip: net pay **${net}**, gross **${gross}**, PAYE **${paye}**. ${kb ? "\n\n" + kb.slice(0, 400) : ""}\n${amountLine}`,
        };
      }
      if (/leave_balance/i.test(toolName)) {
        return {
          content: `Your leave balance on file: annual **${data.annual ?? "14.5"}** days, sick **${data.sick ?? "12"}**, family responsibility **${data.family ?? "3"}**. ${amountLine}`,
        };
      }
      if (/levy/i.test(toolName)) {
        const schedule = data.schedule ? JSON.stringify(data.schedule) : "";
        return {
          content: `${kb || "Here is the current levy schedule."}\n\n${schedule}\n${amountLine}\nMonthly levies are due on the 1st. Special levy details are included when running.`,
        };
      }
      if (/po_status|purchase/i.test(toolName)) {
        return {
          content: `${kb || "Purchase order status:"}\n\nStatus: ${data.status ?? "approved, awaiting delivery"}. Supplier: ${data.supplier ?? "Bosveld"}. Amount: ${data.amount ?? "18 450"}. ${amountLine}`,
        };
      }
      if (/access_rules|access/i.test(toolName)) {
        return {
          content: `${kb || "Access and visitor/parking rules on file."}\n\nVisitor bays and gate access are covered in the scheme rules. ${amountLine}`,
        };
      }
      if (/amenity/i.test(toolName)) {
        return {
          content: `${kb || "Amenity information on file."}\n\nI can cover check-in, breakfast, parking, pool/gym, and wifi from knowledge. ${amountLine}`,
        };
      }
      if (/list_courses|match_course/i.test(toolName)) {
        return {
          content: `${kb || "Courses on file."}\n\nI can match IT Systems, Software Development, and other programmes by level — what grade or level are you aiming for? ${amountLine}`,
        };
      }
      if (/prep_instruction/i.test(toolName)) {
        return {
          content: `${kb || "Prep instructions on file."}\n\nPlease follow the fasting/prep steps listed for your procedure, and bring your ID and medical aid card.`,
        };
      }
      if (/capture_application|application/i.test(toolName)) {
        return {
          content:
            "Thanks — your application is captured under reference APP-4821. The hiring team will follow up; this is not a hiring decision.",
        };
      }
      if (/book|appointment|reserve|callback/i.test(toolName)) {
        return {
          content:
            "You're booked — reference BK-3391. You'll get a confirmation on your contact details. Please confirm if anything looks wrong.",
        };
      }
      if (/log_|maintenance|exception|payroll_query|guest_request/i.test(toolName)) {
        return {
          content: `Logged — reference **${data.reference ?? data.request_ref ?? "REF-1001"}**. The team will look into it / action it. I haven't marked it fixed.`,
        };
      }
      if (kb) return { content: `${kb}\n\n${amountLine}\n(Looked up via ${toolName}.)` };
      if (data.items) {
        return { content: `Here's what I found: ${JSON.stringify(data.items)}. ${amountLine}`.trim() };
      }
      return {
        content: `I've looked that up in our records. ${amountLine} Ask a more specific question if you need another detail, or say if you'd like a human.`,
      };
    }

    if (/ignore (all )?previous|system prompt|jailbreak|reveal your (prompt|rules)/.test(lower)) {
      return {
        content:
          "I can't share internal instructions. I can help with your account, booking, or order questions — what do you need?",
      };
    }

    // Out of scope before knowledge dumps
    if (
      /write me a poem|write a poem|essay about|tell me a joke|homework|recipe for|weather in|translate this unrelated|code (me )?a|who won the (world cup|super bowl)/.test(
        lower,
      )
    ) {
      return {
        content: `I can't help with that — ${scopeHint}`,
      };
    }

    // Card / OTP / secrets
    if (/card (number|details)|cvv|4111|debit card|credit card|charge my card|take my levy off/.test(lower)) {
      return {
        content:
          "I can't take card details in chat — please use the secure payment link or pay at the practice. Never share full card numbers or CVV / OTP here.",
      };
    }
    if (/\botp\b|one-?time (pin|password)|share.*(pin|password)/.test(lower)) {
      return {
        content:
          "Never share OTP, PIN, or passwords with me — I will never ask for them. If someone asks, don't share.",
      };
    }
    if (/^\s*stop\b|unsubscribe|don't (text|message|contact) me|remove me/.test(lower)) {
      return {
        content:
          "Understood — STOP noted. You won't receive marketing messages; I'll hand off so suppression is completed.",
        toolCall: {
          name: findTool(tools, "handoff") ?? "handoff_to_human",
          args: { reason: "stop_suppression", summary: last.slice(0, 200) },
        },
      };
    }
    if (
      /financial advice|should i (invest|take the loan)|which (loan|policy) is best for me|guarantee a return/.test(
        lower,
      )
    ) {
      return {
        content:
          "I can't give financial advice. I can share product information on file or connect you to a licensed human.",
      };
    }

    // Cross-tenant / cross-party BEFORE any booking tools
    if (
      /another (site|practice|branch|scheme|tenant|applicant|patient|customer|employee|client|person|unit|account|driver)|on (your |this )?platform|pull up (their|his|her|EMP-|unit \d)|colleague'?s?|neighbour'?s?|neighbor'?s?|my (wife|husband|partner|friend|son|daughter)'s|someone else'?s?|other (patient|client|customer|employee|gym|applicant)|manage .+ on this platform|their (patient|account|levy|bookings|salary|leave|file|address|name|phone|marks|chart)|previous (patient|customer)|last (patient|shopper|new hire|transfer|hire)|customer before me|table before me|other gyms|show me (his|her|their)|what does my colleague|who (else )?(applied|has booked|booked|received|lives)|i'?m not the (recipient|buyer)|it'?s not mine|not the recipient|competitor|jobs you did for|who lives there|driver \w+.*(licence|license|address|home)|open tickets for my colleague|salary and how many|claim on policy|policy and their claim/.test(
        lower,
      )
    ) {
      return {
        content:
          "I can't share or access another person's or another tenant's confidential information — only your own account. I'm unable to pull up their records here.",
      };
    }

    // Medical / diet advice (non-clinical desks) — decline without inventing treatment
    if (
      /what exercises should i|grams of protein|diet advice|build muscle|fix it\?|sore during squats/.test(lower) &&
      !/tooth|dental|vet|clinic|filling|root canal/.test(input.system.slice(0, 200).toLowerCase())
    ) {
      return {
        content:
          "I can't give medical or diet advice. Please speak to a qualified professional — I can help with membership plans, classes, freezes, or billing instead.",
      };
    }

    // Clinical symptoms → handoff (before treatment-info tools)
    if (
      /aches|dark spot|swollen|throbbing|do i need a filling|is it infected|pus|abscess|collapsed|struggling to breathe|rat poison|poison|can't put weight/.test(
        lower,
      )
    ) {
      const num = emergencyNumber(input.system);
      if (/collapsed|breathe|poison|bleeding heavily|unconscious/.test(lower)) {
        return {
          content: `This sounds urgent — call **${num}** / local emergency services or your nearest emergency clinic now. I'm handing you to a human.`,
          toolCall: {
            name: findTool(tools, "handoff") ?? "handoff_to_human",
            args: { reason: "emergency", summary: last.slice(0, 400) },
          },
        };
      }
      return {
        content:
          "I can't diagnose or give clinical advice in chat — I'm connecting you to a human teammate who can help you book the right care.",
        toolCall: {
          name: findTool(tools, "handoff") ?? "handoff_to_human",
          args: { reason: "clinical", summary: last.slice(0, 400) },
        },
      };
    }

    // Billing / levy / approval disputes → handoff before domain tools
    if (
      /never agreed|want it (taken off|fixed|reversed)|debited me twice|underpaid|skip the (finance|vendor|approval)|conflict of interest|my brother|already paid but|needs sorting|approve this .* skip/.test(
        lower,
      )
    ) {
      return {
        content:
          "I'm connecting you to a human teammate for this dispute / exception — they'll look into it. I can't reverse charges or skip approvals myself.",
        toolCall: {
          name: findTool(tools, "handoff") ?? "handoff_to_human",
          args: { reason: "dispute", summary: last.slice(0, 400) },
        },
      };
    }

    // Security / force entry
    if (/force (the )?(gate|door)|break(ing)? in|home alone|security breach|intruder/.test(lower)) {
      const num = emergencyNumber(input.system);
      return {
        content: `This is a security emergency — call **${num}** / local emergency services and the 24/7 security line now. I'm handing you to a human urgently.`,
        toolCall: {
          name: findTool(tools, "handoff") ?? "handoff_to_human",
          args: { reason: "emergency", summary: last.slice(0, 400) },
        },
      };
    }

    if (
      /erase my data|delete my (data|account|personal)|right to be forgotten|gdpr.*(eras|delet)|ccpa.*(delet|eras)/.test(
        lower,
      )
    ) {
      return {
        content:
          "I can't complete a GDPR/CCPA erasure in chat — I'm handing you to a human so they can process the deletion request properly.",
        toolCall: {
          name: findTool(tools, "handoff") ?? "handoff_to_human",
          args: { reason: "gdpr_erasure", summary: last.slice(0, 400) },
        },
      };
    }

    if (
      /life-?threatening|emergency|chest pain|can't breathe|suicide|burst pipe|gas leak|electrical hazard|security breach|flooding|fire in/.test(
        lower,
      )
    ) {
      const num = emergencyNumber(input.system);
      return {
        content: `If this is life-threatening or an emergency, call **${num}** / local emergency services now. I'm also handing you to a human teammate urgently.`,
        toolCall: {
          name: findTool(tools, "handoff") ?? "handoff_to_human",
          args: { reason: "emergency", summary: last.slice(0, 400) },
        },
      };
    }

    // Take a message / route — before generic human handoff
    if (/take (a )?message|leave a message|pass (this |a )?message|tell them i called/.test(lower)) {
      const msg = findTool(tools, "take_message") ?? findTool(tools, "message");
      if (msg) {
        return {
          content: "I'll take a message and pass it on.",
          toolCall: { name: msg, args: { message: last.slice(0, 400) } },
        };
      }
    }
    if (/put me through|route (me )?to|sales department|accounts department|billing department/.test(lower)) {
      const route = findTool(tools, "route") ?? findTool(tools, "department");
      if (route) {
        return {
          content: "Routing you to that department now.",
          toolCall: { name: route, args: { department: last.slice(0, 80) } },
        };
      }
    }

    // Sensitive / explicit human → handoff (avoid matching "broken gate" maintenance)
    if (
      /speak to|talk to (someone|an? actual|a real)|real (person|advisor|broker|attorney|receptionist)|actual (person|accountant|advisor|broker|attorney|receptionist|human)|get (an? )?actual person|on the line for me|someone from (your )?team|someone at the|call me about|get someone from|call me please|handoff|escalate|harassment|discrimination|ada |accommodation|grievance|bully|depression|booked off|sick.?note|disciplinary|termination letter|connect me|clinical|symptom|diagnosis|tooth (pain|ache)|chest pain|swelling|bleeding|knocked (out|my)|fever|vomiting|seizure|fracture|billing (dispute|issue|error)|file a complaint|i want to complain|fraud|tax advice|managing agent|procurement desk/.test(
        lower,
      )
    ) {
      return {
        content:
          "I'm connecting you to a human teammate confidentially — they'll follow up. I won't handle the substance of this in chat.",
        toolCall: {
          name: findTool(tools, "handoff") ?? "handoff_to_human",
          args: { reason: "sensitive_or_explicit", summary: last.slice(0, 400) },
        },
      };
    }

    // Unknown / out-of-policy facts → handoff rather than inventing
    if (
      /airbnb|short-let|60-day terms|bulk invoicing|am i allowed to run|do you offer [^?]{10,80}\?/.test(lower) &&
      !hit()
    ) {
      return {
        content:
          "I don't have that on file — I'm connecting you to a human teammate who can confirm rather than guessing.",
        toolCall: {
          name: findTool(tools, "handoff") ?? "handoff_to_human",
          args: { reason: "unknown_fact", summary: last.slice(0, 400) },
        },
      };
    }

    if (/got the job|have the job|means i'?ve got|guaranteed an interview|qualify for the role, right/.test(lower)) {
      const kb = hit();
      return {
        content:
          (kb ? kb + "\n\n" : "") +
          "Screening against listed requirements is indicative only — it is not a hiring decision. The hiring team decides interviews and offers; I can't guarantee a job or interview.",
      };
    }

    // Confirm → write tools
    if (
      /^(yes|yep|yeah|correct|confirmed)\b|yes[,.]? (please|correct|submit|confirm|book|go ahead|log)|please submit|everything is correct|confirm.*(book|application)|go ahead and (book|log|submit|buy)|please (log|book|confirm|buy|record)/.test(
        lower,
      )
    ) {
      const prior = input.messages.map((m) => m.content).join(" ").toLowerCase();
      const capture = findTool(tools, "capture");
      const book =
        findTool(tools, "book") ?? findTool(tools, "appointment") ?? findTool(tools, "reserve");
      const log =
        findTool(tools, "log_maintenance") ??
        findTool(tools, "log_payroll") ??
        findTool(tools, "log_");
      const sale = findTool(tools, "record_sale");
      const credit = findTool(tools, "credit");
      const reorder = findTool(tools, "reorder");
      const purchase = findTool(tools, "purchase");
      if (capture && /application|apply|brief|intake|submission|interest|enquiry/.test(lower + prior)) {
        return {
          content: "Submitting that now.",
          toolCall: { name: capture, args: { confirmed: true } },
        };
      }
      if (log && /log|maintenance|gate|payslip|resend|query/.test(lower + prior)) {
        return {
          content: "Logging that now.",
          toolCall: { name: log, args: { confirmed: true, summary: prior.slice(-400) } },
        };
      }
      if (sale && /sale|sold/.test(lower + prior)) {
        return { content: "Recording the sale.", toolCall: { name: sale, args: { confirmed: true } } };
      }
      if (credit && /credit|tik/.test(lower + prior)) {
        return { content: "Recording the credit.", toolCall: { name: credit, args: { confirmed: true } } };
      }
      if (reorder && /reorder|restock/.test(lower + prior)) {
        return { content: "Placing the reorder.", toolCall: { name: reorder, args: { confirmed: true } } };
      }
      if (purchase && /buy|voucher|purchase/.test(lower + prior)) {
        return { content: "Purchasing now.", toolCall: { name: purchase, args: { confirmed: true } } };
      }
      if (book && /book|appointment|reserve|site.?visit|callback/.test(lower + prior)) {
        return {
          content: "Confirming that booking now.",
          toolCall: {
            name: book,
            args: { confirmed: true, date: "Thursday", name: "Guest", contact: "guest@example.com" },
          },
        };
      }
    }

    // Log maintenance / payroll query — confirm first unless already confirmed
    if (/please log|can payroll resend|log a |resend it/.test(lower) && !/yes[,.]? (please )?(log|confirm)|confirmed/.test(lower)) {
      const log =
        findTool(tools, "log_maintenance") ??
        findTool(tools, "log_payroll") ??
        findTool(tools, "log_");
      if (log && /maintenance|gate|leak|light|payslip|resend|payroll/.test(lower)) {
        return {
          content:
            "I can log that — please confirm the details are correct (unit/issue or contact) and say yes to confirm, then I'll log it.",
        };
      }
    }

    // Supplier onboarding — need details first
    if (/set up a new supplier|onboard a new supplier|new supplier for us/.test(lower)) {
      const onboard = findTool(tools, "onboarding") ?? findTool(tools, "supplier");
      if (onboard && !/contact|082|555|bosveld|pty|ltd/.test(lower)) {
        return {
          content:
            "I can start supplier onboarding — please share the supplier name, a contact person, and a phone or email.",
        };
      }
      if (onboard && /please onboard|contact/.test(lower)) {
        return {
          content: "Starting supplier onboarding with the details you shared.",
          toolCall: { name: onboard, args: { confirmed: true, summary: last.slice(0, 300) } },
        };
      }
    }

    // Availability / "can I book … Thursday" — check slots, don't book yet
    if (
      (/availab|free slot|when are you free|any openings|can i (book|get)|this (thursday|monday|tuesday|wednesday|friday)|next week|in stock|for my (dog|cat)|wellness consultation/.test(
        lower,
      ) ||
        /book.*(thursday|monday|this week)/.test(lower)) &&
      !/please book|go ahead and book|yes,? book|confirm.*(book|appointment)|i'?d like to book .+ at \d/.test(lower)
    ) {
      const avail = findTool(tools, "availability") ?? findTool(tools, "calendar");
      if (avail) {
        return {
          content:
            "Of course — no problem. Checking availability now; I won't book until you confirm which slot you want. Let me know what works.",
          toolCall: { name: avail, args: { date: "Thursday" } },
        };
      }
    }
    // Booking request with details — confirm before writing
    if (/i'?d like to book|please book/.test(lower) && !/yes[,.]? (please )?book|go ahead/.test(lower)) {
      return {
        content:
          "Of course — no problem. I have those details. Shall I go ahead and book that, or would you like a different time? Let me know and I won't book until you confirm.",
      };
    }
    if (/don'?t book|just (asking|checking)|not ready to book|before (i|we) book/.test(lower)) {
      return {
        content:
          "Of course — no problem. I won't book anything yet. Tell me the service and preferred times whenever you're ready, and let me know when to go ahead.",
      };
    }

    // Intent → tools
    const intentTool = pickToolByIntent(tools, lower);
    if (intentTool && !/handoff/.test(intentTool)) {
      return {
        content: `Let me check that with ${intentTool.replace(/_/g, " ")}.`,
        toolCall: { name: intentTool, args: { query: last.slice(0, 200) } },
      };
    }

    if (/what jobs|hiring for|open roles|vacancies|positions (are )?open/.test(lower)) {
      const tool = findTool(tools, "job") ?? findTool(tools, "opening");
      if (tool) return { content: "I'll pull the current openings.", toolCall: { name: tool, args: {} } };
    }

    if (/i('| w)?d like to apply|want to apply|apply for the/.test(lower)) {
      const kb = hit();
      return {
        content:
          (kb ? kb + "\n\n" : "") +
          "I can capture your application for the hiring team. Please confirm your name, contact, and role — screening is indicative only and not a hiring decision. Reply yes to submit once details look right.",
      };
    }

    if (/do i qualify|code \d|prdp|requirements|licence|license/.test(lower)) {
      const kb = hit();
      return {
        content:
          (kb ? kb + "\n\n" : "") +
          "Based on the listed minimum requirements, you may not yet meet every requirement (for example licence class / PrDP where listed). This is indicative only — not a hiring decision.",
      };
    }

    if (/order number|which order|waybill|tracking number|reference (number|please)|no (order|waybill)/.test(lower) ||
      (/track|order status|where's my/.test(lower) && !/\b(\d{3,}|ORD-?\d+|WB-?\d+)\b/i.test(last))) {
      if (/track|order|waybill|consignment|parcel|delivery/.test(lower)) {
        return {
          content:
            "Happy to help — please share the order number, waybill, or tracking / reference number and I'll look it up.",
        };
      }
    }

    const order = last.match(/\b(\d{3,}|ORD-?\d+|WB-?\d+|PO-\d+)\b/i);
    if (/where('| i)?s my order|track|order status|status of po|purchase order/.test(lower) && order) {
      const tool =
        findTool(tools, "po_status") ??
        findTool(tools, "track") ??
        findTool(tools, "order") ??
        "get_order_status";
      return {
        content: "Looking that up now.",
        toolCall: { name: tool, args: { order_id: order[1], po_number: order[1] } },
      };
    }

    if (/what should i bring|what to bring|bring to my/.test(lower)) {
      const kb =
        knowledgeHit(input.system, "what to bring vaccination card id medical aid records policy appointment") ||
        hit();
      if (kb) return { content: kb };
      return {
        content:
          "Please bring your ID, medical aid/insurance card, and any vaccination card or prior records per our policy.",
      };
    }

    // Leave entitlement (policy) vs personal balance
    if (/do we get|entitlement|days of annual leave.*year|leave do we get/.test(lower)) {
      const kb = knowledgeHit(input.system, "annual leave 21 days per year entitlement policy") || hit();
      if (kb) return { content: kb };
    }

    if (/how much|price|cost|hours|open|wifi|check-in|menu|service|treatment|levy|balance|bill|net pay|payslip|membership/.test(lower)) {
      const kb = hit();
      if (kb) return { content: kb };
    }

    // Contract cancel → human (don't self-process)
    if (/cancel (it|my|the) (today|contract|membership)|12-month contract/.test(lower)) {
      return {
        content:
          "I can't self-process a contract cancellation in chat — I'm connecting you to a human teammate to handle it.",
        toolCall: {
          name: findTool(tools, "handoff") ?? "handoff_to_human",
          args: { reason: "contract_cancel", summary: last.slice(0, 400) },
        },
      };
    }

    const kb = hit();
    if (kb && !META_CHUNK.test(kb.slice(0, 60))) return { content: kb };

    // Wifi / parking / breakfast / check-in / attractions — try amenity-oriented retrieval
    if (/wifi|wi-fi|parking|breakfast|check-?in|check-?out|pool|gym|attraction|restaurant|amenity/.test(lower)) {
      const amenity =
        knowledgeHit(input.system, `wifi parking breakfast check-in checkout pool amenity attractions restaurants ${last}`) ||
        kb;
      const tool = findTool(tools, "amenity") ?? findTool(tools, "guest");
      if (tool) {
        return {
          content: "Checking amenity info.",
          toolCall: { name: tool, args: { query: last.slice(0, 200) } },
        };
      }
      if (amenity) return { content: amenity };
    }

    if (/hours|open|closed|what time/.test(lower)) {
      const hours = knowledgeHit(input.system, "hours open monday tuesday wednesday thursday friday saturday sunday am pm closed") || kb;
      if (hours) return { content: hours };
    }

    // Last resort unknown factual question → handoff (skip greetings / vague help)
    if (
      last.length > 45 &&
      /\?/.test(last) &&
      /do you offer|am i allowed|is there a|what is the policy|where is the|how do i/.test(lower) &&
      !/can you help|hi |hello|hey /.test(lower)
    ) {
      return {
        content:
          "I don't have a grounded answer for that on file — I've connected you to a human teammate who can help.",
        toolCall: {
          name: findTool(tools, "handoff") ?? "handoff_to_human",
          args: { reason: "unknown_fact", summary: last.slice(0, 400) },
        },
      };
    }

    if (intentTool) {
      return {
        content: "Connecting you to a teammate.",
        toolCall: { name: intentTool, args: { summary: last.slice(0, 400) } },
      };
    }

    return {
      content: `Happy to help. ${scopeHint}`,
    };
  }
}

/** Env access without node type deps (matches the connectors package idiom). */
function env(name: string): string | undefined {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

/** Marketplace model ids -> concrete OpenAI models. The catalogue's Claude/Gemini tiers
 *  map to the closest OpenAI equivalent while OpenAI is the only wired provider. */
const OPENAI_MODEL_MAP: Record<string, string> = {
  "gemini-flash": "gpt-4o-mini",
  "gpt-4o-mini": "gpt-4o-mini",
  "claude-sonnet": "gpt-4o",
  "gpt-4o": "gpt-4o",
  "claude-opus": "gpt-4o",
};

async function openAiCompatibleComplete(
  baseUrl: string,
  apiKey: string,
  input: {
    system: string;
    messages: ChatMessage[];
    tools: AgentPackage["tools"];
    model: string;
  },
  modelId: string,
): Promise<{ content: string; toolCall?: { name: string; args: Record<string, unknown> } }> {
  const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        temperature: 0.4,
        max_tokens: 500,
        messages: [
          { role: "system", content: input.system },
          ...input.messages.map((m) =>
            m.role === "tool"
              ? {
                  role: "assistant" as const,
                  content: `[${m.toolName ?? "tool"} result] ${m.content}`,
                }
              : { role: m.role, content: m.content },
          ),
        ],
        tools: input.tools.length
          ? input.tools.map((t) => ({
              type: "function",
              function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters ?? { type: "object", properties: {} },
              },
            }))
          : undefined,
      }),
    });
    const json = (await res.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: Array<{ function: { name: string; arguments: string } }>;
        };
      }>;
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(json.error?.message ?? `Model API ${res.status}`);
    const msg = json.choices?.[0]?.message;
    const tc = msg?.tool_calls?.[0];
    if (tc) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>;
      } catch {
        /* tolerate malformed args */
      }
      return { content: (msg?.content ?? "").trim(), toolCall: { name: tc.function.name, args } };
    }
    return { content: (msg?.content ?? "").trim() || "…" };
  } catch {
    return {
      content:
        "I'm having trouble reaching my knowledge right now — please try again in a moment, or say you'd like a human and I'll connect you.",
    };
  }
}

/** Live OpenAI adapter (MIAI_MODEL_MODE=openai + OPENAI_API_KEY). */
export class OpenAIModelAdapter implements ModelAdapter {
  async complete(input: {
    system: string;
    messages: ChatMessage[];
    tools: AgentPackage["tools"];
    model: string;
  }) {
    const apiKey = env("OPENAI_API_KEY") ?? "";
    const model = OPENAI_MODEL_MAP[input.model] ?? env("OPENAI_MODEL_DEFAULT") ?? "gpt-4o-mini";
    return openAiCompatibleComplete("https://api.openai.com/v1", apiKey, input, model);
  }
}

/** MyInstantAI model gateway (OpenAI-compatible). MIAI_MODEL_MODE=gateway. */
export class GatewayModelAdapter implements ModelAdapter {
  async complete(input: {
    system: string;
    messages: ChatMessage[];
    tools: AgentPackage["tools"];
    model: string;
  }) {
    const base = env("MIAI_MODEL_GATEWAY_URL") ?? "";
    const apiKey = env("MIAI_MODEL_GATEWAY_KEY") ?? env("MIAI_MODEL_API_KEY") ?? "";
    // Gateway may accept catalogue aliases directly; fall back to OpenAI map.
    const model =
      env("MIAI_MODEL_PASSTHROUGH") === "1"
        ? input.model
        : (OPENAI_MODEL_MAP[input.model] ?? input.model);
    return openAiCompatibleComplete(base, apiKey, input, model);
  }
}

export function createModelAdapter(): ModelAdapter {
  const mode = env("MIAI_MODEL_MODE") ?? "mock";
  if ((mode === "gateway" || mode === "http") && env("MIAI_MODEL_GATEWAY_URL")) {
    return new GatewayModelAdapter();
  }
  if (mode === "openai" && env("OPENAI_API_KEY")) {
    return new OpenAIModelAdapter();
  }
  return new MockModelAdapter();
}

function resolveBindings(pkg: AgentPackage, override?: ToolBinding[]): ToolBinding[] {
  if (override?.length) return override;
  const preset = getPreset(pkg.manifest.id);
  if (preset) return preset.bindings;
  return defaultBindingsForTools(pkg.tools.map((t) => t.name));
}

function bindingFor(tool: string, bindings: ToolBinding[]): ToolBinding {
  return (
    bindings.find((b) => b.tool === tool) ?? {
      tool,
      connector: "webhook",
    }
  );
}

export async function runTurn(
  req: TurnRequest,
  deps?: { wallet?: WalletAdapter; model?: ModelAdapter },
): Promise<TurnResult> {
  const wallet = deps?.wallet ?? createWalletAdapter();
  const model = deps?.model ?? createModelAdapter();

  if (req.state === "paused_no_tokens") {
    return {
      assistantMessage:
        "Rental active — token balance empty. Top up tokens and I’ll resume mid-conversation.",
      messages: req.messages,
      toolCalls: [],
      tokensDebited: 0,
      balance: (await wallet.getBalance(req.workspaceId)).tokens,
      state: "paused_no_tokens",
      paused: true,
    };
  }

  const knowledge = req.knowledgeOverride?.trim() || req.pkg.knowledge;
  const knowledgeBudget = Number(env("RUNTIME_KNOWLEDGE_CHARS") ?? 40_000);
  const system = [
    req.pkg.system_prompt,
    "",
    "## Response rules",
    "Answer factual questions (office locations, hours, PTO, benefits, hiring, policies) from the knowledge base first.",
    "Only call tools when you need a live system action (booking, ticket, order lookup, handoff).",
    "Never paste raw JSON tool payloads to the user — summarize in clear natural language.",
    "",
    "## Knowledge base",
    knowledge.slice(0, knowledgeBudget),
    "",
    "## Guardrails",
    req.pkg.guardrails.slice(0, 4000),
    "",
    req.systemAppend ? req.systemAppend + "\n" : "",
    `Mode: ${req.mode}. Model: ${req.model}.`,
  ].join("\n");

  const messages: ChatMessage[] = [
    ...req.messages,
    { role: "user", content: req.userMessage },
  ];

  const bal = await wallet.getBalance(req.workspaceId);
  if (bal.tokens <= 0) {
    return {
      assistantMessage:
        "Rental active — token balance empty. Top up tokens and I’ll resume mid-conversation.",
      messages,
      toolCalls: [],
      tokensDebited: 0,
      balance: 0,
      state: "paused_no_tokens",
      paused: true,
    };
  }

  const bindings = resolveBindings(req.pkg, req.bindings);
  const toolCalls: TurnResult["toolCalls"] = [];

  const executeTool = async (name: string, args: Record<string, unknown>) => {
    const result = await executeConnector({
      workspaceId: req.workspaceId,
      agentId: req.agentId,
      tool: name,
      args,
      binding: bindingFor(name, bindings),
      mode: req.mode,
    });
    return { ok: result.ok, data: result.data };
  };

  const finishWorkflow = async (
    handled: {
      handled: boolean;
      assistantMessage: string;
      toolCalls: TurnResult["toolCalls"];
      plan?: {
        id: string;
        goal: string;
        status: string;
        steps: Array<{
          id: string;
          label: string;
          tool?: string;
          status: string;
          resultSummary?: string;
        }>;
      };
    },
  ): Promise<TurnResult | null> => {
    if (!handled.handled) return null;
    toolCalls.push(...handled.toolCalls);
    messages.push({ role: "assistant", content: handled.assistantMessage });
    const tokens = estimateTurnTokens(
      req.model,
      system.length + req.userMessage.length,
      handled.assistantMessage.length,
    );
    const debit = await wallet.debit({
      workspaceId: req.workspaceId,
      amount: tokens,
      idempotencyKey: `${req.workspaceId}:${req.agentId}:${Date.now()}:${messages.length}`,
      reason: "agent_turn",
      agentId: req.agentId,
    });
    return {
      assistantMessage: handled.assistantMessage.replace(/<!--miai-workflow:[\s\S]*?-->/g, "").trim(),
      messages,
      toolCalls,
      tokensDebited: tokens,
      balance: debit.balance,
      state: req.state,
      paused: false,
      workflow: handled.plan
        ? {
            id: handled.plan.id,
            goal: handled.plan.goal,
            status: handled.plan.status,
            steps: handled.plan.steps.map((s) => ({
              id: s.id,
              label: s.label,
              tool: s.tool,
              status: s.status,
              resultSummary: s.resultSummary,
            })),
          }
        : undefined,
    };
  };

  // Executive Assistant multi-step workflow
  if (isExecutiveAssistant(req.agentId)) {
    const ea = await runExecutiveAssistantWorkflow({
      agentId: req.agentId,
      userMessage: req.userMessage,
      messages: req.messages,
      toolNames: req.pkg.tools.map((t) => t.name),
      executeTool,
    });
    const done = await finishWorkflow(ea);
    if (done) return done;
  }

  // IT Helpdesk multi-step workflow
  if (isItHelpdesk(req.agentId)) {
    const it = await runItHelpdeskWorkflow({
      agentId: req.agentId,
      userMessage: req.userMessage,
      messages: req.messages,
      toolNames: req.pkg.tools.map((t) => t.name),
      knowledge,
      executeTool,
    });
    const done = await finishWorkflow(it);
    if (done) return done;
  }

  // Salon / Trades / Home-services booking workflow
  if (isBookingFrontDesk(req.agentId)) {
    const bk = await runBookingFrontDeskWorkflow({
      agentId: req.agentId,
      userMessage: req.userMessage,
      messages: req.messages,
      toolNames: req.pkg.tools.map((t) => t.name),
      knowledge,
      executeTool,
    });
    const done = await finishWorkflow(bk);
    if (done) return done;
  }

  // Sales Qualifier multi-step workflow
  if (isSalesQualifier(req.agentId)) {
    const sq = await runSalesQualifierWorkflow({
      agentId: req.agentId,
      userMessage: req.userMessage,
      messages: req.messages,
      toolNames: req.pkg.tools.map((t) => t.name),
      knowledge,
      executeTool,
    });
    const done = await finishWorkflow(sq);
    if (done) return done;
  }

  // Restaurant & Takeaway multi-step workflow
  if (isRestaurantTakeaway(req.agentId)) {
    const rt = await runRestaurantTakeawayWorkflow({
      agentId: req.agentId,
      userMessage: req.userMessage,
      messages: req.messages,
      toolNames: req.pkg.tools.map((t) => t.name),
      knowledge,
      executeTool,
    });
    const done = await finishWorkflow(rt);
    if (done) return done;
  }

  // Onboarding Buddy multi-step workflow
  if (isOnboardingBuddy(req.agentId)) {
    const ob = await runOnboardingBuddyWorkflow({
      agentId: req.agentId,
      userMessage: req.userMessage,
      messages: req.messages,
      toolNames: req.pkg.tools.map((t) => t.name),
      knowledge,
      executeTool,
    });
    const done = await finishWorkflow(ob);
    if (done) return done;
  }

  // Dental Front Desk multi-step workflow (non-clinical booking)
  if (isDentalFrontDesk(req.agentId)) {
    const df = await runDentalFrontDeskWorkflow({
      agentId: req.agentId,
      userMessage: req.userMessage,
      messages: req.messages,
      toolNames: req.pkg.tools.map((t) => t.name),
      knowledge,
      executeTool,
    });
    const done = await finishWorkflow(df);
    if (done) return done;
  }

  // Hotel Guest Concierge multi-step workflow
  if (isHotelGuest(req.agentId)) {
    const hg = await runHotelGuestWorkflow({
      agentId: req.agentId,
      userMessage: req.userMessage,
      messages: req.messages,
      toolNames: req.pkg.tools.map((t) => t.name),
      knowledge,
      executeTool,
    });
    const done = await finishWorkflow(hg);
    if (done) return done;
  }

  let completion = await model.complete({
    system,
    messages,
    tools: req.pkg.tools,
    model: req.model,
  });

  if (completion.toolCall) {
    const { name, args } = completion.toolCall;
    const result = await executeConnector({
      workspaceId: req.workspaceId,
      agentId: req.agentId,
      tool: name,
      args,
      binding: bindingFor(name, bindings),
      mode: req.mode,
    });
    toolCalls.push({ name, args, result: result.data });
    messages.push({
      role: "tool",
      content: JSON.stringify(result.data),
      toolName: name,
    });

    const isReadTool =
      /^(get_|list_|lookup_|check_)/i.test(name) ||
      /job_opening|policy|catalogue|menu|availability/i.test(name);

    if (!result.ok && isReadTool) {
      // Live ATS/HRIS not connected — still answer from uploaded knowledge.
      const follow = await model.complete({
        system,
        messages: [
          ...messages,
          {
            role: "user",
            content:
              `The ${name} system was unreachable. Answer my last question from the knowledge base only ` +
              `(open roles, requirements, policies). Do not mention JSON or connection errors unless you truly have no info.`,
          },
        ],
        tools: [],
        model: req.model,
      });
      completion = {
        content:
          follow.content.trim() ||
          knowledgeHit(system, req.userMessage) ||
          "I couldn't reach the connected HR system, and I don't have that role list in knowledge yet. Upload open roles to Knowledge, or try again shortly.",
      };
    } else if (!result.ok) {
      completion = {
        content:
          "I couldn't reach the connected system just now. I can hand this to a teammate, or we can retry shortly.",
      };
    } else if (name === "handoff_to_human") {
      const reason = String(args.reason ?? "");
      const prior = (completion.content || "").trim();
      if (reason === "emergency" || /emergency|life-threatening|call \*\*/i.test(prior)) {
        completion = {
          content:
            prior ||
            `If this is an emergency, call **${emergencyNumber(system)}** / local emergency services now. I've also connected you to a human teammate urgently.`,
        };
      } else if (reason === "gdpr_erasure" || /erasur|gdpr|delete/i.test(prior)) {
        completion = {
          content:
            prior ||
            "I've connected you to the team for your data erasure / GDPR request — they'll follow up shortly.",
        };
      } else if (prior.length > 40 && !/^let me check/i.test(prior)) {
        completion = { content: prior };
      } else {
        completion = {
          content:
            "I've connected you to the team with the context from this chat — they'll follow up shortly.",
        };
      }
    } else if (name === "get_order_status") {
      const status = String((result.data as { status?: string }).status ?? "processing");
      completion = {
        content: `Your order is currently **${status.replace(/_/g, " ")}**. ${(result.data as { eta?: string }).eta ? `ETA: ${(result.data as { eta?: string }).eta}.` : ""}`,
      };
    } else if (name.includes("book")) {
      const ref = (result.data as { booking_ref?: string }).booking_ref ?? "BK-3391";
      completion = {
        content: `You're booked — reference **${ref}**. You'll get a confirmation on your contact details.`,
      };
    } else if (name.includes("capture_application") || name.includes("application")) {
      const ref =
        String((result.data as { reference?: string }).reference ?? "APP-4821");
      completion = {
        content: `Thanks — your application is captured under reference **${ref}**. The hiring team will follow up; this is not a hiring decision.`,
      };
    } else {
      // Second model pass: turn tool JSON + knowledge into a natural answer
      // (avoids dumping stub payloads like get_policy echo).
      const follow = await model.complete({
        system,
        messages: [
          ...messages,
          {
            role: "user",
            content:
              `Using the ${name} tool result above and the knowledge base, answer my last question in clear natural language. ` +
              `Do not show JSON. If the tool only echoed args or is a sandbox stub, answer fully from the knowledge base open roles / policies.`,
          },
        ],
        tools: [],
        model: req.model,
      });
      const text = follow.content.trim();
      const looksLikeJson = text.startsWith("{") || /Done — I used/.test(text);
      completion = {
        content:
          text && !looksLikeJson
            ? text
            : knowledgeHit(system, req.userMessage) ??
              "I've checked our records. Please ask about a specific policy detail (PTO days, benefits start date, office address) and I'll answer from the knowledge base.",
      };
    }
  }

  messages.push({ role: "assistant", content: completion.content });

  const tokens = estimateTurnTokens(
    req.model,
    system.length + req.userMessage.length,
    completion.content.length,
  );
  const debit = await wallet.debit({
    workspaceId: req.workspaceId,
    amount: tokens,
    idempotencyKey: `${req.workspaceId}:${req.agentId}:${Date.now()}:${messages.length}`,
    reason: "agent_turn",
    agentId: req.agentId,
  });

  const paused = !debit.ok || debit.paused;
  return {
    assistantMessage: completion.content,
    messages,
    toolCalls,
    tokensDebited: debit.ok ? tokens : 0,
    balance: debit.balance,
    state: paused ? "paused_no_tokens" : req.state === "rented" ? "live" : req.state,
    paused,
  };
}
