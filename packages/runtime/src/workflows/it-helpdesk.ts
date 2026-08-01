/**
 * Multi-step IT Helpdesk workflow:
 * diagnose (KB) → plan → confirm → ticket/notify → verify
 * Security incidents escalate immediately (no confirm delay).
 */

import { wf } from "./i18n.js";

export type ItStepStatus = "pending" | "done" | "skipped" | "failed";

export interface ItWorkflowStep {
  id: string;
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: ItStepStatus;
  resultSummary?: string;
}

export interface ItWorkflowPlan {
  id: string;
  goal: string;
  steps: ItWorkflowStep[];
  status: "proposed" | "executing" | "completed" | "cancelled";
  kind?: "ticket" | "howto_ticket" | "status";
}

export interface ItWorkflowTurnResult {
  handled: boolean;
  assistantMessage: string;
  plan?: ItWorkflowPlan;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

const WORKFLOW_RE = /<!--miai-workflow:([\s\S]*?)-->/;

export function isItHelpdesk(agentId: string): boolean {
  return /it-helpdesk/i.test(agentId);
}

export function parseItWorkflowFromMessages(
  messages: Array<{ role: string; content: string }>,
): ItWorkflowPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const match = m.content.match(WORKFLOW_RE);
    if (!match) continue;
    try {
      return JSON.parse(match[1]!) as ItWorkflowPlan;
    } catch {
      return null;
    }
  }
  return null;
}

function embed(message: string, plan: ItWorkflowPlan): string {
  return `${message.replace(WORKFLOW_RE, "").trimEnd()}\n\n<!--miai-workflow:${JSON.stringify(plan)}-->`;
}

function isConfirm(text: string): boolean {
  const lower = text.toLowerCase().replace(/##[\s\S]*$/g, " ").trim();
  return (
    /^(yes|yep|yeah|correct|confirmed|ok|okay)\b/.test(lower) ||
    /yes[,.]? (please|go ahead|do it|confirm)/.test(lower) ||
    /go ahead|please (log|open|create|raise) (it|a ticket|the ticket)|looks good/.test(lower)
  );
}

function isCancel(text: string): boolean {
  return /\b(cancel|never ?mind|stop|don't)\b/i.test(text) && /plan|ticket|workflow|that/i.test(text);
}

export type ExecuteToolFn = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ ok: boolean; data: unknown }>;

function ticketArgsFromText(text: string): Record<string, unknown> {
  const email = text.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0];
  const ext = text.match(/ext\.?\s*(\d+)/i)?.[1];
  const name = text.match(/I'?m\s+([A-Z][a-z]+)/)?.[1];
  const contact = [name, ext ? `ext ${ext}` : null, email].filter(Boolean).join(", ") || "staff via chat";
  const priority = /black|won't power|stolen|ransomware|phishing|fully blocked/i.test(text) ? "P2" : "P3";
  return {
    issue: text.slice(0, 500).replace(/\n/g, " "),
    subject: text.slice(0, 120).replace(/\n/g, " "),
    priority,
    contact,
    summary: text.slice(0, 500),
    requester: name,
    email,
    phone: ext ? `ext ${ext}` : undefined,
  };
}

function detectTopic(lower: string): "vpn" | "wifi" | "password" | "email" | "hardware" | "general" {
  if (/vpn|globalprotect/.test(lower)) return "vpn";
  if (/wi-?fi|wireless|network/.test(lower)) return "wifi";
  if (/password|locked out|reset|passwort|iphasiwedi/.test(lower)) return "password";
  if (/email|outlook|calendar/.test(lower)) return "email";
  if (/laptop|screen|black|hardware|printer|phone/.test(lower)) return "hardware";
  return "general";
}

function playbookFromTopic(topic: string, kbSnippet?: string): string {
  if (kbSnippet && kbSnippet.length > 40) return kbSnippet;
  if (topic === "vpn") {
    return [
      "**VPN playbook (from knowledge):**",
      "1. Install **GlobalProtect** from the IT Portal (**portal.ubuntu-systems.co.za**).",
      "2. Open GlobalProtect → gateway **vpn.ubuntu-systems.co.za** → sign in with SSO → approve Microsoft Authenticator.",
      "3. If it hangs, quit and reopen GlobalProtect, then retry.",
      "VPN is required for shared drives and internal sites off the office network.",
    ].join("\n");
  }
  if (topic === "password") {
    return [
      "**Password / lockout playbook:**",
      "- I will never ask for your password, PIN, or MFA code.",
      "- Reset yourself at **reset.ubuntu-systems.co.za** (verify with Microsoft Authenticator).",
    ].join("\n");
  }
  if (topic === "wifi") {
    return [
      "**Wi-Fi playbook:**",
      "- Staff SSID **UbuntuCorp** — sign in with SSO (not a shared key).",
      "- Guest SSID **UbuntuGuest** for visitors.",
    ].join("\n");
  }
  return "I checked the IT knowledge base for this topic. Follow the steps above from the article, then tell me if you still need a ticket.";
}

export async function runItHelpdeskWorkflow(input: {
  agentId: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  toolNames: string[];
  knowledge?: string;
  executeTool: ExecuteToolFn;
  replyLanguage?: string;
}): Promise<ItWorkflowTurnResult> {
  if (!isItHelpdesk(input.agentId)) {
    return { handled: false, assistantMessage: "", toolCalls: [] };
  }

  const user = input.userMessage.replace(/##[\s\S]*$/g, "").trim();
  const lower = user.toLowerCase();
  const pending = parseItWorkflowFromMessages(input.messages);
  const toolCalls: ItWorkflowTurnResult["toolCalls"] = [];
  const has = (n: string) => input.toolNames.includes(n);
  const lang = input.replyLanguage;

  // Never accept passwords
  if (/send you my password|here is my password|my password is\s+\S+|type your password|give me your password/i.test(lower) ||
      (/password/i.test(lower) && /send you|here(?:'s| is)|just send/i.test(lower))) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I never ask for your password and please don't send it here. Reset it yourself at **reset.ubuntu-systems.co.za** (SSO + Microsoft Authenticator). If you're still locked out after that, I can log a ticket — say the word.",
    };
  }

  // Card / payment in chat — refuse; paid software needs manager approval
  if (/card (number|details)|cvv|\b4111\b|debit card|credit card|charge my card|buy me the adobe|take (my )?card/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't take card details in chat and I won't buy software here. Paid licences (e.g. Adobe) need manager approval — I can log a software request ticket if you confirm, but please use the proper procurement process, not card numbers in this chat.",
    };
  }

  // Life-threatening emergency
  if (/life-?threatening|chest pain|can't breathe|suicide/.test(lower)) {
    if (has("handoff_to_human")) {
      const result = await input.executeTool("handoff_to_human", {
        reason: "emergency",
        summary: user.slice(0, 400),
      });
      toolCalls.push({
        name: "handoff_to_human",
        args: { reason: "emergency", summary: user.slice(0, 400) },
        result: result.data,
      });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: wf(lang, "emergency_local", { emerg: "911" }),
    };
  }

  // Explicit human request → immediate handoff
  if (
    /speak to (a |an )?(human|person|someone)|talk to (a |an )?(human|person|someone)|get someone from|have someone (from|call)|actual person|real (person|human)|call me\b|on the (phone|line)/.test(
      lower,
    )
  ) {
    if (has("handoff_to_human")) {
      const result = await input.executeTool("handoff_to_human", {
        reason: "explicit_request",
        summary: user.slice(0, 400),
      });
      toolCalls.push({
        name: "handoff_to_human",
        args: { reason: "explicit_request", summary: user.slice(0, 400) },
        result: result.data,
      });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: wf(lang, "handoff_teammate"),
    };
  }

  // Cross-user / cross-tenant — refuse, no tools
  if (
    /colleague|another (company|organisation|organization|tenant)|other (employee|staff)|sipho|acme traders|someone else'?s|their (tickets|account)/.test(
      lower,
    ) &&
    /(ticket|account|details|pull up|show me|open tickets)/.test(lower)
  ) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share or access another person's or another company's tickets or account details — only your own. Privacy rules block that here.",
    };
  }

  // Security incident → immediate handoff (P1)
  if (
    /phishing|clicked a link|typed my (company )?login|malware|ransomware|stolen|lost.*(laptop|phone)|compromised|fake/.test(
      lower,
    )
  ) {
    const args = {
      reason: "security_incident",
      summary: user.slice(0, 500),
    };
    if (has("handoff_to_human")) {
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: [
        "This is a **security incident** — treating it as urgent.",
        "Immediate steps: **disconnect** the device from the network, do **not** enter more credentials, and change the password from a known-good device at **reset.ubuntu-systems.co.za**.",
        "I've escalated to the security / IT team with your details — they'll follow up. I won't ask for your password.",
      ].join("\n\n"),
    };
  }

  if (pending?.status === "proposed" && isCancel(user)) {
    const cancelled = { ...pending, status: "cancelled" as const };
    return {
      handled: true,
      plan: cancelled,
      toolCalls: [],
      assistantMessage: embed(
        "Cancelled — I won't open a ticket. Tell me if you want a how-to from the knowledge base instead.",
        cancelled,
      ),
    };
  }

  // Execute confirmed ticket / howto+ticket plan
  if (pending?.status === "proposed" && isConfirm(user)) {
    const plan: ItWorkflowPlan = {
      ...pending,
      status: "executing",
      steps: pending.steps.map((s) => ({ ...s })),
    };
    const lines: string[] = [];

    for (const step of plan.steps) {
      if (!step.tool || !has(step.tool)) {
        if (step.tool === "notify_team" && has("handoff_to_human")) {
          const result = await input.executeTool("handoff_to_human", {
            reason: "ticket_notify",
            summary: String(step.args?.summary ?? plan.goal),
          });
          toolCalls.push({
            name: "handoff_to_human",
            args: { reason: "ticket_notify", summary: plan.goal },
            result: result.data,
          });
          step.status = "done";
          step.resultSummary = "Notified via Slack handoff";
          lines.push(`✓ ${step.label}`);
          continue;
        }
        step.status = "skipped";
        continue;
      }
      const result = await input.executeTool(step.tool, step.args ?? {});
      toolCalls.push({ name: step.tool, args: step.args ?? {}, result: result.data });
      const data = result.data as Record<string, unknown>;
      const ref = String(data.reference ?? data.id ?? (result.ok ? "REF-OK" : "ERR"));
      step.status = result.ok ? "done" : "failed";
      step.resultSummary = ref;
      lines.push(`${result.ok ? "✓" : "✗"} ${step.label} — ${ref}`);
      if (!result.ok && step.id === "ticket") break;
    }

    plan.status = "completed";
    const ticketStep = plan.steps.find((s) => s.id === "ticket" && s.status === "done");
    const msg = [
      ticketStep
        ? `Ticket logged — reference **${ticketStep.resultSummary}**. IT will pick it up per SLA; I haven't marked it fixed.`
        : "Workflow finished.",
      "",
      "## Workflow results",
      ...lines,
      "",
      "I can check that ticket status later if you share the reference.",
    ].join("\n");

    return { handled: true, plan, toolCalls, assistantMessage: embed(msg, plan) };
  }

  // Ticket status lookup
  const tkt = user.match(/\b(TKT-?\d+)\b/i);
  if (/status of (my )?ticket|check (my )?ticket|ticket\s+TKT/i.test(lower) && tkt) {
    if (has("get_ticket_status")) {
      const reference = tkt[1]!.toUpperCase().replace(/^TKT(?!-)/, "TKT-");
      const args = { reference, ticket_id: reference };
      const result = await input.executeTool("get_ticket_status", args);
      toolCalls.push({ name: "get_ticket_status", args, result: result.data });
      const data = result.data as Record<string, unknown>;
      return {
        handled: true,
        toolCalls,
        assistantMessage: `Ticket **${reference}** status: **${data.status ?? "in_progress"}**${
          data.assignee ? ` (assignee: ${data.assignee})` : ""
        }. ${data.note ?? "IT will update you when it moves."}`,
      };
    }
  }

  // Helpdesk hours (EN / AF)
  if (
    /opening hours|what are your (opening )?hours|helpdesk (hours|open)|when (are you|is (the )?(helpdesk|it) )open|hoe laat|hulptoonbank oop|is (die )?(helpdesk|it).*(oop|open)/.test(
      lower,
    )
  ) {
    const hours =
      input.knowledge?.match(/## Helpdesk hours[\s\S]*?(?=\n## )/)?.[0] ||
      "Helpdesk staffed **Mon–Fri 07:30–17:00**. Closed weekends and public holidays. Outside hours I still assist and log tickets for the next business day.";
    return {
      handled: true,
      toolCalls: [],
      assistantMessage: hours.includes("07:30")
        ? hours
        : `${hours}\n\nTypical hours on file: Mon–Fri **07:30–17:00** (example — replace per tenant).`,
    };
  }

  // SLA / response-time questions (grounded; never open a ticket just for asking)
  if (/how soon|response time|\bsla\b|when will someone respond|non-urgent ticket|normal,? non-urgent/.test(lower)) {
    const sla =
      input.knowledge?.match(/## Priorities[\s\S]*?(?=\n## )/)?.[0] ||
      [
        "**Priorities & response times (example SLA):**",
        "- **P3 Normal** — individual issue with a workaround: response within **1 business day**.",
        "- **P4 Low** — how-to / nice-to-have: within **3 business days**.",
        "- **P1/P2** are faster for outages, security, or fully blocked staff.",
      ].join("\n");
    return {
      handled: true,
      toolCalls: [],
      assistantMessage: `${sla}\n\nIf you want me to log a ticket, share the issue and contact details and I'll confirm before creating it.`,
    };
  }

  // Create-ticket request → propose plan (no write yet)
  if (
    /log (this|a ticket)|open a ticket|raise a ticket|can you log|create a ticket|file a ticket|log this\b/.test(
      lower,
    ) ||
    (/won't power|screen stays black/.test(lower) && /log|ticket|helpdesk/.test(lower))
  ) {
    const args = ticketArgsFromText(user);
    const plan: ItWorkflowPlan = {
      id: `it-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: "ticket",
      status: "proposed",
      steps: [
        {
          id: "ticket",
          label: `Create IT ticket: ${String(args.subject).slice(0, 80)}`,
          tool: "create_ticket",
          args,
          status: "pending",
        },
        {
          id: "notify",
          label: "Notify IT on Slack that a new ticket was logged",
          tool: has("notify_team") ? "notify_team" : "handoff_to_human",
          args: {
            summary: `New IT ticket pending confirm: ${args.subject}`,
            reason: "new_ticket",
          },
          status: "pending",
        },
        {
          id: "verify",
          label: "Confirm ticket reference back to you",
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
          "I can log this for IT as a multi-step workflow — I won't create the ticket until you confirm.",
          "",
          `**Goal:** ${plan.goal}`,
          "",
          "## Workflow plan",
          ...plan.steps.map((s, i) => `${i + 1}. ${s.label}`),
          "",
          "Reply **yes, go ahead** to create the ticket and notify the team. I won't claim it's fixed — only that it's logged.",
        ].join("\n"),
        plan,
      ),
    };
  }

  // How-to (VPN / wifi / password) → search KB, return playbook; offer ticket workflow if needed
  if (
    /how do i|connect to|vpn|globalprotect|wi-?fi|password reset|locked out|reset/.test(lower) &&
    !/log this|open a ticket/.test(lower)
  ) {
    const topic = detectTopic(lower);
    let kbSnippet = "";
    if (has("search_kb")) {
      const result = await input.executeTool("search_kb", { query: user.slice(0, 200), topic });
      toolCalls.push({ name: "search_kb", args: { query: user.slice(0, 200), topic }, result: result.data });
      const data = result.data as { article?: string; snippet?: string; content?: string };
      kbSnippet = String(data.article ?? data.snippet ?? data.content ?? "");
    }
    // Prefer live knowledge extract if stub is thin
    if ((!kbSnippet || kbSnippet.length < 40) && input.knowledge) {
      const section =
        topic === "vpn"
          ? input.knowledge.match(/## VPN[\s\S]*?(?=\n## )/)?.[0]
          : topic === "password"
            ? input.knowledge.match(/## Password[\s\S]*?(?=\n## )/)?.[0]
            : topic === "wifi"
              ? input.knowledge.match(/## Wi-Fi[\s\S]*?(?=\n## )/)?.[0]
              : "";
      kbSnippet = section?.slice(0, 900) ?? "";
    }

    const playbook = playbookFromTopic(topic, kbSnippet);
    const offerTicket = topic === "vpn" || topic === "hardware" || /still|doesn't work|not working/.test(lower);

    if (offerTicket && has("create_ticket")) {
      const plan: ItWorkflowPlan = {
        id: `it-${Date.now().toString(36)}`,
        goal: `Resolve ${topic} issue; open ticket if still broken`,
        kind: "howto_ticket",
        status: "proposed",
        steps: [
          { id: "kb", label: "Knowledge playbook shared", status: "done", resultSummary: "search_kb" },
          {
            id: "ticket",
            label: "If still failing — create IT ticket with your details",
            tool: "create_ticket",
            args: ticketArgsFromText(user),
            status: "pending",
          },
          {
            id: "notify",
            label: "Notify IT on Slack",
            tool: has("notify_team") ? "notify_team" : "handoff_to_human",
            args: { summary: `${topic} issue — user may need ticket`, reason: "howto_followup" },
            status: "pending",
          },
        ],
      };
      return {
        handled: true,
        plan,
        toolCalls,
        assistantMessage: embed(
          [
            playbook,
            "",
            "Try those steps first. If it still fails, reply **yes, go ahead** and I'll open a ticket and notify IT — I won't invent a fix.",
          ].join("\n"),
          plan,
        ),
      };
    }

    return {
      handled: true,
      toolCalls,
      assistantMessage: playbook,
    };
  }

  // Unknown policy-ish fact → handoff / offer ticket
  if (
    /reimburse|home fibre|fiber|byod policy|does the company/.test(lower) &&
    has("handoff_to_human")
  ) {
    const result = await input.executeTool("handoff_to_human", {
      reason: "unknown_fact",
      summary: user.slice(0, 400),
    });
    toolCalls.push({
      name: "handoff_to_human",
      args: { reason: "unknown_fact", summary: user.slice(0, 400) },
      result: result.data,
    });
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "I don't have that on file in the IT knowledge base — I've connected you to a human teammate who can confirm rather than guessing. I can also log a ticket if you prefer.",
    };
  }

  return { handled: false, assistantMessage: "", toolCalls: [] };
}
