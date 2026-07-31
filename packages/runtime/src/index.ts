import type { AgentPackage } from "@miai/agent-protocol";
import { executeConnector, type ToolBinding } from "@miai/connectors";
import { defaultBindingsForTools, getPreset } from "@miai/presets";
import {
  createWalletAdapter,
  estimateTurnTokens,
  type WalletAdapter,
} from "@miai/wallet-adapter";

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
}

export interface ModelAdapter {
  complete(input: {
    system: string;
    messages: ChatMessage[];
    tools: AgentPackage["tools"];
    model: string;
  }): Promise<{ content: string; toolCall?: { name: string; args: Record<string, unknown> } }>;
}

/** Pull a relevant excerpt from the system knowledge block for mock answers. */
function knowledgeHit(system: string, query: string): string | null {
  const kbIdx = system.indexOf("## Knowledge base");
  const kb = kbIdx >= 0 ? system.slice(kbIdx, kbIdx + 80_000) : system.slice(0, 80_000);
  const terms = query
    .toLowerCase()
    .replace(/##[\s\S]*$/g, " ") // drop trailing compliance appendices in eval inputs
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
  const chunks = kb.split(/\n(?=#+ )/);
  let best = "";
  let bestScore = 0;
  const q = query.toLowerCase();
  for (const chunk of chunks) {
    const lower = chunk.toLowerCase();
    let score = 0;
    for (const t of terms) if (lower.includes(t)) score += t.length > 4 ? 2 : 1;
    // Boost role/job/leave sections for common eval themes
    if (/job|hiring|role|opening|leave|pto|holiday|benefit|wifi|check-?in|price|order|service|treatment/.test(lower)) {
      for (const t of ["job", "leave", "role", "wifi", "order", "price", "benefit", "service", "treatment"]) {
        if (terms.includes(t) && lower.includes(t)) score += 3;
      }
    }
    if (/how much|price|cost|fee|levy|usd|eur|\$/.test(q) && /usd\s*\d|€\s*\d|\$\s*\d|\br\s*\d|price|fee/.test(lower)) {
      score += 12;
    }
    if (/service|treatment|offer|catalogue|menu/.test(q) && /service|treatment|price|catalogue|menu/.test(lower)) {
      score += 8;
    }
    if (/hours|open|closed/.test(q) && /hours|monday|open|closed/.test(lower)) score += 8;
    if (score > bestScore) {
      bestScore = score;
      best = chunk.trim();
    }
  }
  if (bestScore < 2 || best.length < 30) return null;
  return best.slice(0, 1400);
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
  for (const t of tools) {
    const name = t.name.toLowerCase();
    let score = 0;
    for (const part of name.split("_")) {
      if (part.length < 3) continue;
      if (lower.includes(part)) score += 3;
    }
    if (
      /list_services|get_services|list_catalogue|catalogue|menu/.test(name) &&
      /service|treatment|offer|menu|catalogue|price list|what do you|how much/.test(lower)
    )
      score += 10;
    if (
      /check_availability|availability|check_calendar/.test(name) &&
      /availab|free slot|when can|open slot|next (week|thursday|monday)|have any/.test(lower)
    )
      score += 12;
    if (/book|appointment|reserve|schedule/.test(name) && /book|appointment|reserve|schedule|callback/.test(lower)) {
      score += /yes|confirm|go ahead|please book/.test(lower) ? 14 : 2;
    }
    if (
      /treatment_info|get_treatment/.test(name) &&
      /treatment|root canal|filling|extraction|what (is|does)/.test(lower)
    )
      score += 10;
    if (/job_opening|open_role|list_jobs/.test(name) && /job|hiring|vacanc|role|position/.test(lower))
      score += 8;
    if (
      /levy|statement|payslip|deadline|amenity|recommendation|consignment|package|compliance|incident|onboarding|process_info|product_info|requirement|policy|outage|stock|invoice|cover|estimate/.test(
        name,
      )
    ) {
      const key = name
        .replace(/^(get_|check_|list_|log_|track_|update_)/, "")
        .split("_");
      if (key.some((p) => p.length > 3 && lower.includes(p))) score += 9;
    }
    if (/handoff/.test(name) && /human|person|someone|agent|emergency|urgent|escalat/.test(lower))
      score += 5;
    if (score > 0) ranked.push({ name: t.name, score });
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked[0]?.score >= 5 ? ranked[0].name : undefined;
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

    // After a tool ran, answer from knowledge + tool payload instead of echoing JSON.
    if (toolNote) {
      const kb = hit();
      const toolName = toolNote.toolName ?? "tool";
      if (/job_opening|list_jobs|open_role/i.test(toolName)) {
        if (kb && /driver|warehouse|bookkeeper|role|hiring|opening|REQ-/i.test(kb)) {
          return {
            content: `Here are the roles we're hiring for (from knowledge):\n\n${kb}\n\nScreening is indicative only — the hiring team decides.`,
          };
        }
      }
      if (/list_services|get_services|catalogue|menu|list_catalogue/i.test(toolName)) {
        const priced =
          knowledgeHit(input.system, `price cost fee USD EUR services treatments ${last}`) || kb;
        const kbBlock = input.system.includes("## Knowledge base")
          ? input.system.slice(input.system.indexOf("## Knowledge base"))
          : input.system;
        const priceLines = kbBlock
          .split("\n")
          .filter((l) => /USD\s*\d|€\s*\d|\$\s*\d|\bR\s*\d|from\s+\d/i.test(l))
          .slice(0, 12)
          .join("\n");
        return {
          content:
            `${priced || "Here are the services on file."}\n\n${priceLines ? `Prices on file:\n${priceLines}\n\n` : ""}I can check availability or book once you pick a service — shall I continue?`,
        };
      }
      if (/availability|check_calendar/i.test(toolName)) {
        return {
          content:
            "I have availability — for example Thursday 10:00 is open. Shall I book that for you, or would you like another time?",
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
      if (kb) return { content: `${kb}\n\n(Looked up via ${toolName}.)` };
      try {
        const data = JSON.parse(toolNote.content) as Record<string, unknown>;
        if (data.items) {
          return { content: `Here's what I found: ${JSON.stringify(data.items)}. ${kb || ""}`.trim() };
        }
      } catch {
        /* ignore */
      }
      return {
        content:
          "I've looked that up in our records. Ask a more specific question if you need another detail, or say if you'd like a human.",
      };
    }

    if (/ignore (all )?previous|system prompt|jailbreak|reveal your (prompt|rules)/.test(lower)) {
      return {
        content:
          "I can't share internal instructions. I can help with your account, booking, or order questions — what do you need?",
      };
    }

    // Card / OTP / secrets
    if (/card (number|details)|cvv|4111|debit card|credit card|charge my card/.test(lower)) {
      return {
        content:
          "I can't take card details in chat — please use the secure payment link or pay at the practice. Never share full card numbers or CVV here.",
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
    if (
      /colleague'|another (customer|patient|employee|client|person)|my (wife|husband|partner|friend|son|daughter)'s|someone else'?s/.test(
        lower,
      )
    ) {
      return {
        content:
          "I can't share or access another person's confidential information — only your own account. If they need help, they should contact us directly.",
      };
    }
    if (/life-?threatening|emergency|chest pain|can't breathe|suicide/.test(lower)) {
      const num = emergencyNumber(input.system);
      return {
        content: `If this is life-threatening, call **${num}** now. I'm also handing you to a human teammate.`,
        toolCall: {
          name: findTool(tools, "handoff") ?? "handoff_to_human",
          args: { reason: "emergency", summary: last.slice(0, 400) },
        },
      };
    }

    // Sensitive / explicit human → handoff
    if (
      /speak to (a )?(human|person|someone|agent)|real person|handoff|escalate|harassment|discrimination|ada |accommodation|grievance|bully|depression|medical|booked off|sick.?note|disciplinary|termination letter|connect me|clinical|symptom|diagnosis|pain|swelling|bleeding|knock|fever|vomiting|seizure|broken|fracture/.test(
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

    if (/got the job|have the job|means i'?ve got|guaranteed an interview|qualify for the role, right/.test(lower)) {
      const kb = hit();
      return {
        content:
          (kb ? kb + "\n\n" : "") +
          "Screening against listed requirements is indicative only — it is not a hiring decision. The hiring team decides interviews and offers; I can't guarantee a job or interview.",
      };
    }

    // Confirm → write tools
    if (/yes.*(correct|submit|confirm|book|go ahead)|please submit|everything is correct|confirm.*(book|application)/.test(lower)) {
      const capture = findTool(tools, "capture");
      const book =
        findTool(tools, "book") ?? findTool(tools, "appointment") ?? findTool(tools, "reserve");
      if (capture && /application|apply/.test(lower + (input.messages.map((m) => m.content).join(" ").toLowerCase()))) {
        return {
          content: "Submitting your application now.",
          toolCall: { name: capture, args: { confirmed: true } },
        };
      }
      if (book) {
        return {
          content: "Confirming that booking now.",
          toolCall: {
            name: book,
            args: { confirmed: true, date: "Thursday", name: "Guest", contact: "guest@example.com" },
          },
        };
      }
    }

    // Availability-only questions (don't book yet)
    if (/availab|free slot|when are you free|any openings/.test(lower) && !/please book|go ahead and book/.test(lower)) {
      const avail = findTool(tools, "availability") ?? findTool(tools, "calendar");
      if (avail) {
        return {
          content: "Of course — no problem. Checking availability now; let me know which slot you prefer and I'll book it.",
          toolCall: { name: avail, args: { date: "Thursday" } },
        };
      }
    }
    // Explicit wait / don't book yet
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

    const order = last.match(/\b(\d{3,}|ORD-?\d+)\b/i);
    if (/where('| i)?s my order|track|order status/.test(lower) && order) {
      const tool = findTool(tools, "order") ?? "get_order_status";
      return {
        content: "Looking up that order now.",
        toolCall: { name: tool, args: { order_id: order[1] } },
      };
    }

    if (/how much|price|cost|hours|open|wifi|check-in|menu|service|treatment|levy|balance|bill/.test(lower)) {
      const kb = hit();
      if (kb) return { content: kb };
    }

    const kb = hit();
    if (kb) return { content: kb };

    if (intentTool) {
      return {
        content: "Connecting you to a teammate.",
        toolCall: { name: intentTool, args: { summary: last.slice(0, 400) } },
      };
    }

    return {
      content:
        "Happy to help. Ask about services, prices, hours, bookings, policies, or say if you’d like a human.",
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
      completion = {
        content:
          "I've connected you to the team with the context from this chat — they'll follow up shortly.",
      };
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
