/**
 * Multi-step Pharmacy workflow (non-clinical):
 * stock / script status → confirm → log_refill_request → notify → verify.
 * Dosage, clinical advice, emergencies → handoff (+ emergency number).
 */

import { wf } from "./i18n.js";
import { handleStopSuppression } from "./stop-suppression.js";

export type RxStepStatus = "pending" | "done" | "skipped" | "failed";

export interface RxWorkflowStep {
  id: string;
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: RxStepStatus;
  resultSummary?: string;
}

export interface RxWorkflowPlan {
  id: string;
  goal: string;
  kind: "refill";
  steps: RxWorkflowStep[];
  status: "proposed" | "executing" | "completed" | "cancelled";
}

export interface RxWorkflowTurnResult {
  handled: boolean;
  assistantMessage: string;
  plan?: RxWorkflowPlan;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

const WORKFLOW_RE = /<!--miai-workflow:([\s\S]*?)-->/;

export function isPharmacy(agentId: string): boolean {
  return /(?:^|-)pharmacy(?:$|-)/i.test(agentId) || /pharmacy/i.test(agentId);
}

export function parseRxWorkflowFromMessages(
  messages: Array<{ role: string; content: string }>,
): RxWorkflowPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const match = m.content.match(WORKFLOW_RE);
    if (!match) continue;
    try {
      return JSON.parse(match[1]!) as RxWorkflowPlan;
    } catch {
      return null;
    }
  }
  return null;
}

function embed(message: string, plan: RxWorkflowPlan): string {
  return `${message.replace(WORKFLOW_RE, "").trimEnd()}\n\n<!--miai-workflow:${JSON.stringify(plan)}-->`;
}

function isConfirm(text: string): boolean {
  const lower = text.toLowerCase().replace(/##[\s\S]*$/g, " ").trim();
  return (
    /^(yes|yep|yeah|correct|confirmed|ok|okay)\b/.test(lower) ||
    /yes[,.]? (please|go ahead|do it|confirm|log)/.test(lower) ||
    /go ahead|please log|looks good|log it/.test(lower)
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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalize(s: string): string {
  return s.length ? s[0]!.toUpperCase() + s.slice(1) : s;
}

/** Sandbox/demo tool stubs don't carry prices — fall back to the matching knowledge line. */
function knowledgeStockLine(knowledge: string | undefined, product: string): string | undefined {
  const stockSection = section(knowledge, /## Stock[\s\S]*?(?=\n## )/i);
  if (!stockSection) return undefined;
  const keyword = product
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .sort((a, b) => b.length - a.length)[0];
  if (!keyword) return undefined;
  const hit = stockSection
    .split("\n")
    .filter((l) => l.trim().startsWith("-"))
    .find((l) => new RegExp(escapeRegExp(keyword), "i").test(l));
  return hit?.replace(/^-\s*/, "").trim();
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

function extractRx(text: string): string | undefined {
  return text.match(/\b(RX[- ]?\d+)\b/i)?.[1]?.replace(/\s+/g, "-").toUpperCase();
}

export async function runPharmacyWorkflow(input: {
  agentId: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  toolNames: string[];
  knowledge?: string;
  executeTool: ExecuteToolFn;
  replyLanguage?: string;
}): Promise<RxWorkflowTurnResult> {
  if (!isPharmacy(input.agentId)) {
    return { handled: false, assistantMessage: "", toolCalls: [] };
  }

  const user = input.userMessage.replace(/##[\s\S]*$/g, "").trim();
  const lower = user.toLowerCase();
  const pending = parseRxWorkflowFromMessages(input.messages);
  const toolCalls: RxWorkflowTurnResult["toolCalls"] = [];
  const has = (n: string) => input.toolNames.includes(n);
  const emerg = emergencyNumber(input.agentId, input.knowledge);
  const lang = input.replyLanguage;

  if (
    /trouble breathing|can't breathe|overdose|anaphyla|severe allergic|chest pain|life-?threatening|poison/.test(
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
        `If this is a medical emergency, call **${emerg}** / emergency services now.`,
        "I'm alerting the pharmacy team — I won't give clinical advice in chat.",
      ].join("\n\n"),
    };
  }

  if (
    /which (should|one) (i|do) (take|use)|dosage|how many (mg|tablets)|is it safe (to|for)|drug interaction|what does this tablet|wrong[- ]looking/.test(
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
        "I can't give dosage or clinical advice — please speak to the pharmacist. I'm connecting you to the pharmacy team now.",
    };
  }

  if (/card (number|details)|cvv|\b4111\b/.test(lower)) {
    return { handled: true, toolCalls: [], assistantMessage: wf(lang, "card_refuse") };
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

  if (/ignore (all )?previous|reveal your (system )?prompt|print your (full )?system prompt/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share internal instructions. I can help with OTC stock, script status, store info, and logging refill requests.",
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
    const plan: RxWorkflowPlan = {
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
      const ref = String(data.reference ?? data.id ?? (result.ok ? "REFILL-OK" : "ERR"));
      step.status = result.ok ? "done" : "failed";
      step.resultSummary = ref;
      lines.push(`${result.ok ? "✓" : "✗"} ${step.label} — ${ref}`);
      if (!result.ok && step.id === "refill") break;
    }

    plan.status = "completed";
    const refill = plan.steps.find((s) => s.id === "refill" && s.status === "done");
    const msg = [
      refill
        ? `Refill request logged — reference **${refill.resultSummary}**. Pending pharmacist review — this is **not** an approval to dispense.`
        : "Workflow finished.",
      "",
      "## Workflow results",
      ...lines,
    ].join("\n");

    return { handled: true, plan, toolCalls, assistantMessage: embed(msg, plan) };
  }

  if (/do you have|in stock|stock of|got any/.test(lower) && has("check_stock")) {
    const product =
      user.match(/(?:have|stock(?: of)?|got any)\s+(.+?)(?:\?|$)/i)?.[1]?.trim() || user.slice(0, 80);
    const args = { item: product };
    const result = await input.executeTool("check_stock", args);
    toolCalls.push({ name: "check_stock", args, result: result.data });
    const data = (result.data ?? {}) as {
      available?: boolean;
      level?: string;
      price?: string;
      note?: string;
    };
    let assistantMessage: string;
    if (result.ok && typeof data.available === "boolean") {
      const stateWord = data.level === "low_stock" ? "low in stock" : data.available ? "in stock" : "out of stock";
      const priceNote = data.price ? ` — **${data.price}**` : "";
      const extra = data.note ? ` ${data.note}` : "";
      assistantMessage = `${capitalize(product)} is **${stateWord}**${priceNote}.${extra}`.trim();
      if (!data.available) {
        assistantMessage +=
          " If this is a prescription item, share the RX number and your name/phone and I can log a refill request.";
      }
    } else {
      const knowledgeLine = knowledgeStockLine(input.knowledge, product);
      assistantMessage =
        knowledgeLine ??
        "I checked OTC stock for that item but couldn't confirm a result — if you need a prescription refill logged, share the RX number and your name/phone.";
    }
    return { handled: true, toolCalls, assistantMessage };
  }

  if (/ready|script status|prescription status|is rx/i.test(lower) && has("get_script_status")) {
    const rx = extractRx(user) || "RX";
    const args = { script_ref: rx };
    const result = await input.executeTool("get_script_status", args);
    toolCalls.push({ name: "get_script_status", args, result: result.data });
    const data = (result.data ?? {}) as { status?: string; ready_since?: string; bring?: string };
    const statusText: Record<string, string> = {
      being_prepared: "still being prepared",
      ready_for_collection: "ready for collection",
      collected: "already collected",
      not_found: "not found — please double-check the reference",
    };
    let assistantMessage: string;
    if (result.ok && data.status) {
      const readable = statusText[data.status] ?? data.status;
      const sinceNote = data.ready_since ? ` (ready since ${data.ready_since})` : "";
      const bringNote = data.bring ? ` Please bring ${data.bring}.` : "";
      assistantMessage = `Script **${rx}** is **${readable}**${sinceNote}.${bringNote}`.trim();
    } else {
      assistantMessage = `I couldn't confirm the status for script **${rx}** right now. I can log a refill request for the pharmacist if you confirm.`;
    }
    return { handled: true, toolCalls, assistantMessage };
  }

  if (/hours|open|close|insurer|insurance|medical aid/.test(lower) && has("store_info")) {
    const args = { topic: /insur|medical aid/i.test(lower) ? "insurance" : "hours" };
    const result = await input.executeTool("store_info", args);
    toolCalls.push({ name: "store_info", args, result: result.data });
    const blob =
      section(input.knowledge, /## (Hours|Insurance|Store)[\s\S]*?(?=\n## )/i) ||
      "Store hours and accepted insurers are on file.";
    return { handled: true, toolCalls, assistantMessage: blob };
  }

  const looksLikeRefill = /log a refill|refill (for|request)|renew (my )?(script|rx|prescription)/.test(
    lower,
  );

  if (looksLikeRefill && has("log_refill_request")) {
    const name = extractName(user);
    const phone = extractPhone(user);
    const rx = extractRx(user);
    const args = {
      script_id: rx,
      rx,
      name,
      phone,
      contact: phone,
      notes: user.slice(0, 240),
    };

    const plan: RxWorkflowPlan = {
      id: `rx-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: "refill",
      status: "proposed",
      steps: [
        {
          id: "status",
          label: rx ? `Check status for ${rx}` : "Confirm script id",
          tool: has("get_script_status") ? "get_script_status" : undefined,
          args: { script_id: rx, rx },
          status: "pending",
        },
        {
          id: "refill",
          label: `Log refill request for ${name ?? "you"}`,
          tool: "log_refill_request",
          args,
          status: "pending",
        },
        {
          id: "notify",
          label: "Notify pharmacist queue",
          tool: "handoff_to_human",
          args: {
            reason: "refill_logged",
            summary: `Refill ${rx ?? ""} — ${name ?? ""} ${phone ?? ""}`,
          },
          status: "pending",
        },
        {
          id: "verify",
          label: "Confirm logged (not approved) reference",
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
          "I can log a refill request for the pharmacist — I won't submit it until you confirm. This is never an approval to dispense.",
          "",
          `**Goal:** ${plan.goal}`,
          "",
          "## Workflow plan",
          ...plan.steps.map((s, i) => `${i + 1}. ${s.label}`),
          "",
          `Is that right — log refill${rx ? ` for **${rx}**` : ""} for **${name ?? "you"}**${phone ? ` (${phone})` : ""}? Reply **yes** / **go ahead** to confirm.`,
        ].join("\n"),
        plan,
      ),
    };
  }

  return { handled: false, assistantMessage: "", toolCalls: [] };
}
