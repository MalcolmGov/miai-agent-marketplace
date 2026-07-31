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

/** Deterministic mock model — good for local demo without API keys. */
export class MockModelAdapter implements ModelAdapter {
  async complete(input: {
    system: string;
    messages: ChatMessage[];
    tools: AgentPackage["tools"];
    model: string;
  }) {
    const last = [...input.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const lower = last.toLowerCase();

    if (/ignore (all )?previous|system prompt|jailbreak/.test(lower)) {
      return {
        content:
          "I can't share internal instructions. I can help with your account, booking, or order questions — what do you need?",
      };
    }
    if (/speak to (a )?(human|person|agent)|real person|handoff|escalate/.test(lower)) {
      return {
        content: "I'll connect you to a teammate now.",
        toolCall: {
          name: "handoff_to_human",
          args: { reason: "explicit_request", summary: last.slice(0, 400) },
        },
      };
    }
    const order = last.match(/\b(\d{3,}|ORD-?\d+)\b/i);
    if (/where('| i)?s my order|track|order status/.test(lower) && order) {
      return {
        content: "Looking up that order now.",
        toolCall: { name: "get_order_status", args: { order_id: order[1] } },
      };
    }
    if (/book|appointment|reserve|schedule/.test(lower)) {
      const tool = input.tools.find((t) => t.name.includes("book"))?.name ?? "book_appointment";
      return {
        content: "I can help with that booking — checking availability.",
        toolCall: {
          name: tool,
          args: { service: "consultation", date: "Thursday", name: "Guest", contact: "guest@example.com" },
        },
      };
    }
    if (/how much|price|cost|hours|open|wifi|check-in|menu|service/.test(lower)) {
      return {
        content:
          "Based on the business knowledge on file: I can help with pricing, hours, and next steps. Share a bit more detail (or an order/booking reference) and I’ll take action.",
      };
    }
    return {
      content:
        "Happy to help. Ask about orders, bookings, services, or say if you’d like a human — I’ll use the right tools.",
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
  const system = [
    req.pkg.system_prompt,
    "",
    "## Knowledge base",
    knowledge.slice(0, 12000),
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

    if (!result.ok) {
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
    } else {
      completion = {
        content: `Done — I used **${name}** and have the result. ${JSON.stringify(result.data).slice(0, 220)}`,
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
