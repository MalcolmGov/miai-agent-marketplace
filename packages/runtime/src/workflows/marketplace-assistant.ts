export function isMarketplaceAssistant(agentId: string): boolean {
  return /marketplace-assistant/i.test(agentId);
}

type ToolExec = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ ok: boolean; data: unknown }>;

export async function runMarketplaceAssistantWorkflow(input: {
  userMessage: string;
  executeTool: ToolExec;
  replyLanguage?: string;
}): Promise<{
  handled: boolean;
  assistantMessage: string;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}> {
  const text = input.userMessage.trim();
  const lower = text.toLowerCase();
  const toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }> = [];

  const leadMatch =
    /(?:demo|sales|enterprise|partnership|security questionnaire|quote)/i.test(lower) &&
    (/@/.test(text) || /[\d]{7,}/.test(text) || /i am |i'm |my name/i.test(text));

  if (leadMatch) {
    const email = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0];
    const name =
      text.match(/(?:i am|i'm|my name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)?.[1] ||
      text.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)/)?.[1] ||
      "there";
    const company =
      text.match(/(?:from|at)\s+([A-Z][\w\s&-]{2,40})/i)?.[1]?.trim() || undefined;
    const args = {
      name,
      contact: email || "see chat",
      email,
      company,
      interest: /whatsapp/i.test(lower)
        ? "WhatsApp / demo"
        : /security/i.test(lower)
          ? "security review"
          : /enterprise|quote|pricing/i.test(lower)
            ? "enterprise pricing"
            : "product demo",
      notes: text.slice(0, 400),
    };
    const result = await input.executeTool("capture_lead", args);
    toolCalls.push({ name: "capture_lead", args, result: result.data });
    const ref =
      result.data && typeof result.data === "object" && "reference" in result.data
        ? String((result.data as { reference?: string }).reference ?? "")
        : "";
    return {
      handled: true,
      toolCalls,
      assistantMessage: `Thanks${name !== "there" ? `, ${name}` : ""} — I've logged your request${ref ? ` (${ref})` : ""}. A teammate will follow up${email ? ` at ${email}` : ""}. Meanwhile you can browse the demo shortlist at /demo or Trust at /trust.`,
    };
  }

  if (/soc\s*2|soc2/.test(lower)) {
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "We're not SOC 2 certified today — Type II is on the roadmap. What you can review now is the Trust Center at /trust (Live / Partial / Planned tags; we prefer under-claiming). For a security questionnaire, share your name and email and I'll capture a lead.",
    };
  }

  if (/how many agents|220|catalogue size|catalog size|how many.*famil/.test(lower)) {
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "The marketplace has **55 agent families × 4 market packs (US, EU, Africa, Asia) = 220 agents**. Browse them on / or see the demo shortlist of 6 at /demo.",
    };
  }

  if (/website|embed|install.*(web|site)|put an agent on|agent\.js/.test(lower)) {
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "To put an agent on your website: (1) Rent it from the catalogue, (2) open Agent Studio → configure knowledge/connectors, (3) Go **Live**, (4) open **Install → Website** and copy the embed snippet (`agent.js` + your public key). Start from / and open any agent card → Rent / setup.",
    };
  }

  if (/app channel|webview|\/app\/v1|mobile app channel/.test(lower)) {
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "The **App** channel is a hosted messenger at `/app/v1?key=mia_pk_…` — full-screen for WKWebView / Android WebView / Expo. After the agent is Live, use Install → App in Studio to copy the URL.",
    };
  }

  if (/whatsapp|waba/.test(lower)) {
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "Many agents are WhatsApp-ready in prompts and evals, but **WABA / BSP go-live is partnership-gated (Partial)** — not self-serve yet. I can capture a lead for WhatsApp provisioning, or you can try Website / App Install today from Studio.",
    };
  }

  if (/token|wallet|top up|run out/.test(lower)) {
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "Each reply debits **tokens** from your workspace wallet. If the balance hits zero the agent **pauses** (your setup stays); use **Top up** in the shell to resume. Staging may still use a mock wallet until MyInstantAI wallet cutover.",
    };
  }

  if (/dental|clinic front|appointment/.test(lower) && /book|front|agent|need|recommend/.test(lower)) {
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "For a dental clinic front desk that books visits, start with **Dental Front Desk** — `/agents/us-dental-front-desk` (also on the /demo shortlist). Rent → configure your fees/hours in knowledge → Live → Install.",
    };
  }

  if (/demo shortlist|monday demo|pilot 6|demo 6/.test(lower)) {
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "The demo shortlist (6 of 220) on /demo is: Executive Assistant, IT Helpdesk, Dental Front Desk, Hotel Guest, Sales Qualifier, and Home Services. The commercial license still covers the full catalogue.",
    };
  }

  if (/guardrail/.test(lower)) {
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "Guardrails are the rules each agent follows — grounded answers only, no inventing facts, privacy boundaries, and human handoff for clinical/legal/PHI. Market packs add CCPA/TCPA, GDPR, POPIA-style, or PDPA-style cues. In Studio you can run **Test the guardrails**. More at /trust.",
    };
  }

  if (/privacy|security|compliance|gdpr|ccpa|popia|pdpa|trust/.test(lower)) {
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "Privacy & security live in the Trust Center at /trust — RBAC, HMAC embed keys, encrypted OAuth tokens, audit, DSAR export, and market-pack guardrails. We under-claim: no blanket “GDPR certified” or SOC 2 today. Security contact: security@myinstantai.com.",
    };
  }

  if (/connector|oauth|slack|calendar|google/.test(lower)) {
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "Connect tools from Agent Studio → Actions / Connectors (OAuth PKCE, callback `/api/oauth/callback`). Connect before expecting live calendar/Slack/CRM actions; sandbox chat can stub tools for demos.",
    };
  }

  if (/support desk|learn page|history page|coming soon/.test(lower)) {
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "Learn, Support Desk, History, Scan, and Personalize are still **Coming soon** in the nav. For marketplace help use this Ask AI assistant (/ask) or ask me to capture a lead for the team.",
    };
  }

  if (/set up|setup|how do i (rent|configure|deploy)|get started/.test(lower)) {
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "Setup path: **pick an agent** on / → **Rent / setup** in Studio → edit **knowledge** (and connectors if needed) → **Go Live** → **Install** Website, App (`/app/v1`), or WhatsApp (partnership). Token wallet must have balance. Want a recommendation for your use case?",
    };
  }

  if (/price|pricing|cost|how much|enterprise quote/.test(lower)) {
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "Agents have tiered monthly rent bands and prepaid SKU capacity guides; usage draws **tokens** (Top up in the shell). Custom enterprise / partnership quotes need a human — share your name, email, and company and I’ll capture a lead. Public commercial framing is on the partnership materials; I won’t invent a number.",
    };
  }

  // Let the model answer open questions from the product knowledge base.
  return { handled: false, toolCalls, assistantMessage: "" };
}
