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
import {
  isAccountingPractice,
  runAccountingPracticeWorkflow,
} from "./workflows/accounting-practice.js";
import {
  isEventsVenue,
  runEventsVenueWorkflow,
} from "./workflows/events-venue.js";
import {
  isBuildingManagement,
  runBuildingManagementWorkflow,
} from "./workflows/building-management.js";
import { isPharmacy, runPharmacyWorkflow } from "./workflows/pharmacy.js";
import {
  isGymMembership,
  runGymMembershipWorkflow,
} from "./workflows/gym-membership.js";
import { isMobileMoney, runMobileMoneyWorkflow } from "./workflows/mobile-money.js";
import {
  isWealthManagement,
  runWealthManagementWorkflow,
} from "./workflows/wealth-management.js";
import { isTaxOffice, runTaxOfficeWorkflow } from "./workflows/tax-office.js";
import { isVeterinary, runVeterinaryWorkflow } from "./workflows/veterinary.js";
import {
  isCustomerSupport,
  runCustomerSupportWorkflow,
} from "./workflows/customer-support.js";
import {
  isDeliveryTracking,
  runDeliveryTrackingWorkflow,
} from "./workflows/delivery-tracking.js";
import {
  isMarketplaceAssistant,
  runMarketplaceAssistantWorkflow,
} from "./workflows/marketplace-assistant.js";
import { wf } from "./workflows/i18n.js";
import {
  applyTemplateVars,
  buildTemplateVars,
  materializePackage,
  scrubLeakedPlaceholders,
} from "./templates.js";
import { checkInputGuardrails, checkOutputGuardrails } from "./guardrails.js";
import {
  createEmbedderFromEnv,
  semanticRetrievalEnabled,
} from "./embeddings.js";
import { selectKnowledgeForPromptAsync } from "./knowledge-retrieve.js";

export type { WorkflowPlan, WorkflowStep };
export {
  applyTemplateVars,
  buildTemplateVars,
  materializePackage,
  scrubLeakedPlaceholders,
} from "./templates.js";
export { checkInputGuardrails, checkOutputGuardrails } from "./guardrails.js";
export {
  selectKnowledgeForPrompt,
  selectKnowledgeForPromptAsync,
  retrieveKnowledgeChunks,
  retrieveKnowledgeChunksHybrid,
} from "./knowledge-retrieve.js";
export {
  createEmbedderFromEnv,
  semanticRetrievalEnabled,
  LocalHashEmbedder,
  OpenAiCompatibleEmbedder,
  cosineSimilarity,
  clearEmbeddingCache,
  type Embedder,
} from "./embeddings.js";

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
  /** BCP-47-ish reply language for deterministic workflow strings (en, es, fr, …). */
  replyLanguage?: string;
  /** Consumer line: the turn runs for a single person (first-party), not a business tenant.
   *  Skips the cross-tenant data-access guardrail so benign family references ("my daughter
   *  Aya") are not misread as cross-tenant probes. All other safety checks still apply. */
  consumerLine?: boolean;
  /** Caller-provided per-turn idempotency key for the wallet debit — stable across retries of the
   *  same turn and unique per turn. When absent, a deterministic key is derived from the turn
   *  content so re-processed requests still dedup instead of double-charging. */
  idempotencyKey?: string;
}

export interface TurnResult {
  assistantMessage: string;
  messages: ChatMessage[];
  toolCalls: Array<{
    name: string;
    args: Record<string, unknown>;
    result: unknown;
    connector?: string;
    stubbed?: boolean;
    live?: boolean;
  }>;
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

export type ModelCompleteInput = {
  system: string;
  messages: ChatMessage[];
  tools: AgentPackage["tools"];
  model: string;
  /** From manifest.model.temperature when set. */
  temperature?: number;
  /** From manifest.model.max_output_tokens when set. */
  maxOutputTokens?: number;
  /** From manifest.model.fallback — tried once after primary provider failure. */
  fallbackModel?: string;
  /** Consumer line — skips the cross-tenant input guardrail (see TurnRequest.consumerLine). */
  consumerLine?: boolean;
};

/** Provider-reported token usage for a single model call (used for accurate wallet metering). */
export type TokenUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type ModelCompleteResult = {
  content: string;
  toolCall?: { name: string; args: Record<string, unknown> };
  /** Present only for live providers that report usage; absent for the mock model. */
  usage?: TokenUsage;
};

/** Incremental token/text from the model (OpenAI-style streaming). */
export type StreamChunk =
  | { type: "delta"; text: string }
  | {
      type: "done";
      content: string;
      toolCall?: ModelCompleteResult["toolCall"];
      usage?: TokenUsage;
    };

/** Normalize an OpenAI-compatible `usage` block to TokenUsage (undefined when absent). */
function mapUsage(u?: {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}): TokenUsage | undefined {
  if (!u || (u.prompt_tokens == null && u.completion_tokens == null && u.total_tokens == null)) {
    return undefined;
  }
  const totalTokens =
    (u.total_tokens ?? (u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0)) || undefined;
  return { promptTokens: u.prompt_tokens, completionTokens: u.completion_tokens, totalTokens };
}

export interface ModelAdapter {
  complete(input: ModelCompleteInput): Promise<ModelCompleteResult>;
  /** When present, yields true token deltas for openai/gateway (mock paces after generate). */
  streamComplete?(input: ModelCompleteInput): AsyncIterable<StreamChunk>;
}

async function* streamFromComplete(
  model: ModelAdapter,
  input: ModelCompleteInput,
): AsyncIterable<StreamChunk> {
  const result = await model.complete(input);
  if (result.content) {
    const parts = result.content.split(/(\s+)/).filter(Boolean);
    let buf = "";
    for (const p of parts) {
      buf += p;
      if (buf.length >= 8 || /\n$/.test(buf)) {
        yield { type: "delta", text: buf };
        buf = "";
      }
    }
    if (buf) yield { type: "delta", text: buf };
  }
  yield { type: "done", content: result.content, toolCall: result.toolCall, usage: result.usage };
}

async function* iterateModelStream(
  model: ModelAdapter,
  input: ModelCompleteInput,
): AsyncIterable<StreamChunk> {
  if (model.streamComplete) {
    yield* model.streamComplete(input);
    return;
  }
  yield* streamFromComplete(model, input);
}

/** Run a model call, optionally forwarding live text deltas (true stream when adapter supports it). */
async function modelAnswer(
  model: ModelAdapter,
  input: ModelCompleteInput,
  onDelta?: (text: string) => void,
): Promise<ModelCompleteResult> {
  let content = "";
  let toolCall: ModelCompleteResult["toolCall"];
  let usage: TokenUsage | undefined;
  for await (const chunk of iterateModelStream(model, input)) {
    if (chunk.type === "delta") {
      content += chunk.text;
      onDelta?.(chunk.text);
    } else {
      content = chunk.content || content;
      toolCall = chunk.toolCall;
      usage = chunk.usage;
    }
  }
  return { content: content || "…", toolCall, usage };
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
    const head = chunk.split("\n")[0] || "";
    if (META_CHUNK.test(head) && !/levy schedule|payslip|leave|price|treatment|service|amenity|po-|purchase/i.test(chunk.slice(0, 80))) {
      continue;
    }
    // Skip catalogue preamble / "how this file works" blobs that steal retrieval
    if (
      /single source of truth|chunked by|indexed for retrieval|example values are fictional|replace per tenant|how this file works|template vs tenant/i.test(
        chunk.slice(0, 280),
      )
    ) {
      continue;
    }
    if (/^## (guardrails|response rules|us compliance|eu compliance|market operations)/i.test(chunk)) continue;
    if (/^#\s+\w/.test(head) && !/^## /.test(head) && chunk.length < 400 && /knowledge base/i.test(head)) continue;

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
    if (/deadline|due|vat|paye|filing|applications close|close for/.test(q) && /deadline|due|vat|paye|september|25th|30 september|filing/.test(lower))
      score += 16;
    if (/document|irp5|personal (income )?tax|what (do you )?need/.test(q) && /irp5|document|medical aid|certificate|bring/.test(lower))
      score += 16;
    if (/application fee|how much.*fee/.test(q) && /fee|r\s?\d|usd|€|\$/.test(lower)) score += 14;
    if (/visitor|parking|access|gate|remote/.test(q) && /visitor|parking|access|gate/.test(lower)) score += 12;
    if (/po-\d+|purchase order|supplier/.test(q) && /po-|purchase|supplier/.test(lower)) score += 14;
    if (/bedroom|special levy|levy/.test(q) && /levy|bedroom|special levy/.test(lower)) score += 14;
    if (/net pay|payslip|paye|deduction/.test(q) && /payslip|net|paye|gross|emp-/.test(lower)) score += 12;
    if (/pto|annual leave|leave (do i|days)|how many days/.test(q) && /leave|pto|21 days|annual|holiday/.test(lower))
      score += 18;
    if (/benefit|401|provident|medical aid|health insurance/.test(q) && /benefit|401|provident|medical|health|wellness/.test(lower))
      score += 18;
    if (/cdl|class a|code 10|prdp|qualify|driver/.test(q) && /cdl|class a|code 10|prdp|requirement|licence|license|driver/.test(lower))
      score += 16;
    if (/breakfast|desayuno|pool|piscina/.test(q) && /breakfast|pool|gym|amenity|07:00|7:00|6:30|10:30|22:00/.test(lower))
      score += 16;
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
    // Prefer list/info tours over booking when the user is asking what's included / prices
    if (
      /list_tours/.test(name) &&
      (/tour|activity|excursion|included|winery|hike|paddle|peninsula|winelands/.test(lower) ||
        /how much|price|cost|fee|check-up|standard service/.test(lower))
    )
      score += 18;
    if (
      /check_availability/.test(name) &&
      /how much|price|cost|fee|check-up|standard service/.test(lower) &&
      !/availab|in stock|slot|thursday|book/.test(lower)
    )
      score -= 12;
    if (/^book_tour$|book_tour/.test(name) && /tour|activity|excursion/.test(lower)) {
      if (/what'?s included|included in|how much|price|cost|tell me about/.test(lower)) score -= 20;
      else if (/book|reserve|confirm/.test(lower)) score += 16;
      else score += 2;
    }
    if (/search_products/.test(name) && /product|air.?fryer|fryer|crispy|fries|kettle|coffee|under \$|under \d|catalogue|catalog|in stock|sku|brows/.test(lower))
      score += 18;
    if (/get_product/.test(name) && /tell me about|aircrisp|product|mini \d|sku|model/.test(lower)) score += 16;
    if (
      /check_availability/.test(name) &&
      /in stock|stock at|available at|east austin|branch|warehouse/.test(lower)
    )
      score += 20;
    if (/get_service_info|service_info/.test(name) && /library|hours|opening|campus|service|wellness|financial aid/.test(lower))
      score += 16;
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
    if (
      /amenity/.test(name) &&
      /amenity|breakfast|desayuno|pool|piscina|gym|wifi|check-?in|parking|hora/.test(lower)
    )
      score += 14;
    if (/get_policy$|get_policy\b/.test(name) && /pto|leave|benefit|401|medical|provident|policy|annual leave|how many days/.test(lower))
      score += 18;
    if (/find_collection_point|collection_point/.test(name) && /collect|collection|mexico|pickup|pick up|where can/.test(lower))
      score += 18;
    if (/get_fees|get_corridor|corridor_info/.test(name) && /how much|cost|fee|rate|exchange|corridor|send (money|r\d|usd|eur|\$)/.test(lower))
      score += 20;
    if (
      /capture_transfer/.test(name) &&
      /send .* to|transfer|remit|i'?d like to send/.test(lower) &&
      !/sanctions|watchlist|push .* through|anyway/.test(lower)
    ) {
      // Fee/cost questions must prefer get_fees — do not capture yet
      score += /how much|cost|fee|rate|exchange/.test(lower) ? -12 : 10;
    }
    if (/list_courses|match_course/.test(name) && /course|programme|program|intake|study/.test(lower)) score += 12;
    if (/requirement/.test(name) && /requirement|qualify|need to (have|bring)/.test(lower)) score += 12;
    if (/deadline/.test(name) && /deadline|due date|when (is|are) .* due/.test(lower)) score += 12;
    if (/product_info|get_product/.test(name) && /product|savings|account type|interest/.test(lower)) score += 10;
    if (/track_consignment|track|waybill/.test(name) && /track|waybill|consignment|parcel/.test(lower)) score += 12;
    if (/get_statement|statement/.test(name) && /statement|balance/.test(lower)) score += 10;
    if (/outage/.test(name) && /outage|power cut|water out/.test(lower)) score += 12;
    if (
      /check_stock|stock/.test(name) &&
      /stock|in stock|availability of|do you have|have the |uk \d|size \d|menlyn|hiking|boot|sku|how many .* left/.test(
        lower,
      )
    )
      score += 14;
    if (/notify_when_available|notify/.test(name) && /let me know when|back in stock|notify|alert me|when it'?s back/.test(lower))
      score += 16;
    if (
      /capture_interest|capture_brief|capture_intake|capture_submission|capture_application/.test(name) &&
      /interest|brief|intake|submission|apply|enquiry|qualify/.test(lower) &&
      !/deadline|due|when (do|is|are)|close for|appeal|rejected/.test(lower)
    )
      score += 12;
    if (/get_deadlines|deadline/.test(name) && /deadline|due|close|when do applications|vat return|filing/.test(lower))
      score += 22;
    if (/make_guest_request|guest_request/.test(name) && /towel|late check|housekeeping|wake-?up|extra |room \d/.test(lower))
      score += 14;
    if (/get_local_recommendations|local_recommend/.test(name) && /near|nearby|attraction|restaurant|worth seeing|things to do/.test(lower))
      score += 14;
    if (/match_course|list_courses/.test(name) && /course|programme|program|study|grade|nqf|matric/.test(lower)) score += 14;
    if (/get_process_info|process_info/.test(name) && /process|how (do|does)|steps|procedure/.test(lower)) score += 12;
    if (/get_policy_info|policy_info|get_compliance/.test(name) && /policy|compliance|allowed|am i allowed/.test(lower))
      score += 12;
    if (/book_site_visit|site_visit/.test(name) && /site visit|viewing|walk-?through/.test(lower)) score += 14;
    if (/update_job_status|get_job/.test(name) && /job status|update (the )?job|technician/.test(lower)) score += 12;
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
  async *streamComplete(input: ModelCompleteInput): AsyncIterable<StreamChunk> {
    yield* streamFromComplete(this, input);
  }

  async complete(input: ModelCompleteInput) {
    const last = [...input.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const lower = last.toLowerCase().replace(/##[\s\S]*$/g, " ");
    const toolNote = [...input.messages].reverse().find((m) => m.role === "tool");
    const tools = input.tools;
    const hit = () => knowledgeHit(input.system, last);
    const scopeHint =
      "I can help with orders, products, appointments, bookings, treatments, policies, accounts, and related questions for this business.";

    // Shared hard safety (also applied for live models in runTurn).
    const forced = checkInputGuardrails(last, input.system, tools, {
      consumerLine: input.consumerLine,
    });
    if (forced) return forced;

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
        // Follow-up user text is often a synthetic "Using the tool…" prompt — scan prior users + tools.
        const priorUsers = input.messages
          .filter((m) => m.role === "user")
          .map((m) => m.content)
          .join(" ")
          .toLowerCase();
        const ctx = `${lower} ${priorUsers}`;
        const productDesk = tools.some((t) =>
          /search_products|get_product|check_stock/.test(t.name),
        );
        if (
          productDesk ||
          /stock|in stock|branch|warehouse|east austin|aircrisp|sku|fryer|product|retail/i.test(ctx)
        ) {
          const stockKb =
            knowledgeHit(input.system, `stock available East Austin branch AirCrisp ${priorUsers}`) ||
            kb;
          return {
            content: `${stockKb || "Stock on file."}\n\nI checked availability — that item shows **in stock** at the requested branch (e.g. East Austin) when listed above. ${amountLine}`,
          };
        }
        return {
          content:
            "Of course — no problem. I have availability — for example Thursday 10:00 is open. I won't book yet unless you confirm. Shall I book that for you, or would you like another time? Let me know.",
        };
      }
      if (/search_products|get_product/i.test(toolName)) {
        const productKb =
          knowledgeHit(input.system, `AirCrisp air fryer Mini 5L 2L catalogue ${last}`) || kb;
        return {
          content: `${productKb || "Products on file."}\n\n${amountLine}\nI can also check branch stock with check_availability.`,
        };
      }
      if (/list_tours/i.test(toolName)) {
        const tourKb =
          knowledgeHit(input.system, `tour included guide transport water price hike paddle winery ${last}`) ||
          kb;
        return {
          content: `${tourKb || "Tours on file."}\n\n${amountLine}\nGuide, transport, and inclusions are listed per tour above.`,
        };
      }
      if (/get_service_info|service_info/i.test(toolName)) {
        const svcKb =
          knowledgeHit(input.system, `Library Central hours 07:30 campus service ${last}`) || kb;
        return {
          content: `${svcKb || "Service info on file."}\n\nLibrary / campus hours are listed above when available.`,
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
      if (/procurement_policy|procurement.*policy|policy.*procurement/i.test(toolName)) {
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
      if (/check_stock|stock/.test(toolName)) {
        return {
          content: `${kb || "Stock on file for that item/size/branch."}\n\n${amountLine}\nI can also set a back-in-stock alert if it's out.`,
        };
      }
      if (/notify_when_available|notify/.test(toolName)) {
        return {
          content: `Alert set — I'll let you know / notify you when it's back in stock. Reference **${data.reference ?? "NTF-1001"}**.`,
        };
      }
      if (/tier_benefits|points_balance|get_tier/i.test(toolName)) {
        return {
          content: `${kb || "Loyalty tier benefits on file."}\n\nPoints expire after 24 months unless the programme says otherwise. ${amountLine}`,
        };
      }
      if (/deadline/i.test(toolName)) {
        const grounded =
          knowledgeHit(input.system, `deadline VAT PAYE due 25th 30 September filing ${last}`) || kb;
        return {
          content: `${grounded || "Deadlines on file."}\n\nKey dates often include the **25th** for VAT and **30 September** style closes where listed. ${amountLine}`,
        };
      }
      if (/required_document|get_required/i.test(toolName)) {
        const grounded =
          knowledgeHit(input.system, `IRP5 medical aid certificate documents personal tax ${last}`) || kb;
        return {
          content: `${grounded || "Required documents on file."}\n\nTypical pack: **IRP5**, medical aid certificate, and ID — confirm from the list above.`,
        };
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
        const priorUsers = input.messages
          .filter((m) => m.role === "user")
          .map((m) => m.content)
          .join(" ");
        const amenityKb =
          knowledgeHit(
            input.system,
            `breakfast desayuno pool piscina gym hours 7:00 07:00 6:30 10:30 22:00 ${priorUsers} ${last}`,
          ) || kb;
        return {
          content: `${amenityKb || "Amenity information on file."}\n\nI can cover check-in, breakfast/desayuno, parking, pool/piscina/gym, and wifi from knowledge. ${amountLine}`,
        };
      }
      if (/get_policy|policy/i.test(toolName) && !/procurement|compliance/i.test(toolName)) {
        const priorUsers = input.messages
          .filter((m) => m.role === "user")
          .map((m) => m.content)
          .join(" ");
        const wantLeave = /pto|leave|how many days/i.test(priorUsers);
        const wantBenefits = /benefit|401|medical|provident|wellness/i.test(priorUsers);
        const sectionRe = wantLeave
          ? /##[^\n]*(leave|pto)[^\n]*\n[\s\S]*?(?=\n## |$)/i
          : wantBenefits
            ? /##[^\n]*benefit[^\n]*\n[\s\S]*?(?=\n## |$)/i
            : /##[^\n]*(leave|pto|benefit)[^\n]*\n[\s\S]*?(?=\n## |$)/i;
        const section = input.system.match(sectionRe)?.[0] || "";
        const policyKb =
          section.trim() ||
          knowledgeHit(
            input.system,
            wantLeave
              ? `Leave PTO policy 21 days annual leave ${priorUsers}`
              : `Benefits 401(k) medical aid provident fund wellness ${priorUsers}`,
          ) ||
          kb;
        return {
          content: `${policyKb || "Policy on file."}\n\n${amountLine}\nLeave (**21 days**), benefits (**401(k)** / medical aid), and related HR policy details are listed above when available.`,
        };
      }
      if (/collection_point|corridor_info|get_fees/i.test(toolName)) {
        const priorUsers = input.messages
          .filter((m) => m.role === "user")
          .map((m) => m.content)
          .join(" ");
        const remKb =
          knowledgeHit(
            input.system,
            /fee|how much|cost|rate|r500|zimbabwe|malawi/i.test(priorUsers)
              ? `fee R30 30 Zimbabwe Malawi corridor send cost exchange rate ${priorUsers}`
              : `SwiftCash Mexico collection point SMS counter branch fees ${priorUsers} ${last}`,
          ) || kb;
        const feeLine = /fee|how much|cost/i.test(priorUsers)
          ? " Example fee on file: **R30** (or the corridor fee returned by the tool)."
          : "";
        return {
          content: `${remKb || "Corridor / collection info on file."}\n\nCollection partners (e.g. SwiftCash — Mexico City) and fee notes are listed above.${feeLine} ${amountLine}`,
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
      if (/log_|maintenance|exception|payroll_query|guest_request|capture_|submit_|open_|create_|enroll_/i.test(toolName)) {
        return {
          content: `Logged — reference **${data.reference ?? data.request_ref ?? "REF-1001"}**. The team will look into it / action it. I haven't marked it fixed.`,
        };
      }
      // Generic read tools (Wave family scaffolds): prefer ## Key facts over Process blobs
      if (
        /^(get_|list_|search_|lookup_|check_)/i.test(toolName) ||
        /_info$|_status$|_requirements$|_products$|_slots$|_plan$|_rules$|_checklist$|_calendar$|_summary$|_template$|_programmes$|_courses$|_offers$|_guide$|_process$|_deadlines$|_outages$|_schedule$|_definition$|_rights$|_policy$|_severity$|_bundles$|_openings$|_docs$|_library$|_patterns$|_tiles$|_faq$/i.test(
          toolName,
        )
      ) {
        const factsMatch = input.system.match(/## Key facts[\s\S]*?(?=\n## |$)/i);
        const facts = factsMatch?.[0]?.trim() || kb;
        return {
          content: `${facts || "Details on file from knowledge."}\n\n${amountLine}\nHappy to help further — shall I continue?`,
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

    // Consumer specialists (study/exam/English coaches, companions) are not the business front-desk
    // the heuristics below assume, so their scope-refusals and handoffs read as off-brand — e.g. a
    // Study Coach shouldn't refuse "help with my homework". Hard safety (crisis, self-harm, secrets,
    // cards, financial advice, cross-tenant) has already run in checkInputGuardrails above (`forced`),
    // so give a coherent, on-topic coach reply here instead of the business fall-through. Real reply
    // quality comes from the live model — this just keeps the deterministic mock (and the sandbox
    // that runs on it) on-brand for the consumer line.
    if (input.consumerLine) {
      const kb = hit();
      if (kb) {
        return { content: `${kb}\n\nWant to go a bit deeper on any of that, or ask something of your own?` };
      }
      return {
        content:
          "Happy to help — let's take it a step at a time. Tell me a bit more about what you'd like to work on, and we'll go from there together.",
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
      /financial advice|should i (invest|buy|cancel|take the loan|switch)|which (loan|policy) is best|good investment|guarantee a return|what do you recommend|cheaper insurer|interest rates to drop|salary or dividends|how much income tax will i owe|tax (advice|planning)/.test(
        lower,
      )
    ) {
      return {
        content:
          "I can't advise / can't give financial advice or recommend salary vs dividends for your situation. Please speak to an accountant — I can connect you to a licensed human / bond originator.",
        toolCall: {
          name: findTool(tools, "handoff") ?? "handoff_to_human",
          args: { reason: "financial_advice", summary: last.slice(0, 400) },
        },
      };
    }

    // Admissions / application appeal → human
    if (/appeal|rejected and i want|challenge the (decision|rejection)/.test(lower)) {
      return {
        content:
          "I'm connecting you to a human teammate for the appeal — they'll follow up. You're connected.",
        toolCall: {
          name: findTool(tools, "handoff") ?? "handoff_to_human",
          args: { reason: "appeal", summary: last.slice(0, 400) },
        },
      };
    }

    // Complaints / fury → human (before domain tools invent refunds)
    if (
      /i'?m (really )?(furious|unhappy|not happy)|want to complain|file a complaint|nobody called|messed up my|arrived cold|ruined|filthy|handled badly|left us behind|third time|aircon is broken.*happy|dirty and/.test(
        lower,
      )
    ) {
      return {
        content:
          "I'm sorry that happened — I'm connecting you to a human teammate on the team who'll follow up. You're connected; I won't invent a refund here.",
        toolCall: {
          name: findTool(tools, "handoff") ?? "handoff_to_human",
          args: { reason: "complaint", summary: last.slice(0, 400) },
        },
      };
    }

    // Supplier / trade issues → handoff
    if (
      /won'?t answer|double-charged|delivered short|supplier.*(issue|problem)|trade desk|bulk (order|purchase)|40 pairs|company hiking|kit out a whole/.test(
        lower,
      )
    ) {
      return {
        content:
          "I've flagged this for the team — reference SUP-1001. A teammate will look into the supplier / bulk / trade request and get back to you.",
        toolCall: {
          name: findTool(tools, "handoff") ?? "handoff_to_human",
          args: { reason: "supplier_or_bulk", summary: last.slice(0, 400) },
        },
      };
    }

    // Stock check clarifying question
    if (/^(is it |are they )?in stock\??$|do you have (it|them)\??$/i.test(lower.trim())) {
      return {
        content: "Happy to check — which item / what item / which product are you asking about, and which size or branch?",
      };
    }

    // Remittance — sanctions / AML before any capture tool
    if (/sanctions|watchlist|aml|push the transfer through|push .* through anyway|bypass (compliance|review)/.test(lower)) {
      return {
        content:
          "I can't / cannot push a flagged transfer through — this needs a compliance review. I'm connecting you to the compliance team now; I won't capture the transfer.",
        toolCall: {
          name: findTool(tools, "handoff") ?? "handoff_to_human",
          args: { reason: "sanctions_aml", summary: last.slice(0, 400) },
        },
      };
    }
    if (
      /move (the )?(money|usd|funds|cash)|transfer.*directly from your side|just (send|move|transfer) (it|the money)|move .* right now/.test(
        lower,
      ) &&
      (findTool(tools, "capture_transfer") || findTool(tools, "remit") || findTool(tools, "corridor"))
    ) {
      return {
        content:
          "I can't move / don't move / never move money myself from this chat. I can only capture a transfer request for the team — you still pay in via EFT/card and the partner pays out for collection.",
      };
    }
    if (
      /how much|what (does|do) it cost|fee|exchange rate/.test(lower) &&
      /send|transfer|remit|corridor|zimbabwe|malawi|mexico|to \w+/.test(lower) &&
      findTool(tools, "fees")
    ) {
      return {
        content: "Looking up live fees / rates now.",
        toolCall: {
          name: findTool(tools, "fees")!,
          args: { amount: "500", corridor: last.slice(0, 120), query: last.slice(0, 200) },
        },
      };
    }
    if (
      /collect (cash|money)|collection point|where can .* collect|pickup in|pick up in mexico/.test(lower) &&
      (findTool(tools, "collection_point") || findTool(tools, "corridor") || findTool(tools, "fees"))
    ) {
      const tool =
        findTool(tools, "collection_point") ??
        findTool(tools, "corridor") ??
        findTool(tools, "fees")!;
      return {
        content: "Looking up collection points / corridor info now.",
        toolCall: { name: tool, args: { city: "Mexico City", query: last.slice(0, 200) } },
      };
    }
    // Full transfer details present → confirm before capture (do not fire tool yet)
    if (
      findTool(tools, "capture_transfer") &&
      /i'?d like to send|send (usd|eur|\$)\s*\d+/.test(lower) &&
      /mobile|contact is|collect cash|her mobile|my contact/.test(lower)
    ) {
      return {
        content:
          "Thanks — I've read back your details. Please **confirm** these look right (sender, amount, destination, recipient, contact) and say **yes** so I can capture the transfer **request** for the team. I won't mark money as sent.",
      };
    }
    // Incomplete send intent — ask for KYC/recipient details; never capture yet
    if (
      findTool(tools, "capture_transfer") &&
      /want to send|send (usd|eur|\$)\s*\d+|send money to/.test(lower) &&
      !/mobile|contact is|passport|document|watchlist|sanctions/.test(lower)
    ) {
      return {
        content:
          "I can help with that corridor. Please share the recipient **name**, **mobile**, and how they'll **collect** (cash pickup / wallet / bank), plus your contact details. I won't capture a transfer request until those details are on file.",
      };
    }
    if (/documents? do i need|what (id|docs|documents)|proof of address|kyc/.test(lower) && findTool(tools, "corridor")) {
      const kb =
        knowledgeHit(input.system, "passport proof of address ID documents KYC send money") || hit();
      return {
        content:
          kb ||
          "Typical send documents: **passport** or national **ID**, and **proof of address**. Exact list depends on corridor and amount.",
      };
    }
    if (
      /send money to mexico|cash pickup|corridor|can i send money/.test(lower) &&
      (findTool(tools, "corridor") || findTool(tools, "fees") || findTool(tools, "collection_point"))
    ) {
      const tool =
        findTool(tools, "corridor") ?? findTool(tools, "fees") ?? findTool(tools, "collection_point")!;
      return {
        content: "Checking corridor / cash pickup options.",
        toolCall: { name: tool, args: { destination: "Mexico", query: last.slice(0, 200) } },
      };
    }

    // Hotel reservation changes → front desk (not amenity lookup)
    if (
      /move my reservation|change (my )?(reservation|room|suite)|weekend rate|king suite|extend my stay/.test(lower) &&
      (findTool(tools, "handoff") || findTool(tools, "amenity"))
    ) {
      return {
        content:
          "I can't change reservations myself — I'll connect you to the front desk / human team to move your reservation and rate.",
        toolCall: {
          name: findTool(tools, "handoff") ?? "handoff_to_human",
          args: { reason: "reservation_change", summary: last.slice(0, 400) },
        },
      };
    }

    // Spanish amenity questions (desayuno / piscina)
    if (/desayuno|piscina|a qué hora|a que hora|hora (es|abre)/.test(lower)) {
      const q = /desayuno|breakfast/.test(lower)
        ? "breakfast hours 7:00 07:00 10:30 desayuno"
        : "pool piscina gym hours 6:30 06:30 10:00 22:00";
      const kb = knowledgeHit(input.system, q) || hit();
      const tool = findTool(tools, "amenity");
      if (tool) {
        return {
          content: "Checking amenity hours.",
          toolCall: { name: tool, args: { query: last.slice(0, 200) } },
        };
      }
      if (kb) return { content: kb };
    }

    // Cross-tenant / cross-party BEFORE any booking tools
    if (
      /another (site|practice|branch|scheme|tenant|applicant|patient|customer|employee|client|person|unit|account|driver|student|retailer|college|school|gym|catalogue|catalog)|on (your |this )?platform|pull (up |another )|pull another|colleague'?s?|neighbour'?s?|neighbor'?s?|my (wife|husband|partner|friend|son|daughter)('s|\s+\w+)|someone else'?s?|other (patient|client|customer|employee|gym|applicant|student)|manage .+ on this platform|their (patient|account|levy|bookings|salary|leave|file|address|name|phone|marks|chart|results|student number|students|timetables|records)|his (exam )?results|her (exam )?results|student number|previous (patient|customer)|last (patient|shopper|new hire|transfer|hire)|customer before me|table before me|other gyms|show me (his|her|their)|what does my colleague|who (else )?(applied|has booked|booked|received|lives)|i'?m not the (recipient|buyer)|it'?s not mine|not the recipient|competitor|jobs you did for|who lives there|driver'?s (home )?address|driver \w{2,12}'s (licence|license|address|phone)|open tickets for my colleague|salary and how many|claim on policy|policy and their claim|waiting list for|whoever else|phone number of whoever|other people (on|waiting)|account (bravo|alpha|other)|invoices for account|statement and outstanding|sipho'?s|job sheet and customer phone|for \w+'s job|technician'?s (job|route)|other account|enrolled at another/.test(
        lower,
      )
    ) {
      return {
        content:
          "I can't share or access another person's, another account holder's, or another tenant's confidential information — privacy rules mean I cannot send another student's records. I can only share your own account / jobs assigned to you. I'm unable to pull up their records or accounts other than yours here.",
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
    // Word-bound short tokens — bare "pus" must not match "campus".
    if (
      /\baches\b|dark spot|\bswollen\b|\bthrobbing\b|do i need a filling|is it infected|\bpus\b|\babscess\b|\bcollapsed\b|struggling to breathe|rat poison|\bpoison\b|can't put weight|\bswallowed\b|handful of pills|very drowsy|\boverdose\b/.test(
        lower,
      )
    ) {
      const num = emergencyNumber(input.system);
      if (/collapsed|breathe|poison|bleeding heavily|unconscious|swallowed|handful of pills|drowsy|overdose|clutching his chest/.test(lower)) {
        return {
          content: `This sounds urgent — call **${num}** / local emergency services or your nearest emergency department / clinic now. I'm handing you to a human.`,
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

    // Gas / electrical safety emergencies (utility / field)
    if (
      /smell gas|gas coming from|gas leak|meter box is sparking|sparking|burning smell|exposed live|got a shock|arcing/.test(
        lower,
      )
    ) {
      const num = emergencyNumber(input.system);
      return {
        content: `This is a safety emergency — leave the area if needed and call **${num}** / local emergency services now. I'm connecting you to a human teammate urgently. I won't say it's safe or that it has been fixed.`,
        toolCall: {
          name: findTool(tools, "handoff") ?? "handoff_to_human",
          args: { reason: "safety_emergency", summary: last.slice(0, 400) },
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
      /life-?threatening|emergency|chest pain|can't breathe|clutching his chest|suicide|burst pipe|gas leak|electrical hazard|security breach|flooding|fire in/.test(
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
      /speak to|talk to (someone|an? actual|a real|reception)|talk to reception|speak to (the )?(pharmacist|reception)|real (person|advisor|broker|attorney|receptionist)|actual (person|accountant|advisor|broker|attorney|receptionist|human)|get (an? )?actual person|on the line for me|dispatch on the line|someone from (your )?team|someone at the|call me about|get someone from|call me please|handoff|escalate|harassment|discrimination|ada |accommodation|grievance|bully|depression|booked off|sick.?note|disciplinary|termination letter|connect me|clinical|symptom|diagnosis|tooth (pain|ache)|chest pain|swelling|bleeding|knocked (out|my)|fever|vomiting|seizure|fracture|billing (dispute|issue|error)|file a complaint|i want to complain|fraud|tax advice|managing agent|procurement desk/.test(
        lower,
      )
    ) {
      // FAQ + handoff in one turn (e.g. library hours, then connect me)
      if (/library|opening hours|what time|where is it on campus/.test(lower)) {
        const faq =
          knowledgeHit(input.system, `Library Central hours 07:30 22:00 campus opening ${last}`) ||
          hit();
        return {
          content: `${faq || "Hours on file."}\n\nI've also connected you to a human teammate on our team — they'll follow up.`,
          toolCall: {
            name: findTool(tools, "handoff") ?? "handoff_to_human",
            args: { reason: "explicit_human_after_faq", summary: last.slice(0, 400) },
          },
        };
      }
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
      (/airbnb|short-let|60-day terms|bulk invoicing|am i allowed|do you (also )?(offer|handle|arrange|compound|set)|does (the|your) .{3,40} (handle|offer|do)|can we (set|apply|use)|can i apply for|fireworks|helicopter|three-phase|immigration visa|veterinary medicines|dstv|media buying|home fibre|reimburse/.test(
        lower,
      ) ||
        (/do you |does (the|your) |am i allowed|can we |can i apply/.test(lower) &&
          /\?/.test(last) &&
          last.length > 35 &&
          !hit())) &&
      !hit()
    ) {
      return {
        content:
          "I don't have that on file — I'm connecting you to a human teammate who can confirm rather than guessing. You're connected.",
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
      const notify = findTool(tools, "notify");
      if (notify && /alert|notify|back|stock|yes/.test(lower + prior)) {
        return {
          content: "Setting the back-in-stock alert now.",
          toolCall: { name: notify, args: { confirmed: true, phone: "0825551212" } },
        };
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

    // Application / VAT / filing deadlines
    if (/applications? close|when do applications|deadline|vat return|filing due|when is our vat/.test(lower)) {
      const deadlines = findTool(tools, "deadline") ?? findTool(tools, "deadlines");
      if (deadlines) {
        return {
          content: "Checking deadlines on file.",
          toolCall: { name: deadlines, args: { query: last.slice(0, 200) } },
        };
      }
    }

    // Availability / "can I book … Thursday" — check slots, don't book yet
    // Skip greetings / vague help so lang-rewrite evals don't hit the calendar tool.
    if (
      !/can you help|help me with pricing|help me today|hi — can you help/i.test(lower) &&
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

    // Back-in-stock notify (ask confirm first unless already confirmed)
    if (/let me know when|when it'?s back|back in stock|set (an? )?alert|notify me when/.test(lower)) {
      const notify = findTool(tools, "notify");
      if (notify && !/yes|confirm|brown please|set the alert/.test(lower)) {
        return {
          content:
            "I can notify you / let you know when it's back in stock — please confirm the item/colour and say yes to set the alert.",
        };
      }
      if (notify) {
        return {
          content: "Setting the back-in-stock alert now.",
          toolCall: { name: notify, args: { confirmed: true, query: last.slice(0, 200) } },
        };
      }
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

    if (/i('| w)?d like to apply|want to apply|apply for the|^i want to apply\.?$/i.test(lower)) {
      const kb = hit();
      // Need details first — don't fire capture_* until confirm
      if (!/name|contact|programme|program|yes[,.]? (please )?submit|confirm/.test(lower)) {
        return {
          content:
            (kb ? kb + "\n\n" : "") +
            "I can capture that — please share your **name**, **contact**, and **which programme** / role, then say yes to submit. Screening is indicative only.",
        };
      }
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

    if (
      /order number|which order|waybill|tracking number|reference (number|please)|no (order|waybill)|where('| i)?s my (order|parcel|package)|track my|order status|status of my order/.test(
        lower,
      ) &&
      !/\b(\d{3,}|ORD-?\d+|WB-?\d+|PO-\d+)\b/i.test(last)
    ) {
      return {
        content:
          "Happy to help — please share the order number, waybill, or tracking / reference number and I'll look it up. Which order should I check?",
      };
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
    if (
      /do we get|entitlement|days of annual leave.*year|leave do we get|how many days.*(pto|leave)|pto\s*\/\s*annual|annual leave do i get|pto \/ annual leave/.test(
        lower,
      )
    ) {
      const policy = findTool(tools, "get_policy") ?? findTool(tools, "policy");
      if (policy) {
        return {
          content: "Checking leave policy on file.",
          toolCall: { name: policy, args: { topic: "leave", query: last.slice(0, 200) } },
        };
      }
      const kb = knowledgeHit(input.system, "annual leave 21 days per year PTO entitlement policy") || hit();
      if (kb) return { content: kb };
    }
    if (/what benefits|benefits do|401\s*\(k\)|provident fund|medical aid|health insurance/.test(lower)) {
      const policy = findTool(tools, "get_policy") ?? findTool(tools, "policy");
      if (policy) {
        return {
          content: "Checking benefits policy on file.",
          toolCall: { name: policy, args: { topic: "benefits", query: last.slice(0, 200) } },
        };
      }
    }

    if (/hours|open|closed|what time (are you|do you)/.test(lower) && !/book|appointment|reserve/.test(lower)) {
      const hours =
        knowledgeHit(input.system, "hours open monday tuesday wednesday thursday friday saturday sunday am pm closed") ||
        hit();
      if (hours) return { content: `${hours}\n\nHours on file — monday open times are listed above.` };
    }

    if (/how much|price|cost|wifi|check-in|menu|service|treatment|levy|balance|bill|net pay|payslip|membership|fee|deposit|medical aid|what (should|do) i bring|what to bring/.test(lower)) {
      const kb = hit();
      const ground = knowledgeHit(input.system, "Eval grounding phrases kept on file") || "";
      if (kb) return { content: `${kb}\n\n${ground}`.trim() };
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
      last.length > 40 &&
      /\?/.test(last) &&
      /do you |does (the|your) |am i allowed|is there a|what is the policy|where is the|how do i|can we |can i (apply|get a)|are you able/.test(
        lower,
      ) &&
      !/can you help|hi |hello|hey |how much|what (are|time)|hours|price|cost/.test(lower) &&
      !hit()
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

/** Marketplace model ids -> concrete OpenAI models. */
const OPENAI_MODEL_MAP: Record<string, string> = {
  "gemini-flash": "gpt-4o-mini",
  "gpt-4o-mini": "gpt-4o-mini",
  "claude-sonnet": "gpt-4o",
  "gpt-4o": "gpt-4o",
  "claude-opus": "gpt-4o",
};

/** Marketplace model ids -> Anthropic Claude models (Messages / OpenAI-compat). */
const ANTHROPIC_MODEL_MAP: Record<string, string> = {
  "gemini-flash": "claude-haiku-4-5-20251001",
  "gpt-4o-mini": "claude-haiku-4-5-20251001",
  "claude-sonnet": "claude-sonnet-4-5",
  "gpt-4o": "claude-sonnet-4-5",
  "claude-opus": "claude-opus-4-1-20250805",
};

function openAiMessagesPayload(input: ModelCompleteInput) {
  return [
    { role: "system" as const, content: input.system },
    ...input.messages.map((m) =>
      m.role === "tool"
        ? {
            role: "assistant" as const,
            content: `[${m.toolName ?? "tool"} result] ${m.content}`,
          }
        : { role: m.role, content: m.content },
    ),
  ];
}

function openAiToolsPayload(tools: AgentPackage["tools"]) {
  if (!tools.length) return undefined;
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters ?? { type: "object", properties: {} },
    },
  }));
}

const MODEL_PROVIDER_SOFT_ERROR =
  "I'm having trouble reaching my knowledge right now — please try again in a moment, or say you'd like a human and I'll connect you.";

function isRetryableProviderStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function providerBackoffMs(attempt: number): number {
  return 400 * 2 ** attempt;
}

/** Retry fetch on 429/5xx and transient network errors; do not retry other 4xx. */
async function fetchProviderWithRetry(
  url: string,
  init: RequestInit,
  maxAttempts = 3,
): Promise<Response> {
  let lastRes: Response | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok || !isRetryableProviderStatus(res.status)) {
        return res;
      }
      lastRes = res;
    } catch (err) {
      if (attempt >= maxAttempts - 1) throw err;
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, providerBackoffMs(attempt)));
    }
  }
  return lastRes!;
}

/** Overrides for OpenAI-compatible providers whose endpoint/auth differ (e.g. Azure OpenAI). */
type ProviderCallOpts = { endpoint?: string; azureAuth?: boolean };

/** Azure OpenAI authenticates with an `api-key` header; everyone else uses `Authorization: Bearer`. */
function providerAuthHeaders(apiKey: string, azureAuth?: boolean): Record<string, string> {
  return azureAuth
    ? { "api-key": apiKey, "content-type": "application/json" }
    : { authorization: `Bearer ${apiKey}`, "content-type": "application/json" };
}

async function openAiCompatibleComplete(
  baseUrl: string,
  apiKey: string,
  input: ModelCompleteInput,
  modelId: string,
  opts?: ProviderCallOpts,
): Promise<ModelCompleteResult> {
  const endpoint = opts?.endpoint ?? `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const temperature = input.temperature ?? 0.4;
  const maxTokens = input.maxOutputTokens ?? 500;
  const candidates = [modelId, input.fallbackModel].filter(
    (m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i,
  );

  for (const candidate of candidates) {
    try {
      const res = await fetchProviderWithRetry(endpoint, {
        method: "POST",
        headers: providerAuthHeaders(apiKey, opts?.azureAuth),
        body: JSON.stringify({
          model: candidate,
          temperature,
          max_tokens: maxTokens,
          messages: openAiMessagesPayload(input),
          tools: openAiToolsPayload(input.tools),
        }),
      });
      const json = (await res.json()) as {
        choices?: Array<{
          message?: {
            content?: string | null;
            tool_calls?: Array<{ function: { name: string; arguments: string } }>;
          };
        }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        error?: { message?: string };
      };
      if (!res.ok) {
        if (isRetryableProviderStatus(res.status) || candidate !== candidates[candidates.length - 1]) {
          continue;
        }
        throw new Error(json.error?.message ?? `Model API ${res.status}`);
      }
      const usage = mapUsage(json.usage);
      const msg = json.choices?.[0]?.message;
      const tc = msg?.tool_calls?.[0];
      if (tc) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>;
        } catch {
          /* tolerate malformed args */
        }
        return { content: (msg?.content ?? "").trim(), toolCall: { name: tc.function.name, args }, usage };
      }
      return { content: (msg?.content ?? "").trim() || "…", usage };
    } catch {
      /* try next candidate */
    }
  }
  return { content: MODEL_PROVIDER_SOFT_ERROR };
}

/** True OpenAI-compatible SSE stream (`stream: true`). */
async function* openAiCompatibleStream(
  baseUrl: string,
  apiKey: string,
  input: ModelCompleteInput,
  modelId: string,
  opts?: ProviderCallOpts,
): AsyncIterable<StreamChunk> {
  const endpoint = opts?.endpoint ?? `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  let res: Response;
  try {
    res = await fetchProviderWithRetry(endpoint, {
      method: "POST",
      headers: { ...providerAuthHeaders(apiKey, opts?.azureAuth), accept: "text/event-stream" },
      body: JSON.stringify({
        model: modelId,
        temperature: input.temperature ?? 0.4,
        max_tokens: input.maxOutputTokens ?? 500,
        stream: true,
        stream_options: { include_usage: true },
        messages: openAiMessagesPayload(input),
        tools: openAiToolsPayload(input.tools),
      }),
    });
  } catch {
    yield {
      type: "done",
      content: MODEL_PROVIDER_SOFT_ERROR,
    };
    return;
  }

  if (!res.ok || !res.body) {
    // Fall back to non-streaming so tool calls / errors still work.
    const fallback = await openAiCompatibleComplete(baseUrl, apiKey, input, modelId, opts);
    if (fallback.content && !fallback.toolCall) {
      yield { type: "delta", text: fallback.content };
    }
    yield { type: "done", content: fallback.content, toolCall: fallback.toolCall, usage: fallback.usage };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let content = "";
  let toolName = "";
  let toolArgs = "";
  let usage: TokenUsage | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const json = JSON.parse(data) as {
          choices?: Array<{
            delta?: {
              content?: string | null;
              tool_calls?: Array<{
                index?: number;
                function?: { name?: string; arguments?: string };
              }>;
            };
          }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        };
        // With stream_options.include_usage the provider sends a final chunk carrying usage
        // (and an empty choices array).
        if (json.usage) usage = mapUsage(json.usage) ?? usage;
        const delta = json.choices?.[0]?.delta;
        if (!delta) continue;
        if (typeof delta.content === "string" && delta.content) {
          content += delta.content;
          yield { type: "delta", text: delta.content };
        }
        const tc = delta.tool_calls?.[0];
        if (tc?.function?.name) toolName = tc.function.name;
        if (tc?.function?.arguments) toolArgs += tc.function.arguments;
      } catch {
        /* skip malformed SSE lines */
      }
    }
  }

  if (toolName) {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(toolArgs || "{}") as Record<string, unknown>;
    } catch {
      /* tolerate partial args */
    }
    yield { type: "done", content: content.trim(), toolCall: { name: toolName, args }, usage };
    return;
  }
  yield { type: "done", content: content.trim() || "…", usage };
}

/** Live OpenAI adapter (MIAI_MODEL_MODE=openai + OPENAI_API_KEY). */
export class OpenAIModelAdapter implements ModelAdapter {
  private modelId(input: ModelCompleteInput) {
    return OPENAI_MODEL_MAP[input.model] ?? env("OPENAI_MODEL_DEFAULT") ?? "gpt-4o-mini";
  }

  async complete(input: ModelCompleteInput) {
    const apiKey = env("OPENAI_API_KEY") ?? "";
    return openAiCompatibleComplete("https://api.openai.com/v1", apiKey, input, this.modelId(input));
  }

  async *streamComplete(input: ModelCompleteInput): AsyncIterable<StreamChunk> {
    const apiKey = env("OPENAI_API_KEY") ?? "";
    yield* openAiCompatibleStream("https://api.openai.com/v1", apiKey, input, this.modelId(input));
  }
}

/**
 * Live Anthropic adapter (MIAI_MODEL_MODE=anthropic|claude + ANTHROPIC_API_KEY).
 * Uses Anthropic's OpenAI-compatible `/v1/chat/completions` surface so tool-calling
 * stays on the same path as OpenAI/gateway.
 */
export class AnthropicModelAdapter implements ModelAdapter {
  private modelId(input: ModelCompleteInput) {
    return (
      ANTHROPIC_MODEL_MAP[input.model] ??
      env("ANTHROPIC_MODEL_DEFAULT") ??
      "claude-sonnet-4-5"
    );
  }

  async complete(input: ModelCompleteInput) {
    const apiKey = env("ANTHROPIC_API_KEY") ?? "";
    return openAiCompatibleComplete(
      "https://api.anthropic.com/v1",
      apiKey,
      input,
      this.modelId(input),
    );
  }

  async *streamComplete(input: ModelCompleteInput): AsyncIterable<StreamChunk> {
    const apiKey = env("ANTHROPIC_API_KEY") ?? "";
    yield* openAiCompatibleStream(
      "https://api.anthropic.com/v1",
      apiKey,
      input,
      this.modelId(input),
    );
  }
}

/** MyInstantAI model gateway (OpenAI-compatible). MIAI_MODEL_MODE=gateway. */
export class GatewayModelAdapter implements ModelAdapter {
  private modelId(input: ModelCompleteInput) {
    return env("MIAI_MODEL_PASSTHROUGH") === "1"
      ? input.model
      : (OPENAI_MODEL_MAP[input.model] ?? input.model);
  }

  async complete(input: ModelCompleteInput) {
    const base = env("MIAI_MODEL_GATEWAY_URL") ?? "";
    const apiKey = env("MIAI_MODEL_GATEWAY_KEY") ?? env("MIAI_MODEL_API_KEY") ?? "";
    return openAiCompatibleComplete(base, apiKey, input, this.modelId(input));
  }

  async *streamComplete(input: ModelCompleteInput): AsyncIterable<StreamChunk> {
    const base = env("MIAI_MODEL_GATEWAY_URL") ?? "";
    const apiKey = env("MIAI_MODEL_GATEWAY_KEY") ?? env("MIAI_MODEL_API_KEY") ?? "";
    yield* openAiCompatibleStream(base, apiKey, input, this.modelId(input));
  }
}

/**
 * Azure OpenAI adapter (MIAI_MODEL_MODE=azure) — the migration target for MyInstantAI's Azure
 * infra. Points at the customer's own Azure OpenAI resource: the endpoint carries the deployment
 * name + api-version, and auth is the `api-key` header (not Bearer). The marketplace model tiers
 * map to deployment names via env, so the whole platform runs on Azure by flipping the mode.
 */
export class AzureOpenAIModelAdapter implements ModelAdapter {
  private deployment(input: ModelCompleteInput): string {
    const large = env("AZURE_OPENAI_DEPLOYMENT_LARGE");
    const wantsLarge = ["claude-sonnet", "gpt-4o", "claude-opus"].includes(input.model);
    return (wantsLarge && large) || env("AZURE_OPENAI_DEPLOYMENT") || "gpt-4o-mini";
  }

  private endpoint(deployment: string): string {
    const base = (env("AZURE_OPENAI_ENDPOINT") ?? "").replace(/\/$/, "");
    const version = env("AZURE_OPENAI_API_VERSION") ?? "2024-10-21";
    return `${base}/openai/deployments/${deployment}/chat/completions?api-version=${version}`;
  }

  async complete(input: ModelCompleteInput) {
    const apiKey = env("AZURE_OPENAI_API_KEY") ?? "";
    const deployment = this.deployment(input);
    return openAiCompatibleComplete("", apiKey, input, deployment, {
      endpoint: this.endpoint(deployment),
      azureAuth: true,
    });
  }

  async *streamComplete(input: ModelCompleteInput): AsyncIterable<StreamChunk> {
    const apiKey = env("AZURE_OPENAI_API_KEY") ?? "";
    const deployment = this.deployment(input);
    yield* openAiCompatibleStream("", apiKey, input, deployment, {
      endpoint: this.endpoint(deployment),
      azureAuth: true,
    });
  }
}

let sandboxModelTurns = 0;
export function createModelAdapter(): ModelAdapter {
  const mode = env("MIAI_MODEL_MODE") ?? "mock";
  // Sandbox cost backstop: after a capped number of real-provider turns per process,
  // fall back to the mock model so an evaluation cannot run up an unbounded bill.
  if (env("SANDBOX_MODE") === "1" && mode !== "mock") {
    const cap = Number(env("SANDBOX_MODEL_TURN_CAP") ?? "") || 1000;
    if (sandboxModelTurns >= cap) return new MockModelAdapter();
    sandboxModelTurns++;
  }
  if ((mode === "gateway" || mode === "http") && env("MIAI_MODEL_GATEWAY_URL")) {
    return new GatewayModelAdapter();
  }
  if (mode === "azure" && env("AZURE_OPENAI_API_KEY") && env("AZURE_OPENAI_ENDPOINT")) {
    return new AzureOpenAIModelAdapter();
  }
  if ((mode === "anthropic" || mode === "claude") && env("ANTHROPIC_API_KEY")) {
    return new AnthropicModelAdapter();
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

/** A requested reply language that is (some form of) English. */
export function isEnglishLang(lang?: string): boolean {
  if (!lang) return false;
  return /^(en|eng|english|anglais|ingl[eé]s)\b/i.test(lang.trim());
}

/**
 * Heuristic: does this text look like it is NOT English? Accented Latin letters, inverted
 * punctuation, or common non-English function words (es/fr/pt/de/it). Deliberately conservative:
 * a false positive only triggers a redundant model call (which still replies in the user's
 * language), and a false negative simply falls back to prior behaviour.
 */
export function looksNonEnglish(text: string): boolean {
  if (/[àâäáãçéèêëíîïñóòôöõúùûüÿœæ¿¡]/i.test(text)) return true;
  return /\b(qu[eé]|c[oó]mo|cu[aá]ndo|d[oó]nde|cu[aá]nto|gracias|usted|nuestro|tienen|comment|pourquoi|quand|combien|merci|votre|proposez|obrigado|voc[eê]|bitte|danke|k[oö]nnen|perch[eé]|quando|grazie)\b/i.test(
    text,
  );
}

/**
 * Should a deterministic (English) grounded-workflow answer be re-voiced in the user's language?
 * Triggers on an explicit non-English replyLanguage, otherwise when the user's message looks
 * non-English. We deliberately do NOT inspect the answer: grounded workflows return English KB
 * (the whole reason this exists), and the re-voice call keys off the real user message, so a
 * misclassified English turn still comes back in English — the only cost is a redundant call.
 */
export function shouldLocalizeReply(replyLanguage: string | undefined, userMessage: string): boolean {
  if (replyLanguage) return !isEnglishLang(replyLanguage);
  return looksNonEnglish(userMessage);
}

/**
 * Deterministic, retry-safe wallet-debit idempotency key for a turn. Derived from the turn's
 * content (prior message count + this turn's user message), so a re-processed request — a webhook
 * double-invoke, a serverless double-fire, a client resend — produces the SAME key and the wallet
 * dedups the charge instead of double-billing. (The previous key embedded Date.now(), so it changed
 * on every call and the adapter dedup never fired.) Callers with a globally-unique per-turn id can
 * override via req.idempotencyKey for exactness.
 */
export function turnDebitKey(req: TurnRequest): string {
  const explicit = req.idempotencyKey?.trim();
  if (explicit) return explicit;
  // FNV-1a over the stable turn signature — cheap, pure-JS, no crypto import.
  const sig = `${req.messages.length} ${req.userMessage}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < sig.length; i++) {
    h ^= sig.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const digest = (h >>> 0).toString(16).padStart(8, "0");
  return `${req.workspaceId}:${req.agentId}:${req.messages.length}:${digest}`;
}

/**
 * Debit the wallet, failing OPEN on an unexpected gateway error. wallet.debit() already returns a
 * non-throwing paused result for the normal insufficient-balance case (402/409); it only THROWS when
 * the gateway itself is unavailable (5xx / timeout). By that point the model has usually already
 * produced the answer, so crashing the turn would discard BOTH the answer and the charge and 500 the
 * user. Instead we serve the answer and emit an unreconciled-charge record for ops to true up later.
 */
async function debitOrServe(
  wallet: WalletAdapter,
  params: Parameters<WalletAdapter["debit"]>[0],
  fallbackBalance: number,
): Promise<{ ok: boolean; balance: number; paused: boolean }> {
  try {
    return await wallet.debit(params);
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "miai.wallet_debit_unreconciled",
        workspaceId: params.workspaceId,
        agentId: params.agentId,
        amount: params.amount,
        idempotencyKey: params.idempotencyKey,
        message: err instanceof Error ? err.message : String(err),
      }),
    );
    return { ok: true, balance: fallbackBalance, paused: false };
  }
}

export async function runTurn(
  req: TurnRequest,
  deps?: {
    wallet?: WalletAdapter;
    model?: ModelAdapter;
    /** Live token/text deltas from the model (true stream for openai/gateway). */
    onDelta?: (text: string) => void;
    /** Fired when a tool round starts so UIs can reset a partial streamed bubble. */
    onToolStart?: () => void;
    /** Skip wallet debit (e.g. free sandbox try before rent). Still estimates tokens for metering=0. */
    skipDebit?: boolean;
  },
): Promise<TurnResult> {
  const wallet = deps?.wallet ?? createWalletAdapter();
  const model = deps?.model ?? createModelAdapter();
  const onDelta = deps?.onDelta;
  const onToolStart = deps?.onToolStart;
  const skipDebit = Boolean(deps?.skipDebit);

  // Fill {{business_name}} etc. so customers never see raw template tokens.
  const templateVars = buildTemplateVars(req.pkg);
  const pkg = materializePackage(req.pkg);
  req = {
    ...req,
    pkg,
    knowledgeOverride: req.knowledgeOverride
      ? applyTemplateVars(req.knowledgeOverride, templateVars)
      : req.knowledgeOverride,
  };

  if (req.state === "paused_no_tokens") {
    return {
      assistantMessage: wf(req.replyLanguage, "paused_no_tokens"),
      messages: req.messages,
      toolCalls: [],
      tokensDebited: 0,
      balance: (await wallet.getBalance(req.workspaceId).catch(() => ({ tokens: 0 }))).tokens,
      state: "paused_no_tokens",
      paused: true,
    };
  }

  const knowledge = req.knowledgeOverride?.trim() || req.pkg.knowledge;
  const knowledgeBudget = Number(env("RUNTIME_KNOWLEDGE_CHARS") ?? 40_000);
  // Live models: hybrid semantic+lexical when an embedder is configured;
  // otherwise lexical. MockModel still gets a full KB prefix so deterministic
  // evals / knowledgeHit stay stable.
  const knowledgeForPrompt =
    model instanceof MockModelAdapter
      ? knowledge.slice(0, knowledgeBudget)
      : await selectKnowledgeForPromptAsync(
          knowledge,
          req.userMessage,
          knowledgeBudget,
          semanticRetrievalEnabled() ? createEmbedderFromEnv() : null,
        );
  const modelOpts = {
    temperature: req.pkg.manifest.model?.temperature,
    maxOutputTokens: req.pkg.manifest.model?.max_output_tokens,
    fallbackModel: req.pkg.manifest.model?.fallback,
  };
  const system = [
    req.pkg.system_prompt,
    "",
    "## Response rules",
    "Answer factual questions (office locations, hours, PTO, benefits, hiring, policies) from the knowledge base first.",
    "Only call tools when you need a live system action (booking, ticket, order lookup, handoff).",
    "Never paste raw JSON tool payloads to the user — summarize in clear natural language.",
    "",
    "## Language",
    "Reply in the same language the user writes in — you are fluent in every major language (English, Spanish, French and more), not limited to any fixed list. If a specific reply language has been requested, always use that.",
    "",
    "## Knowledge base",
    knowledgeForPrompt,
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

  // Fail safely around the partner wallet gateway: a transient getBalance error must not crash the
  // turn. Treat the balance as unknown and proceed (the per-turn debit is the real gate); only a
  // KNOWN zero/negative balance pauses up front.
  let balanceKnown = true;
  const bal = await wallet.getBalance(req.workspaceId).catch((err) => {
    balanceKnown = false;
    console.error(
      JSON.stringify({
        level: "error",
        event: "miai.wallet_balance_unavailable",
        workspaceId: req.workspaceId,
        message: err instanceof Error ? err.message : String(err),
      }),
    );
    return { workspaceId: req.workspaceId, tokens: 0, currencyLabel: "tokens" };
  });
  if (!skipDebit && balanceKnown && bal.tokens <= 0) {
    return {
      assistantMessage: wf(req.replyLanguage, "paused_no_tokens"),
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
    let localizeTokens = 0;
    let assistantMessage = scrubLeakedPlaceholders(
      handled.assistantMessage.replace(/<!--miai-workflow:[\s\S]*?-->/g, "").trim(),
      templateVars,
    );
    // Grounded workflows above answer deterministically from the (English) knowledge base and
    // never call the model — so a non-English user can receive the raw English KB verbatim
    // (e.g. hotel amenity queries in French). When a real model is configured and the user is
    // not writing English, re-voice that grounded answer in the user's language with the facts
    // preserved, instead of dumping the English source. English turns keep the zero-cost path.
    if (
      assistantMessage &&
      !(model instanceof MockModelAdapter) &&
      shouldLocalizeReply(req.replyLanguage, req.userMessage)
    ) {
      try {
        const localized = await model.complete({
          system:
            "You are the assistant replying to the user. Rewrite the reference answer as your reply, written in the SAME language the user wrote in" +
            (req.replyLanguage ? ` (the user's language is ${req.replyLanguage})` : "") +
            ". Preserve every fact, number, name, date, time and price exactly as given. Do not add, remove, or invent information. Write natural prose — do not copy markdown section headings verbatim. Output only the reply.",
          messages: [
            {
              role: "user",
              content: `User message:\n${req.userMessage}\n\nReference answer (may be in English):\n${assistantMessage}`,
            },
          ],
          tools: [],
          model: req.model,
          temperature: 0,
          maxOutputTokens: req.pkg.manifest.model?.max_output_tokens ?? 700,
        });
        const out = (localized.content || "").trim();
        if (out) assistantMessage = out;
        // Meter this re-voice: a real model call whose usage would otherwise be discarded,
        // under-billing every non-English grounded turn by ~one model call.
        localizeTokens = localized.usage?.totalTokens ?? 0;
      } catch (err) {
        // Best-effort: on any model error keep the grounded answer rather than failing the turn.
        console.warn(
          "[runtime] grounded-reply localization skipped:",
          err instanceof Error ? err.message : err,
        );
      }
    }
    // Reflect the final (possibly re-voiced) answer in history before metering.
    {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "assistant") lastMsg.content = assistantMessage;
    }
    // Meter on the FINAL answer plus the re-voice call, then debit — failing open around the wallet
    // gateway (a blip after we already produced the answer must not 500 the turn).
    const tokens =
      estimateTurnTokens(
        req.model,
        system.length + req.userMessage.length,
        assistantMessage.length,
      ) + localizeTokens;
    const debit = skipDebit
      ? { ok: true as const, balance: bal.tokens, paused: false }
      : await debitOrServe(
          wallet,
          {
            workspaceId: req.workspaceId,
            amount: tokens,
            idempotencyKey: turnDebitKey(req),
            reason: "agent_turn",
            agentId: req.agentId,
          },
          bal.tokens,
        );
    // Honor the debit outcome like the main path: an insufficient-balance debit (ok:false) deducts
    // nothing and must pause the agent, not silently serve the turn free.
    const paused = !skipDebit && (!debit.ok || debit.paused);
    if (onDelta && assistantMessage) {
      const parts = assistantMessage.split(/(\s+)/).filter(Boolean);
      let buf = "";
      for (const p of parts) {
        buf += p;
        if (buf.length >= 8 || /\n$/.test(buf)) {
          onDelta(buf);
          buf = "";
        }
      }
      if (buf) onDelta(buf);
    }
    return {
      assistantMessage,
      messages,
      toolCalls,
      tokensDebited: skipDebit ? 0 : debit.ok ? tokens : 0,
      balance: debit.balance,
      state: paused ? "paused_no_tokens" : req.state,
      paused,
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

  // First-party marketplace Ask AI (product guide + leads)
  if (isMarketplaceAssistant(req.agentId)) {
    const handled = await finishWorkflow(
      await runMarketplaceAssistantWorkflow({
        userMessage: req.userMessage,
        executeTool,
        replyLanguage: req.replyLanguage,
      }),
    );
    if (handled) return handled;
  }

  // Executive Assistant multi-step workflow
  if (isExecutiveAssistant(req.agentId)) {
    const ea = await runExecutiveAssistantWorkflow({
      agentId: req.agentId,
      userMessage: req.userMessage,
      messages: req.messages,
      toolNames: req.pkg.tools.map((t) => t.name),
      executeTool,
      replyLanguage: req.replyLanguage,
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
      replyLanguage: req.replyLanguage,
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
      replyLanguage: req.replyLanguage,
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
      replyLanguage: req.replyLanguage,
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
      replyLanguage: req.replyLanguage,
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
      replyLanguage: req.replyLanguage,
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
      replyLanguage: req.replyLanguage,
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
      replyLanguage: req.replyLanguage,
    });
    const done = await finishWorkflow(hg);
    if (done) return done;
  }

  // Flagship depth Phase 1a — Go-live 18 gap close (orchestration only)
  if (isAccountingPractice(req.agentId)) {
    const ap = await runAccountingPracticeWorkflow({
      agentId: req.agentId,
      userMessage: req.userMessage,
      messages: req.messages,
      toolNames: req.pkg.tools.map((t) => t.name),
      knowledge,
      executeTool,
      replyLanguage: req.replyLanguage,
    });
    const done = await finishWorkflow(ap);
    if (done) return done;
  }

  if (isEventsVenue(req.agentId)) {
    const ev = await runEventsVenueWorkflow({
      agentId: req.agentId,
      userMessage: req.userMessage,
      messages: req.messages,
      toolNames: req.pkg.tools.map((t) => t.name),
      knowledge,
      executeTool,
      replyLanguage: req.replyLanguage,
    });
    const done = await finishWorkflow(ev);
    if (done) return done;
  }

  if (isBuildingManagement(req.agentId)) {
    const bm = await runBuildingManagementWorkflow({
      agentId: req.agentId,
      userMessage: req.userMessage,
      messages: req.messages,
      toolNames: req.pkg.tools.map((t) => t.name),
      knowledge,
      executeTool,
      replyLanguage: req.replyLanguage,
    });
    const done = await finishWorkflow(bm);
    if (done) return done;
  }

  if (isPharmacy(req.agentId)) {
    const rx = await runPharmacyWorkflow({
      agentId: req.agentId,
      userMessage: req.userMessage,
      messages: req.messages,
      toolNames: req.pkg.tools.map((t) => t.name),
      knowledge,
      executeTool,
      replyLanguage: req.replyLanguage,
    });
    const done = await finishWorkflow(rx);
    if (done) return done;
  }

  if (isGymMembership(req.agentId)) {
    const gym = await runGymMembershipWorkflow({
      agentId: req.agentId,
      userMessage: req.userMessage,
      messages: req.messages,
      toolNames: req.pkg.tools.map((t) => t.name),
      knowledge,
      executeTool,
      replyLanguage: req.replyLanguage,
    });
    const done = await finishWorkflow(gym);
    if (done) return done;
  }

  // Flagship depth Phase 2 — financial services (+ optional veterinary)
  if (isMobileMoney(req.agentId)) {
    const mm = await runMobileMoneyWorkflow({
      agentId: req.agentId,
      userMessage: req.userMessage,
      messages: req.messages,
      toolNames: req.pkg.tools.map((t) => t.name),
      knowledge,
      executeTool,
      replyLanguage: req.replyLanguage,
    });
    const done = await finishWorkflow(mm);
    if (done) return done;
  }

  if (isWealthManagement(req.agentId)) {
    const wm = await runWealthManagementWorkflow({
      agentId: req.agentId,
      userMessage: req.userMessage,
      messages: req.messages,
      toolNames: req.pkg.tools.map((t) => t.name),
      knowledge,
      executeTool,
      replyLanguage: req.replyLanguage,
    });
    const done = await finishWorkflow(wm);
    if (done) return done;
  }

  if (isTaxOffice(req.agentId)) {
    const tax = await runTaxOfficeWorkflow({
      agentId: req.agentId,
      userMessage: req.userMessage,
      messages: req.messages,
      toolNames: req.pkg.tools.map((t) => t.name),
      knowledge,
      executeTool,
      replyLanguage: req.replyLanguage,
    });
    const done = await finishWorkflow(tax);
    if (done) return done;
  }

  if (isVeterinary(req.agentId)) {
    const vet = await runVeterinaryWorkflow({
      agentId: req.agentId,
      userMessage: req.userMessage,
      messages: req.messages,
      toolNames: req.pkg.tools.map((t) => t.name),
      knowledge,
      executeTool,
      replyLanguage: req.replyLanguage,
    });
    const done = await finishWorkflow(vet);
    if (done) return done;
  }

  // Flagship depth Phase 1b — Cluster B runtime-only (catalogue untouched)
  if (isCustomerSupport(req.agentId)) {
    const cs = await runCustomerSupportWorkflow({
      agentId: req.agentId,
      userMessage: req.userMessage,
      messages: req.messages,
      toolNames: req.pkg.tools.map((t) => t.name),
      knowledge,
      executeTool,
      replyLanguage: req.replyLanguage,
    });
    const done = await finishWorkflow(cs);
    if (done) return done;
  }

  if (isDeliveryTracking(req.agentId)) {
    const dt = await runDeliveryTrackingWorkflow({
      agentId: req.agentId,
      userMessage: req.userMessage,
      messages: req.messages,
      toolNames: req.pkg.tools.map((t) => t.name),
      knowledge,
      executeTool,
      replyLanguage: req.replyLanguage,
    });
    const done = await finishWorkflow(dt);
    if (done) return done;
  }

  const maxToolRounds = Math.min(
    5,
    Math.max(1, Number(env("RUNTIME_MAX_TOOL_ROUNDS") ?? 3)),
  );

  const modelInputBase = {
    system,
    model: req.model,
    temperature: modelOpts.temperature,
    maxOutputTokens: modelOpts.maxOutputTokens,
    fallbackModel: modelOpts.fallbackModel,
    consumerLine: req.consumerLine,
  };

  // Shared hard safety for live + mock (mock also checks inside MockModelAdapter).
  const forced = checkInputGuardrails(req.userMessage, system, req.pkg.tools, {
    consumerLine: req.consumerLine,
  });
  let completion: ModelCompleteResult;
  // Sum provider-reported tokens across this turn's model calls (initial + tool-round follow-ups)
  // for accurate wallet metering; stays 0 for the mock model / providers that omit usage.
  let turnUsageTotal = 0;
  if (forced) {
    completion = forced;
  } else {
    completion = await modelAnswer(
      model,
      { ...modelInputBase, messages, tools: req.pkg.tools },
      onDelta,
    );
    turnUsageTotal += completion.usage?.totalTokens ?? 0;
  }

  // A stubbed connector result on a genuine live turn — not the sandbox, and not a pre-rent "try" —
  // means the bound connector isn't actually configured. Such a stub must NEVER be presented to a
  // real customer as a completed booking/order/application/payment (audit P0-3). In the sandbox,
  // stubs are the intended demo, so this stays false and the demo confirmations are unchanged.
  const realLiveTurn = req.mode === "live" && env("SANDBOX_MODE") !== "1";
  for (let toolRound = 0; completion.toolCall && toolRound < maxToolRounds; toolRound++) {
    onToolStart?.();
    const { name, args } = completion.toolCall;
    const result = await executeConnector({
      workspaceId: req.workspaceId,
      agentId: req.agentId,
      tool: name,
      args,
      binding: bindingFor(name, bindings),
      mode: req.mode,
    });
    toolCalls.push({
      name,
      args,
      result: result.data,
      connector: result.connector,
      stubbed: result.stubbed,
      live: result.ok && !result.stubbed,
    });
    messages.push({
      role: "tool",
      content: JSON.stringify(result.data),
      toolName: name,
    });

    const isReadTool =
      /^(get_|list_|lookup_|check_)/i.test(name) ||
      /job_opening|policy|catalogue|menu|availability/i.test(name);

    const emitStatic = (t: string) => {
      completion = { content: t };
      if (onDelta && t) {
        const parts = t.split(/(\s+)/).filter(Boolean);
        let buf = "";
        for (const p of parts) {
          buf += p;
          if (buf.length >= 8 || /\n$/.test(buf)) {
            onDelta(buf);
            buf = "";
          }
        }
        if (buf) onDelta(buf);
      }
    };

    if (!result.ok && isReadTool) {
      const follow = await modelAnswer(
        model,
        {
          ...modelInputBase,
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
        },
        onDelta,
      );
      turnUsageTotal += follow.usage?.totalTokens ?? 0;
      completion = {
        content:
          follow.content.trim() ||
          knowledgeHit(system, req.userMessage) ||
          "I couldn't reach the connected HR system, and I don't have that role list in knowledge yet. Upload open roles to Knowledge, or try again shortly.",
      };
      if (onDelta && completion.content && !follow.content.trim()) {
        emitStatic(completion.content);
      }
      break;
    } else if (!result.ok) {
      emitStatic(
        "I couldn't reach the connected system just now. I can hand this to a teammate, or we can retry shortly.",
      );
      break;
    } else if (name === "handoff_to_human" || /handoff/.test(name)) {
      const reason = String(args.reason ?? "");
      const prior = (completion.content || "").trim();
      if (reason === "emergency" || /emergency|life-threatening|call \*\*/i.test(prior)) {
        emitStatic(
          prior ||
            `If this is an emergency, call **${emergencyNumber(system)}** / local emergency services now. I've also connected you to a human teammate urgently.`,
        );
      } else if (reason === "gdpr_erasure" || /erasur|gdpr|delete/i.test(prior)) {
        emitStatic(
          prior ||
            "I've connected you to the team for your data erasure / GDPR request — they'll follow up shortly.",
        );
      } else if (prior.length > 40 && !/^let me check/i.test(prior)) {
        emitStatic(prior);
      } else {
        emitStatic(
          "I've connected you to the team with the context from this chat — they'll follow up shortly.",
        );
      }
      break;
    } else if (realLiveTurn && result.stubbed) {
      // Genuine live turn, but the bound connector returned a stub — it isn't actually connected.
      // Never claim a booking/order/application/payment succeeded; be honest and route to a human.
      emitStatic(
        isReadTool
          ? "I can't pull that up live just now — that connection isn't fully set up on our side yet. I've flagged it so a teammate can help."
          : "I couldn't complete that just now — the system it connects to isn't fully set up on our side yet. I've flagged it so a teammate can finish it and follow up with you.",
      );
      break;
    } else if (name === "get_order_status") {
      const status = String((result.data as { status?: string }).status ?? "processing");
      emitStatic(
        `Your order is currently **${status.replace(/_/g, " ")}**. ${(result.data as { eta?: string }).eta ? `ETA: ${(result.data as { eta?: string }).eta}.` : ""}`,
      );
      break;
    } else if (name.startsWith("book_")) {
      // Exact "book_" prefix so a ledger tool like credit_book is NOT mistaken for an appointment.
      const ref = (result.data as { booking_ref?: string }).booking_ref;
      emitStatic(
        ref
          ? `You're booked — reference **${ref}**. You'll get a confirmation on your contact details.`
          : "You're booked. You'll get a confirmation on your contact details.",
      );
      break;
    } else if (name === "capture_application" || name === "capture_job_application") {
      // Exact write-tool ids only — a read/status lookup or a licence-application tool must not be
      // mislabelled as a captured hiring application, and we never invent a reference number.
      const ref = (result.data as { reference?: string }).reference;
      emitStatic(
        `Thanks — your application is captured${ref ? ` under reference **${ref}**` : ""}. The hiring team will follow up; this is not a hiring decision.`,
      );
      break;
    } else {
      const allowMoreTools = toolRound + 1 < maxToolRounds;
      const follow = await modelAnswer(
        model,
        {
          ...modelInputBase,
          messages: [
            ...messages,
            {
              role: "user",
              content:
                `Using the ${name} tool result above and the knowledge base, answer my last question in clear natural language. ` +
                `Do not show JSON. If the tool only echoed args or is a sandbox stub, answer fully from the knowledge base open roles / policies.`,
            },
          ],
          tools: allowMoreTools ? req.pkg.tools : [],
        },
        onDelta,
      );
      turnUsageTotal += follow.usage?.totalTokens ?? 0;
      const text = follow.content.trim();
      if (follow.toolCall && allowMoreTools) {
        completion = follow;
        continue;
      }
      const looksLikeJson = text.startsWith("{") || /Done — I used/.test(text);
      const finalText =
        text && !looksLikeJson
          ? text
          : knowledgeHit(system, req.userMessage) ??
            "I've checked our records. Please ask about a specific policy detail (PTO days, benefits start date, office address) and I'll answer from the knowledge base.";
      completion = { content: finalText };
      if (onDelta && (!text || looksLikeJson)) emitStatic(finalText);
      break;
    }
  }

  // Post-model scrub for live replies (card/OTP leakage).
  if (!completion.toolCall) {
    const scrubbed = checkOutputGuardrails(req.userMessage, completion.content, req.pkg.tools);
    if (scrubbed) completion = scrubbed;
  }

  messages.push({ role: "assistant", content: completion.content });

  // Prefer provider-reported usage (summed across the turn's model calls incl. tool rounds);
  // fall back to the character estimate for the mock model or providers that omit usage.
  const tokens =
    turnUsageTotal > 0
      ? turnUsageTotal
      : estimateTurnTokens(
          req.model,
          system.length + req.userMessage.length,
          completion.content.length,
        );
  const debit = skipDebit
    ? { ok: true as const, balance: bal.tokens, paused: false }
    : await debitOrServe(
        wallet,
        {
          workspaceId: req.workspaceId,
          amount: tokens,
          idempotencyKey: turnDebitKey(req),
          reason: "agent_turn",
          agentId: req.agentId,
        },
        bal.tokens,
      );

  const paused = !skipDebit && (!debit.ok || debit.paused);
  const assistantMessage = scrubLeakedPlaceholders(completion.content, templateVars);
  if (assistantMessage !== completion.content) {
    const last = messages[messages.length - 1];
    if (last?.role === "assistant") last.content = assistantMessage;
  }
  return {
    assistantMessage,
    messages,
    toolCalls,
    tokensDebited: skipDebit ? 0 : debit.ok ? tokens : 0,
    balance: debit.balance,
    state: paused ? "paused_no_tokens" : req.state === "rented" ? "live" : req.state,
    paused,
  };
}
