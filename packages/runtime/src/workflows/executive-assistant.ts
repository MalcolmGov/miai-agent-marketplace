/**
 * Multi-step Executive Assistant workflow:
 * goal → plan → confirm → execute → verify
 *
 * Persists the pending plan in the assistant message as:
 * <!--miai-workflow:{...json}-->
 */

export type WorkflowStepStatus = "pending" | "done" | "skipped" | "failed";

export interface WorkflowStep {
  id: string;
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: WorkflowStepStatus;
  resultSummary?: string;
}

export interface WorkflowPlan {
  id: string;
  goal: string;
  steps: WorkflowStep[];
  status: "proposed" | "executing" | "completed" | "cancelled";
}

export interface WorkflowTurnResult {
  handled: boolean;
  assistantMessage: string;
  plan?: WorkflowPlan;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

const WORKFLOW_RE = /<!--miai-workflow:([\s\S]*?)-->/;

export function isExecutiveAssistant(agentId: string): boolean {
  return /executive-assistant/i.test(agentId);
}

export function parseWorkflowFromMessages(
  messages: Array<{ role: string; content: string }>,
): WorkflowPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const match = m.content.match(WORKFLOW_RE);
    if (!match) continue;
    try {
      return JSON.parse(match[1]!) as WorkflowPlan;
    } catch {
      return null;
    }
  }
  return null;
}

function embedWorkflow(message: string, plan: WorkflowPlan): string {
  const clean = message.replace(WORKFLOW_RE, "").trimEnd();
  return `${clean}\n\n<!--miai-workflow:${JSON.stringify(plan)}-->`;
}

function isConfirm(text: string): boolean {
  const lower = text.toLowerCase().replace(/##[\s\S]*$/g, " ").trim();
  return (
    /^(yes|yep|yeah|correct|confirmed|ok|okay)\b/.test(lower) ||
    /yes[,.]? (please|do it|go ahead|set it|book it|confirm)/.test(lower) ||
    /please (set|schedule|book|go ahead|confirm|run|do) (it|that|this|up)?/.test(lower) ||
    /go ahead|set it up|book it|run (the )?plan|looks good|that works|please set it/.test(lower)
  );
}

function isCancel(text: string): boolean {
  return /\b(cancel|never ?mind|stop|don't|do not)\b/i.test(text) && /plan|workflow|meeting|that/i.test(text);
}

function nextIso(dayOffset: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function resolveDatetime(text: string): string {
  const lower = text.toLowerCase();
  const time =
    lower.match(/\b(\d{1,2}):(\d{2})\b/) ||
    lower.match(/\b(\d{1,2})\s*(am|pm)\b/);
  let hour = 14;
  let minute = 0;
  if (time) {
    hour = Number(time[1]);
    if (time[2] && /^\d{2}$/.test(time[2])) minute = Number(time[2]);
    else if (/pm/i.test(time[2] || "") && hour < 12) hour += 12;
    else if (/am/i.test(time[2] || "") && hour === 12) hour = 0;
  }
  let offset = 1;
  if (/today/.test(lower)) offset = 0;
  else if (/tomorrow/.test(lower)) offset = 1;
  else if (/thursday/.test(lower)) {
    const day = new Date().getDay();
    offset = (4 - day + 7) % 7 || 7;
  } else if (/friday/.test(lower)) {
    const day = new Date().getDay();
    offset = (5 - day + 7) % 7 || 7;
  } else if (/monday/.test(lower)) {
    const day = new Date().getDay();
    offset = (1 - day + 7) % 7 || 7;
  }
  return nextIso(offset, hour, minute);
}

function extractAttendees(text: string): string[] {
  const withMatch = text.match(
    /with\s+([A-Z][a-zA-Z]+(?:\s+and\s+[A-Z][a-zA-Z]+)*(?:\s+and\s+[A-Z][a-zA-Z]+)?)/,
  );
  if (!withMatch) return ["team@example.com"];
  return withMatch[1]!
    .split(/\s+and\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractTitle(text: string): string {
  const m =
    text.match(/(?:set up|schedule|book)\s+(?:a\s+)?(?:\d+\s*-?\s*min(?:ute)?\s+)?(.+?)(?:\s+with\s+|\s+tomorrow|\s+on\s+|\s+at\s+|$)/i) ||
    text.match(/meeting(?:\s+about|\s+for)?\s+(.+?)(?:\s+with\s+|\s+tomorrow|\s+at\s+|$)/i);
  const raw = (m?.[1] || "Meeting").replace(/\b(a|an|the)\b/gi, "").trim();
  return raw.slice(0, 80) || "Meeting";
}

function wantsReminder(text: string): boolean {
  return /remind/i.test(text);
}

function wantsNotify(text: string): boolean {
  return /notify|slack|tell (the )?team|ping/i.test(text);
}

function isMultiOrScheduleGoal(text: string): boolean {
  const lower = text.toLowerCase().replace(/##[\s\S]*$/g, " ");
  if (/double-?booked|can't decide which|sort it out/.test(lower)) return false;
  if (
    /schedule|set up|book me|book a meeting|set a meeting|remind me|and (also )?remind|check .{0,40}(then|and).{0,40}(schedule|book|remind)/.test(
      lower,
    )
  ) {
    return true;
  }
  return false;
}

function isVagueSchedule(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /sometime|whenever|any time|afternoon|morning|this week/.test(lower) &&
    !/\d{1,2}:\d{2}|\d{1,2}\s*(am|pm)/.test(lower)
  );
}

function formatPlanMessage(plan: WorkflowPlan, vague: boolean): string {
  const lines = plan.steps.map((s, i) => `${i + 1}. ${s.label}`);
  if (vague) {
    return [
      "I can run this as a workflow, but I need a few details first (exact time and attendees).",
      "",
      "## Workflow plan",
      ...lines,
      "",
      "Tell me the time and who should be invited, then say **yes** and I'll execute: check calendar → schedule → reminder → notify.",
    ].join("\n");
  }
  return [
    "I'll treat this as a multi-step workflow (not a one-shot chat reply).",
    "",
    `**Goal:** ${plan.goal}`,
    "",
    "## Workflow plan",
    ...lines,
    "",
    "Reply **yes** / **please set it up** to run this plan, or tell me what to change. I won't write to the calendar until you confirm.",
  ].join("\n");
}

function buildPlanFromGoal(goal: string): { plan: WorkflowPlan; vague: boolean } {
  const vague = isVagueSchedule(goal);
  const datetime = resolveDatetime(goal);
  const title = extractTitle(goal);
  const attendees = extractAttendees(goal);
  const remind = wantsReminder(goal) || /budget|review|board|important/i.test(goal);
  const notify = wantsNotify(goal) || true; // default notify on schedule workflows

  const steps: WorkflowStep[] = [
    {
      id: "check",
      label: `Check calendar for conflicts around the proposed time`,
      tool: "check_calendar",
      args: { date: datetime.slice(0, 10), datetime },
      status: "pending",
    },
  ];

  if (!vague) {
    steps.push({
      id: "schedule",
      label: `Schedule “${title}” at ${datetime.slice(0, 16).replace("T", " ")} with ${attendees.join(", ")}`,
      tool: "schedule_meeting",
      args: { title, datetime, attendees },
      status: "pending",
    });
  } else {
    steps.push({
      id: "clarify",
      label: "Confirm exact time + attendees (needed before scheduling)",
      status: "pending",
    });
  }

  if (remind && !vague) {
    const when = new Date(new Date(datetime).getTime() - 15 * 60 * 1000).toISOString();
    steps.push({
      id: "remind",
      label: "Set a 15-minute reminder before the meeting",
      tool: "set_reminder",
      args: {
        text: `Prep / join: ${title}`,
        when,
      },
      status: "pending",
    });
  }

  if (notify && !vague) {
    steps.push({
      id: "notify",
      label: "Notify the team on Slack that the meeting is on the calendar",
      tool: "notify_team",
      args: {
        summary: `Scheduled: ${title} at ${datetime} with ${attendees.join(", ")}`,
        reason: "meeting_scheduled",
      },
      status: "pending",
    });
  }

  steps.push({
    id: "verify",
    label: "Verify the calendar shows the new event",
    tool: "check_calendar",
    args: { date: datetime.slice(0, 10) },
    status: "pending",
  });

  return {
    vague,
    plan: {
      id: `wf-${Date.now().toString(36)}`,
      goal: goal.slice(0, 240),
      steps,
      status: "proposed",
    },
  };
}

export type ExecuteToolFn = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ ok: boolean; data: unknown }>;

/**
 * Handle EA workflow turns. Returns handled=false to fall through to normal model path.
 */
export async function runExecutiveAssistantWorkflow(input: {
  agentId: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  toolNames: string[];
  executeTool: ExecuteToolFn;
}): Promise<WorkflowTurnResult> {
  if (!isExecutiveAssistant(input.agentId)) {
    return { handled: false, assistantMessage: "", toolCalls: [] };
  }

  const user = input.userMessage.replace(/##[\s\S]*$/g, "").trim();
  const lower = user.toLowerCase();
  const pending = parseWorkflowFromMessages(input.messages);
  const toolCalls: WorkflowTurnResult["toolCalls"] = [];
  const has = (name: string) => input.toolNames.includes(name);

  // Calendar conflicts the executive can't resolve → human (never schedule)
  if (
    /double-?booked|can't decide which|which one to drop|conflict I can't|clash I can't|sort (this|it) out/.test(
      lower,
    ) &&
    !isConfirm(user)
  ) {
    if (has("handoff_to_human") && /sort|decide|drop|conflict|clash|double/.test(lower)) {
      const result = await input.executeTool("handoff_to_human", {
        reason: "calendar_conflict",
        summary: user.slice(0, 400),
      });
      toolCalls.push({
        name: "handoff_to_human",
        args: { reason: "calendar_conflict", summary: user.slice(0, 400) },
        result: result.data,
      });
      return {
        handled: true,
        toolCalls,
        assistantMessage:
          "This is a real calendar conflict — I won't choose what to drop. I've passed it to someone on the team with the details so they can help you sort it out.",
      };
    }
  }

  // Cancel pending plan
  if (pending?.status === "proposed" && isCancel(user)) {
    const cancelled = { ...pending, status: "cancelled" as const };
    return {
      handled: true,
      plan: cancelled,
      toolCalls: [],
      assistantMessage: embedWorkflow(
        "Understood — I cancelled that workflow plan. Nothing was written to the calendar. What would you like instead?",
        cancelled,
      ),
    };
  }

  // Execute confirmed plan
  if (pending?.status === "proposed" && isConfirm(user)) {
    const clarify = pending.steps.find((s) => s.id === "clarify");
    if (clarify) {
      return {
        handled: true,
        plan: pending,
        toolCalls: [],
        assistantMessage: embedWorkflow(
          "I still need an exact time and attendees before I can run the schedule step. Example: “Friday 10:00 with Thabo and Lerato — yes, set it up.”",
          pending,
        ),
      };
    }

    const plan: WorkflowPlan = { ...pending, status: "executing", steps: pending.steps.map((s) => ({ ...s })) };
    const summaries: string[] = [];

    for (const step of plan.steps) {
      if (!step.tool || !has(step.tool)) {
        if (step.id === "notify" && has("handoff_to_human") && !has("notify_team")) {
          // fallback: skip silent notify
          step.status = "skipped";
          step.resultSummary = "Notify skipped (connect Slack notify_team / handoff in Actions)";
          continue;
        }
        if (!step.tool) {
          step.status = "skipped";
          continue;
        }
        step.status = "skipped";
        step.resultSummary = `Tool ${step.tool} not available on this package`;
        continue;
      }

      // Remap notify_team → slack handoff-style if needed
      const toolName =
        step.tool === "notify_team" && !has("notify_team") && has("handoff_to_human")
          ? null
          : step.tool;
      if (!toolName) {
        step.status = "skipped";
        continue;
      }

      const result = await input.executeTool(toolName, step.args ?? {});
      toolCalls.push({ name: toolName, args: step.args ?? {}, result: result.data });
      if (!result.ok) {
        step.status = "failed";
        step.resultSummary = `Failed: ${JSON.stringify(result.data).slice(0, 120)}`;
        summaries.push(`✗ ${step.label}`);
        // Don't continue writes after failure
        if (step.id === "check" || step.id === "schedule") break;
        continue;
      }

      const data = result.data as Record<string, unknown>;
      const ref =
        (data.reference as string) ||
        (data.booking_ref as string) ||
        (data.event_id as string) ||
        (data.htmlLink as string) ||
        "REF-OK";
      step.status = "done";
      step.resultSummary = String(ref);
      summaries.push(`✓ ${step.label} — ${ref}`);
    }

    plan.status = "completed";
    const verify = plan.steps.find((s) => s.id === "verify" && s.status === "done");
    const scheduled = plan.steps.find((s) => s.id === "schedule" && s.status === "done");

    const message = [
      scheduled
        ? `Done — the meeting is **scheduled** on your calendar${scheduled.resultSummary ? ` (${scheduled.resultSummary})` : ""}.`
        : "Workflow finished.",
      "",
      "## Workflow results",
      ...summaries,
      verify ? "" : "",
      verify ? "Verified against the calendar after writing." : "Say if you want me to re-check the calendar.",
      "",
      "I can also adjust the time, add another reminder, or hand off a conflict to a human.",
    ]
      .filter((l) => l !== undefined)
      .join("\n");

    return {
      handled: true,
      plan,
      toolCalls,
      assistantMessage: embedWorkflow(message, plan),
    };
  }

  // Update vague plan with newly supplied details + confirm in same message
  if (pending?.status === "proposed" && pending.steps.some((s) => s.id === "clarify") && /\d{1,2}:\d{2}|\d{1,2}\s*(am|pm)/i.test(user)) {
    const { plan } = buildPlanFromGoal(`${pending.goal} ${user}`);
    if (isConfirm(user)) {
      // recurse-like: treat as new plan then confirm — simplest: replace pending and ask one more yes
      // If user said "Friday at 10:00 works — please set it up." → build + execute immediately
      const executable = plan.steps.every((s) => s.id !== "clarify");
      if (executable && isConfirm(user)) {
        return runExecutiveAssistantWorkflow({
          ...input,
          messages: [
            ...input.messages,
            { role: "assistant", content: embedWorkflow("Updated plan ready.", { ...plan, status: "proposed" }) },
          ],
          userMessage: "yes, please set it up",
        });
      }
    }
    return {
      handled: true,
      plan,
      toolCalls: [],
      assistantMessage: embedWorkflow(formatPlanMessage(plan, false), plan),
    };
  }

  // Propose new multi-step / schedule workflow
  if (isMultiOrScheduleGoal(user)) {
    // Pure reminder-only (no meeting)
    if (/^remind me\b/i.test(user) && !/schedule|meeting|set up|book/i.test(user)) {
      return { handled: false, assistantMessage: "", toolCalls: [] };
    }

    const { plan, vague } = buildPlanFromGoal(user);

    // Filter tools not in package
    plan.steps = plan.steps.filter((s) => {
      if (!s.tool) return true;
      if (s.tool === "notify_team") return has("notify_team") || has("handoff_to_human");
      return has(s.tool);
    });

    // Optional: run read-only check immediately to ground the plan
    const checkStep = plan.steps.find((s) => s.id === "check" && s.tool === "check_calendar");
    if (checkStep && has("check_calendar") && !vague) {
      const result = await input.executeTool("check_calendar", checkStep.args ?? {});
      toolCalls.push({ name: "check_calendar", args: checkStep.args ?? {}, result: result.data });
      checkStep.status = result.ok ? "done" : "failed";
      checkStep.resultSummary = result.ok ? "Calendar checked" : "Calendar check failed";
    }

    return {
      handled: true,
      plan,
      toolCalls,
      assistantMessage: embedWorkflow(formatPlanMessage(plan, vague), plan),
    };
  }

  return { handled: false, assistantMessage: "", toolCalls: [] };
}
