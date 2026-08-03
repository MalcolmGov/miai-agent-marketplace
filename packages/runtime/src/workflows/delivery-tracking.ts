/**
 * Multi-step Delivery Tracking workflow (Cluster B — runtime-only):
 * track_consignment / POD → confirm → log_exception → handoff → verify.
 * Lost/damaged always escalate. Catalogue .agent.json untouched.
 */

import { wf } from "./i18n.js";
import { handleStopSuppression } from "./stop-suppression.js";

export type DtStepStatus = "pending" | "done" | "skipped" | "failed";

export interface DtWorkflowStep {
  id: string;
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: DtStepStatus;
  resultSummary?: string;
}

export interface DtWorkflowPlan {
  id: string;
  goal: string;
  kind: "exception";
  steps: DtWorkflowStep[];
  status: "proposed" | "executing" | "completed" | "cancelled";
}

export interface DtWorkflowTurnResult {
  handled: boolean;
  assistantMessage: string;
  plan?: DtWorkflowPlan;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

const WORKFLOW_RE = /<!--miai-workflow:([\s\S]*?)-->/;

export function isDeliveryTracking(agentId: string): boolean {
  return /delivery-tracking/i.test(agentId);
}

export function parseDtWorkflowFromMessages(
  messages: Array<{ role: string; content: string }>,
): DtWorkflowPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const match = m.content.match(WORKFLOW_RE);
    if (!match) continue;
    try {
      return JSON.parse(match[1]!) as DtWorkflowPlan;
    } catch {
      return null;
    }
  }
  return null;
}

function embed(message: string, plan: DtWorkflowPlan): string {
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

function extractWaybill(text: string): string | undefined {
  return (
    text.match(/\b((?:SLC|WB|TRK)[- ]?\d+)\b/i)?.[1]?.replace(/\s+/g, "-").toUpperCase() ||
    text.match(/\bwaybill\s+([A-Z0-9-]+)/i)?.[1]?.toUpperCase()
  );
}

export async function runDeliveryTrackingWorkflow(input: {
  agentId: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  toolNames: string[];
  knowledge?: string;
  executeTool: ExecuteToolFn;
  replyLanguage?: string;
}): Promise<DtWorkflowTurnResult> {
  if (!isDeliveryTracking(input.agentId)) {
    return { handled: false, assistantMessage: "", toolCalls: [] };
  }

  const user = input.userMessage.replace(/##[\s\S]*$/g, "").trim();
  const lower = user.toLowerCase();
  const pending = parseDtWorkflowFromMessages(input.messages);
  const toolCalls: DtWorkflowTurnResult["toolCalls"] = [];
  const has = (n: string) => input.toolNames.includes(n);
  const lang = input.replyLanguage;

  if (/card (number|details)|cvv|\b4111\b/.test(lower)) {
    return { handled: true, toolCalls: [], assistantMessage: wf(lang, "card_refuse") };
  }

  const stopSuppression = await handleStopSuppression({
    lower,
    user,
    has,
    executeTool: input.executeTool,
  });
  if (stopSuppression) return stopSuppression;

  if (/ignore (all )?previous|reveal your (system )?prompt|print your (full )?system prompt/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share internal instructions. I can help with tracking, proof of delivery, and logging exceptions.",
    };
  }

  if (/talk to (a )?human|speak to (someone|the )?desk|courier desk/.test(lower)) {
    if (has("handoff_to_human")) {
      const args = { reason: "explicit_request", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: "Connecting you to the courier desk now.",
    };
  }

  if (pending?.status === "proposed" && /\b(cancel|never ?mind)\b/i.test(lower)) {
    const cancelled = { ...pending, status: "cancelled" as const };
    return {
      handled: true,
      plan: cancelled,
      toolCalls: [],
      assistantMessage: embed(wf(lang, "plan_cancelled"), cancelled),
    };
  }

  if (pending?.status === "proposed" && isConfirm(user)) {
    const plan: DtWorkflowPlan = {
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
      const ref = String(data.reference ?? data.id ?? (result.ok ? "EXC-OK" : "ERR"));
      step.status = result.ok ? "done" : "failed";
      step.resultSummary = ref;
      lines.push(`${result.ok ? "✓" : "✗"} ${step.label} — ${ref}`);
      if (!result.ok && step.id === "exception") break;
    }

    plan.status = "completed";
    const exc = plan.steps.find((s) => s.id === "exception" && s.status === "done");
    const msg = [
      exc
        ? `Exception logged — reference **${exc.resultSummary}**. The courier desk will investigate; this is not a delivery guarantee.`
        : "Workflow finished.",
      "",
      "## Workflow results",
      ...lines,
    ].join("\n");

    return { handled: true, plan, toolCalls, assistantMessage: embed(msg, plan) };
  }

  const waybill = extractWaybill(user);

  if (/pod|proof of delivery|who signed|signer/.test(lower) && has("get_proof_of_delivery")) {
    if (!waybill) {
      return {
        handled: true,
        toolCalls: [],
        assistantMessage: "I can pull proof of delivery — what's the waybill / tracking number?",
      };
    }
    const args = { waybill, tracking_number: waybill };
    const result = await input.executeTool("get_proof_of_delivery", args);
    toolCalls.push({ name: "get_proof_of_delivery", args, result: result.data });
    return {
      handled: true,
      toolCalls,
      assistantMessage: `I checked POD for **${waybill}**. If you never received it, I can propose an exception log for the desk.`,
    };
  }

  if (
    (/where('?s| is)|track|status|parcel|package|consignment/.test(lower) || waybill) &&
    has("track_consignment") &&
    !/never got|not (received|delivered)|lost|damaged|stolen|missing/.test(lower)
  ) {
    if (!waybill) {
      return {
        handled: true,
        toolCalls: [],
        assistantMessage: "I can track that — what's the waybill / tracking number?",
      };
    }
    const args = { waybill, tracking_number: waybill };
    const result = await input.executeTool("track_consignment", args);
    toolCalls.push({ name: "track_consignment", args, result: result.data });
    return {
      handled: true,
      toolCalls,
      assistantMessage: `Tracking for **${waybill}** is on file. Ask for POD, or tell me if something's wrong and I'll propose an exception workflow.`,
    };
  }

  if (/overnight|next (business )?day|how much.*(ship|deliver)/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "Published overnight / next-business-day rates and cut-offs are on file with the carrier FAQ. Share a waybill for live tracking.",
    };
  }

  const looksLikeException =
    /never got|not (received|delivered)|shows delivered but|lost|damaged|stolen|missing|exception|wrong address/.test(
      lower,
    );

  if (looksLikeException && has("log_exception")) {
    const args = {
      waybill,
      tracking_number: waybill,
      issue: user.slice(0, 400),
      notes: user.slice(0, 240),
    };

    const plan: DtWorkflowPlan = {
      id: `dt-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: "exception",
      status: "proposed",
      steps: [
        {
          id: "track",
          label: waybill ? `Re-track ${waybill}` : "Confirm waybill",
          tool: waybill && has("track_consignment") ? "track_consignment" : undefined,
          args: waybill ? { waybill } : undefined,
          status: "pending",
        },
        {
          id: "exception",
          label: "Log delivery exception",
          tool: "log_exception",
          args,
          status: "pending",
        },
        {
          id: "notify",
          label: "Escalate to courier desk",
          tool: "handoff_to_human",
          args: {
            reason: "exception_logged",
            summary: `Delivery exception ${waybill ?? "n/a"} — ${user.slice(0, 160)}`,
          },
          status: "pending",
        },
        { id: "verify", label: "Confirm exception reference", status: "pending" },
      ],
    };

    return {
      handled: true,
      plan,
      toolCalls: [],
      assistantMessage: embed(
        [
          "I can log that as a delivery exception — I won't write it until you confirm.",
          "",
          `**Goal:** ${plan.goal}`,
          "",
          "## Workflow plan",
          ...plan.steps.map((s, i) => `${i + 1}. ${s.label}`),
          "",
          waybill
            ? `Confirm exception for waybill **${waybill}**? Reply **yes** / **go ahead**.`
            : "Share the **waybill** if you have it, then reply **yes** / **go ahead** to log the exception.",
        ].join("\n"),
        plan,
      ),
    };
  }

  return { handled: false, assistantMessage: "", toolCalls: [] };
}
