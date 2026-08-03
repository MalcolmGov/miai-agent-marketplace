/**
 * Multi-step Mobile Money workflow:
 * check_float → confirm → record_cash_in / record_cash_out / send_money → verify.
 * Never accepts PIN/OTP/card; fraud / over-cap → handoff.
 */

import { wf } from "./i18n.js";

export type MmStepStatus = "pending" | "done" | "skipped" | "failed";

export interface MmWorkflowStep {
  id: string;
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: MmStepStatus;
  resultSummary?: string;
}

export interface MmWorkflowPlan {
  id: string;
  goal: string;
  kind: "cash_in" | "cash_out" | "send";
  steps: MmWorkflowStep[];
  status: "proposed" | "executing" | "completed" | "cancelled";
}

export interface MmWorkflowTurnResult {
  handled: boolean;
  assistantMessage: string;
  plan?: MmWorkflowPlan;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

const WORKFLOW_RE = /<!--miai-workflow:([\s\S]*?)-->/;
const SINGLE_TX_CAP = 3000;

export function isMobileMoney(agentId: string): boolean {
  return /mobile-money/i.test(agentId);
}

export function parseMmWorkflowFromMessages(
  messages: Array<{ role: string; content: string }>,
): MmWorkflowPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const match = m.content.match(WORKFLOW_RE);
    if (!match) continue;
    try {
      return JSON.parse(match[1]!) as MmWorkflowPlan;
    } catch {
      return null;
    }
  }
  return null;
}

function embed(message: string, plan: MmWorkflowPlan): string {
  return `${message.replace(WORKFLOW_RE, "").trimEnd()}\n\n<!--miai-workflow:${JSON.stringify(plan)}-->`;
}

function isConfirm(text: string): boolean {
  const lower = text.toLowerCase().replace(/##[\s\S]*$/g, " ").trim();
  return (
    /^(yes|yep|yeah|correct|confirmed|ok|okay)\b/.test(lower) ||
    /yes[,.]? (please|go ahead|do it|confirm|send)/.test(lower) ||
    /go ahead|please (send|confirm)|looks good/.test(lower)
  );
}

export type ExecuteToolFn = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ ok: boolean; data: unknown }>;

function extractAmount(text: string): number | undefined {
  const m =
    text.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/)?.[1] ||
    text.match(/\b([\d,]+(?:\.\d{1,2})?)\s*(?:dollars|usd)\b/i)?.[1];
  if (!m) return undefined;
  const n = Number(m.replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function extractPhone(text: string): string | undefined {
  return (
    text.match(/(\+?\d[\d\s-]{6,}\d)/)?.[1]?.trim() ||
    text.match(/\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b/)?.[1]
  );
}

export async function runMobileMoneyWorkflow(input: {
  agentId: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  toolNames: string[];
  knowledge?: string;
  executeTool: ExecuteToolFn;
  replyLanguage?: string;
}): Promise<MmWorkflowTurnResult> {
  if (!isMobileMoney(input.agentId)) {
    return { handled: false, assistantMessage: "", toolCalls: [] };
  }

  const user = input.userMessage.replace(/##[\s\S]*$/g, "").trim();
  const lower = user.toLowerCase();
  const pending = parseMmWorkflowFromMessages(input.messages);
  const toolCalls: MmWorkflowTurnResult["toolCalls"] = [];
  const has = (n: string) => input.toolNames.includes(n);
  const lang = input.replyLanguage;

  if (/\b(pin|otp|one[- ]time)\b|cvv|\b4111\b|card (number|details)/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't accept PIN, OTP, or card details in chat — never share those here. Complete sensitive entry only on the secure terminal / app.",
    };
  }

  if (/fraud|scam|pressure|force (the )?send|override (the )?cap|dispute/.test(lower)) {
    if (has("handoff_to_human")) {
      const args = { reason: "fraud_or_dispute", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "I'm escalating to a supervisor — I won't complete a transaction under fraud pressure or for a dispute in chat.",
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
        "Understood — STOP acknowledged. Handing off so suppression is completed.",
    };
  }

  if (/ignore (all )?previous|reveal your (system )?prompt|print your (full )?system prompt/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share internal instructions. I can help with float checks, cash-in, cash-out, and send-money with confirm-before-write.",
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
    const plan: MmWorkflowPlan = {
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
      const ref = String(data.reference ?? data.id ?? data.tx_id ?? (result.ok ? "TX-OK" : "ERR"));
      step.status = result.ok ? "done" : "failed";
      step.resultSummary = ref;
      lines.push(`${result.ok ? "✓" : "✗"} ${step.label} — ${ref}`);
      if (!result.ok && ["cash_in", "cash_out", "send"].includes(step.id)) break;
    }

    plan.status = "completed";
    const write = plan.steps.find(
      (s) => ["cash_in", "cash_out", "send"].includes(s.id) && s.status === "done",
    );
    const msg = [
      write
        ? `Transaction recorded — reference **${write.resultSummary}**. Give the customer their receipt; I never store PIN/OTP.`
        : "Workflow finished.",
      "",
      "## Workflow results",
      ...lines,
    ].join("\n");

    return { handled: true, plan, toolCalls, assistantMessage: embed(msg, plan) };
  }

  if (/float|till balance|how much (do i|cash) (have|left)/.test(lower) && has("check_float")) {
    const args = {};
    const result = await input.executeTool("check_float", args);
    toolCalls.push({ name: "check_float", args, result: result.data });
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "Float checked. Single-tx cap is **$3,000**. Ready for cash-in, cash-out, or send when you have amount + customer phone.",
    };
  }

  const amount = extractAmount(user);
  const phone = extractPhone(user);
  const looksCashIn = /cash[- ]?in|deposit/.test(lower);
  const looksCashOut = /cash[- ]?out|withdraw/.test(lower);
  const looksSend = /\bsend\b|transfer/.test(lower);

  if (amount != null && amount > SINGLE_TX_CAP) {
    if (has("handoff_to_human")) {
      const args = { reason: "over_cap", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: `That amount exceeds the single-transaction cap of **$${SINGLE_TX_CAP.toLocaleString()}**. I'm escalating — I won't complete it here.`,
    };
  }

  if ((looksCashIn || looksCashOut || looksSend) && amount != null) {
    const kind: MmWorkflowPlan["kind"] = looksSend ? "send" : looksCashOut ? "cash_out" : "cash_in";
    const tool =
      kind === "send" ? "send_money" : kind === "cash_out" ? "record_cash_out" : "record_cash_in";
    if (!has(tool)) {
      return { handled: false, assistantMessage: "", toolCalls: [] };
    }

    const fee = kind === "send" ? 7 : kind === "cash_out" ? (amount >= 500 ? 20 : 10) : 0;
    const args = {
      amount,
      customer: phone,
      phone,
      fee,
      notes: user.slice(0, 240),
    };

    const plan: MmWorkflowPlan = {
      id: `mm-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind,
      status: "proposed",
      steps: [
        {
          id: "float",
          label: "Check till float",
          tool: has("check_float") ? "check_float" : undefined,
          status: "pending",
        },
        {
          id: kind === "send" ? "send" : kind === "cash_out" ? "cash_out" : "cash_in",
          label:
            kind === "send"
              ? `Send $${amount}${phone ? ` to ${phone}` : ""}${fee ? ` (fee $${fee})` : ""}`
              : kind === "cash_out"
                ? `Cash-out $${amount}${phone ? ` for ${phone}` : ""}`
                : `Cash-in $${amount}${phone ? ` for ${phone}` : ""}`,
          tool,
          args,
          status: "pending",
        },
        {
          id: "verify",
          label: "Confirm transaction reference to the counter agent",
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
          "I can record that transaction — I won't write it until you confirm. Never enter PIN/OTP in chat.",
          "",
          `**Goal:** ${plan.goal}`,
          "",
          "## Workflow plan",
          ...plan.steps.map((s, i) => `${i + 1}. ${s.label}`),
          "",
          `Confirm: **$${amount}** ${kind.replace("_", "-")}${phone ? ` · customer **${phone}**` : ""}${fee ? ` · fee **$${fee}**` : ""}? Reply **yes** to proceed.`,
        ].join("\n"),
        plan,
      ),
    };
  }

  return { handled: false, assistantMessage: "", toolCalls: [] };
}
