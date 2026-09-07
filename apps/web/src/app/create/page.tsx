"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  BUSINESS_CONNECTORS,
  TONE_OPTIONS,
  toolsForConnectors,
} from "@/lib/connectors-catalog";

interface CustomAgentCreated {
  agentId: string;
  name: string;
  role?: string;
  category?: string;
  publicKey: string;
  accentColor?: string;
  summary?: string;
  toolsList?: string[];
  systemPrompt?: string;
  connectedConnectors?: string[];
}

interface TemplatePreset {
  name: string;
  role: string;
  category: string;
  tone: string;
  market: string;
  description: string;
  systemPrompt: string;
  connectors: string[];
  tools: string[];
  accentColor: string;
}

const TEMPLATES: Record<string, TemplatePreset> = {
  sdr: {
    name: "Inbound SDR & Lead Qualifier",
    role: "Inbound Sales Development",
    category: "sales",
    tone: "consultative",
    market: "global",
    description: "Engages website prospects, qualifies requirements, captures company details, and logs leads into the CRM.",
    systemPrompt:
      "You are an Inbound Sales Development Representative. Welcome prospective clients, ask consultative questions to understand their business challenges and requirements, capture their company, contact person, email, and phone number, and trigger the log_crm_lead action.",
    connectors: ["hubspot", "google_calendar", "query_knowledge"],
    tools: ["log_crm_lead", "schedule_meeting", "query_knowledge"],
    accentColor: "#6366f1",
  },
  invoicing: {
    name: "Invoicing & Billing Specialist",
    role: "Finance & Accounting Automation",
    category: "operations",
    tone: "professional",
    market: "global",
    description: "Assists team in drafting invoices, checking outstanding client balances, and sending payment follow-ups.",
    systemPrompt:
      "You are the Invoicing Specialist. Help team members draft client invoices, look up overdue accounts, calculate outstanding amounts, and prepare polite payment reminder copy for WhatsApp and email.",
    connectors: ["stripe", "whatsapp", "email"],
    tools: ["create_invoice", "check_overdue", "send_email"],
    accentColor: "#0d9482",
  },
  concierge: {
    name: "Client Onboarding Concierge",
    role: "Client Success & Delivery",
    category: "operations",
    tone: "friendly",
    market: "global",
    description: "Guides new clients through onboarding checklists, milestones, and project deliverable updates.",
    systemPrompt:
      "You are the Client Onboarding Concierge. Coordinate project deliverables, track onboarding milestones, log sprint tasks, and draft weekly progress updates for executive stakeholders.",
    connectors: ["notion", "query_knowledge", "email"],
    tools: ["create_task", "query_knowledge", "send_email"],
    accentColor: "#f59e0b",
  },
  support: {
    name: "Front-Desk Customer Support",
    role: "24/7 Customer Service",
    category: "front-office",
    tone: "friendly",
    market: "global",
    description: "Provides instantaneous answers to client inquiries, resolves frequent issues, and escalates when needed.",
    systemPrompt:
      "You are a friendly, highly competent Customer Support Agent. Answer questions accurately based on company documentation, provide step-by-step guidance, and escalate to a human agent when necessary.",
    connectors: ["query_knowledge", "zendesk", "slack"],
    tools: ["query_knowledge", "handoff_to_human", "create_ticket"],
    accentColor: "#3b82f6",
  },
  booking: {
    name: "Meeting & Appointment Booking",
    role: "Automated Calendar Specialist",
    category: "front-office",
    tone: "friendly",
    market: "global",
    description: "Checks real-time calendar availability, coordinates time slots, books meetings, and sends instant confirmations.",
    systemPrompt:
      "You are the Appointment & Meeting Scheduler. Coordinate client discovery calls and consultations, check calendar availability, propose open time slots, book meetings on Google Calendar, and send confirmation details.",
    connectors: ["google_calendar", "whatsapp", "email"],
    tools: ["schedule_meeting", "check_availability", "send_whatsapp_message"],
    accentColor: "#38bdf8",
  },
  realtor: {
    name: "Property & Real Estate Specialist",
    role: "Real Estate Buyer & Tenant Concierge",
    category: "sales",
    tone: "consultative",
    market: "global",
    description: "Qualifies prospective tenants/buyers, answers property specs from the knowledge base, and books private viewings.",
    systemPrompt:
      "You are a Real Estate Assistant. Help potential buyers and tenants discover properties, answer questions about pricing, bedrooms, amenities, and lease terms using the knowledge base, and schedule viewing appointments.",
    connectors: ["query_knowledge", "google_calendar", "whatsapp"],
    tools: ["query_knowledge", "schedule_meeting", "send_whatsapp_message"],
    accentColor: "#10b981",
  },
};

export default function CreatePage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("sdr");
  const [name, setName] = useState(TEMPLATES.sdr.name);
  const [role, setRole] = useState(TEMPLATES.sdr.role);
  const [category, setCategory] = useState(TEMPLATES.sdr.category);
  const [tone, setTone] = useState(TEMPLATES.sdr.tone);
  const [market, setMarket] = useState(TEMPLATES.sdr.market);
  const [description, setDescription] = useState(TEMPLATES.sdr.description);
  const [systemPrompt, setSystemPrompt] = useState(TEMPLATES.sdr.systemPrompt);
  const [selectedConnectors, setSelectedConnectors] = useState<string[]>(TEMPLATES.sdr.connectors);
  const [selectedTools, setSelectedTools] = useState<string[]>(TEMPLATES.sdr.tools);
  const [accentColor, setAccentColor] = useState(TEMPLATES.sdr.accentColor);
  const [model, setModel] = useState("claude-haiku-4-5");
  const [tier] = useState<"standard" | "pro" | "enterprise">("standard");
  const [escalationContact, setEscalationContact] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [mcpEndpoint, setMcpEndpoint] = useState("");
  const [mcpToken, setMcpToken] = useState("");
  const [customToolInput, setCustomToolInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdAgent, setCreatedAgent] = useState<CustomAgentCreated | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  function applyTemplate(key: string) {
    setSelectedTemplate(key);
    const tmpl = TEMPLATES[key];
    if (tmpl) {
      setName(tmpl.name);
      setRole(tmpl.role);
      setCategory(tmpl.category);
      setTone(tmpl.tone);
      setMarket(tmpl.market);
      setDescription(tmpl.description);
      setSystemPrompt(tmpl.systemPrompt);
      setSelectedConnectors(tmpl.connectors);
      setSelectedTools(tmpl.tools);
      setAccentColor(tmpl.accentColor);
    }
  }

  function toggleConnector(connectorId: string) {
    let nextConnectors: string[];
    if (selectedConnectors.includes(connectorId)) {
      nextConnectors = selectedConnectors.filter((c) => c !== connectorId);
    } else {
      nextConnectors = [...selectedConnectors, connectorId];
    }
    setSelectedConnectors(nextConnectors);

    // Automatically union tools for all selected connectors
    const autoTools = toolsForConnectors(nextConnectors);
    const merged = new Set([...selectedTools, ...autoTools]);
    setSelectedTools([...merged]);
  }

  function toggleTool(toolId: string) {
    if (selectedTools.includes(toolId)) {
      setSelectedTools(selectedTools.filter((t) => t !== toolId));
    } else {
      setSelectedTools([...selectedTools, toolId]);
    }
  }

  function addCustomTool() {
    const trimmed = customToolInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (trimmed && !selectedTools.includes(trimmed)) {
      setSelectedTools([...selectedTools, trimmed]);
      setCustomToolInput("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/agents/custom", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          role,
          category,
          tier,
          model,
          accentColor,
          description,
          systemPrompt,
          market,
          tone,
          escalationContact,
          connectors: selectedConnectors,
          tools: selectedTools,
          webhookUrl,
          webhookSecret,
          mcpEndpoint,
          mcpToken,
          state: "live",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create custom agent");
      }

      setCreatedAgent(data.agent);
      // Auto-redirect directly to Agent Studio connect step with celebratory banner
      router.push(`/agents/${data.agent.agentId}?welcome=1&step=connect`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--line)] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="chip chip-live !py-0.5 !text-[10px] font-semibold">Self-Serve Studio</span>
            <h1 className="display text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
              Configure New AI Agent
            </h1>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Create, connect business apps, and immediately deploy autonomous agents tailored to your workflow.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/my-agents" className="btn btn-ghost text-xs">
            ← Back to My Agents
          </Link>
        </div>
      </div>

      {createdAgent ? (
        /* Success State */
        <div className="panel relative overflow-hidden rounded-3xl border border-[var(--line-strong)] bg-gradient-to-b from-[var(--bg-elev)] to-[var(--bg-panel)] p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="card-specular-rim" />

          {/* Top Status Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--accent)_40%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent-bright)] shadow-[0_0_24px_color-mix(in_srgb,var(--accent)_30%,transparent)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-7 w-7">
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Agent Successfully Deployed
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">
              &ldquo;{createdAgent.name}&rdquo; is Ready!
            </h2>
            <p className="text-xs sm:text-sm text-[var(--muted)] max-w-lg mx-auto">
              Follow the guided quickstart below. You can connect your live tools, take it for a 30-second test drive in the sandbox, or copy the embed script for your website.
            </p>
          </div>

          {/* Dual Guided Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto text-left">
            {/* Action 1: Connect External Accounts */}
            <div className="relative flex flex-col justify-between rounded-2xl border border-[var(--accent)]/40 bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] p-5 space-y-4 hover:border-[var(--accent)] transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg">⚡</span>
                  <span className="chip chip-live !py-0.5 !text-[9px]">Recommended • 2 Min</span>
                </div>
                <h3 className="text-sm font-bold text-white">Step 2: Connect External Accounts</h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Authorize Google Calendar, HubSpot, WhatsApp, or Slack so your agent can take real actions, schedule calls, and sync client data.
                </p>
              </div>
              <Link
                href={`/agents/${createdAgent.agentId}?step=connect`}
                className="btn btn-primary w-full py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-2 shadow-glow-sm"
              >
                <span>Authorize Integrations via OAuth</span>
                <span>→</span>
              </Link>
            </div>

            {/* Action 2: Test Drive in Sandbox */}
            <div className="relative flex flex-col justify-between rounded-2xl border border-[var(--line)] bg-[var(--bg-panel)] p-5 space-y-4 hover:border-[var(--line-strong)] transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg">🧪</span>
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-slate-300">Fastest • 30 Sec</span>
                </div>
                <h3 className="text-sm font-bold text-white">Step 3: Test Drive in Sandbox</h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Ask realistic questions right away. Evaluate how your agent thinks, answers, and proposes actions with sample prompts.
                </p>
              </div>
              <Link
                href={`/agents/${createdAgent.agentId}?step=try`}
                className="btn btn-ghost w-full py-2.5 text-xs font-semibold border border-[var(--line)] hover:border-white/40 inline-flex items-center justify-center gap-2"
              >
                <span>Launch Instant Sandbox Test</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* 1-Line Website Embed Snippet Box */}
          <div className="mx-auto max-w-3xl text-left space-y-3 rounded-2xl border border-[var(--line)] bg-[#0a0f16] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--line)] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">🌐</span>
                  <span className="text-xs font-bold text-white">Step 4: 1-Line Website Embed Code</span>
                  <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold">Zero Dev Required</span>
                </div>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">
                  Paste before <code className="text-slate-200">&lt;/body&gt;</code> on any website (HTML, WordPress, Shopify, Webflow).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const snippet = `<script src="${origin || "https://zaraai.digital"}/agents/v1/agent.js" data-key="${createdAgent.publicKey}" defer></script>`;
                    navigator.clipboard.writeText(snippet);
                    setCopiedEmbed(true);
                    setTimeout(() => setCopiedEmbed(false), 2500);
                  }}
                  className={`btn py-1 px-3 text-xs font-semibold transition-all ${
                    copiedEmbed ? "!bg-emerald-400 !text-black shadow-lg" : "btn-primary"
                  }`}
                >
                  {copiedEmbed ? "✓ Copied Embed Code!" : "📋 Copy 1-Line Embed Code"}
                </button>
              </div>
            </div>

            <pre className="overflow-x-auto p-3 text-[11px] leading-relaxed font-mono text-[var(--accent-bright)] bg-black/50 rounded-xl border border-[var(--line)]">
              {`<script src="${origin || "https://zaraai.digital"}/agents/v1/agent.js" data-key="${createdAgent.publicKey}" defer></script>`}
            </pre>

            <div className="flex flex-wrap items-center justify-between text-[11px] text-[var(--muted)] pt-1">
              <span>Public Key: <span className="font-mono text-slate-300">{createdAgent.publicKey}</span></span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(createdAgent.publicKey);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="text-[var(--accent-bright)] hover:underline font-mono text-[10px]"
              >
                {copiedKey ? "✓ Copied Key" : "Copy Key Only"}
              </button>
            </div>
          </div>

          {/* Quick Navigation Footer */}
          <div className="flex flex-wrap justify-center items-center gap-3 pt-2 text-xs">
            <Link
              href={`/agents/${createdAgent.agentId}`}
              className="btn btn-ghost px-4 py-2 border border-[var(--line)] hover:border-white/30"
            >
              Open Full Studio Hub
            </Link>
            <Link href="/my-agents" className="btn btn-ghost px-4 py-2 border border-[var(--line)] hover:border-white/30">
              View in My Agents
            </Link>
            <button
              type="button"
              onClick={() => {
                setCreatedAgent(null);
                setName("");
              }}
              className="btn btn-ghost px-4 py-2 text-[var(--muted)] hover:text-white"
            >
              + Create Another Agent
            </button>
          </div>
        </div>
      ) : (
        /* Dual Column Studio Builder */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Template Presets Bar */}
            <div className="panel p-4 space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Start from Recommended Preset
              </label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(TEMPLATES).map(([key, t]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyTemplate(key)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                      selectedTemplate === key
                        ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--accent-bright)] shadow-[0_0_12px_color-mix(in_srgb,var(--accent)_25%,transparent)]"
                        : "border-[var(--line)] bg-[var(--bg-panel)] text-[var(--muted)] hover:text-white"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-[var(--danger)]/40 bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] p-3.5 text-xs text-[var(--danger)]">
                {errorMessage}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="panel p-6 space-y-5">
              {/* Section 1: Core Identity & Market */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] pb-1.5">
                  1. Agent Identity & Region
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--text)]">Agent Name *</span>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. MoveDigital Sales Closer"
                      className="input text-xs w-full"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--text)]">Job Function / Role *</span>
                    <input
                      type="text"
                      required
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g. Inbound Sales & Lead Qualification"
                      className="input text-xs w-full"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--text)]">Category</span>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="input text-xs w-full cursor-pointer"
                    >
                      <option value="sales">Sales & Triage</option>
                      <option value="operations">Operations & Finance</option>
                      <option value="front-office">Front Office Support</option>
                      <option value="vertical">Vertical Specialist</option>
                    </select>
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--text)]">Target Market</span>
                    <select
                      value={market}
                      onChange={(e) => setMarket(e.target.value)}
                      className="input text-xs w-full cursor-pointer"
                    >
                      <option value="global">🌍 Global</option>
                      <option value="za">🇿🇦 South Africa (POPIA)</option>
                      <option value="us">🇺🇸 United States</option>
                      <option value="eu">🇪🇺 European Union (GDPR)</option>
                    </select>
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--text)]">Accent Color</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="h-9 w-10 rounded-lg border border-[var(--line)] bg-[var(--bg-panel)] p-1 cursor-pointer"
                      />
                      <span className="text-xs font-mono text-[var(--muted)]">{accentColor}</span>
                    </div>
                  </label>
                </div>

                {/* Tone Selector */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-semibold text-[var(--text)]">Tone & Persona</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TONE_OPTIONS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTone(t.id)}
                        className={`rounded-xl border p-2.5 text-left transition-all ${
                          tone === t.id
                            ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-white shadow-glow-sm"
                            : "border-[var(--line)] bg-[var(--bg-panel)] text-[var(--muted)] hover:text-white"
                        }`}
                      >
                        <p className="text-xs font-semibold">{t.label}</p>
                        <p className="text-[10px] text-[var(--muted)] line-clamp-1 mt-0.5">{t.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 2: Business Connectors */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    2. Connect Business Apps
                  </h3>
                  <span className="text-[11px] font-semibold text-[var(--accent-bright)]">
                    {selectedConnectors.length} apps selected
                  </span>
                </div>

                <p className="text-xs text-[var(--muted)]">
                  Click to connect the systems your agent should interface with. Tools are auto-configured.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {BUSINESS_CONNECTORS.map((c) => {
                    const active = selectedConnectors.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleConnector(c.id)}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                          active
                            ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-white shadow-sm"
                            : "border-[var(--line)] bg-[var(--bg-panel)] text-[var(--muted)] hover:text-white hover:border-[var(--line-strong)]"
                        }`}
                      >
                        <span className="text-xl shrink-0">{c.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-white truncate">{c.name}</p>
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                active ? "bg-[var(--accent)] text-black" : "bg-white/10 text-white/60"
                              }`}
                            >
                              {active ? "✓ ADDED" : "+ ADD"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="chip chip-gray !py-0 !px-1.5 !text-[9px]">{c.authBadge}</span>
                          </div>
                          <p className="text-[10px] text-[var(--muted)] mt-1 line-clamp-1">{c.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-[color-mix(in_srgb,var(--accent)_30%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] p-3 text-xs text-slate-300 flex items-start gap-2.5">
                  <span className="text-base shrink-0">💡</span>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white">How OAuth & Connector Authentication Works</p>
                    <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                      Selecting an app above equips your agent with its capabilities (e.g. booking meetings, logging CRM leads).
                      Once you click <strong>Deploy Custom Agent</strong>, you will 1-click authenticate your Google Calendar, HubSpot, or Slack account via secure OAuth, or enter API credentials in the Agent Studio.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Goal & Operational Scope */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] pb-1.5">
                  3. Business Goal & Guidelines
                </h3>

                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-[var(--text)]">Business Summary / Goal *</span>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Qualifies sales leads, answers product questions, and schedules intro calls."
                    className="input text-xs w-full"
                  />
                </label>

                {/* Advanced prompt customizer collapsed by default */}
                <details className="group rounded-xl border border-[var(--line)] bg-[var(--bg-elev)] p-3 text-xs">
                  <summary className="cursor-pointer font-semibold text-[var(--accent-bright)] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>⚙️</span>
                      <span>Fine-Tune Persona Prompt & Rules (Optional)</span>
                    </span>
                    <span className="text-[10px] text-[var(--muted)] group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="pt-2.5 space-y-1.5">
                    <p className="text-[11px] text-[var(--muted)]">
                      Pre-filled with best practices from your selected preset. Tweak if you have company-specific FAQs, refund rules, or custom scripts.
                    </p>
                    <textarea
                      rows={4}
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="Instructions guiding this agent's scope, services offered, pricing policy, and conversational boundaries..."
                      className="input text-xs w-full resize-none leading-relaxed font-mono text-[11px]"
                    />
                  </div>
                </details>
              </div>

              {/* Section 4: Escalation & Model Specs */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] pb-1.5">
                  4. Escalation & Execution
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--text)]">Human Escalation Contact (Optional)</span>
                    <input
                      type="text"
                      value={escalationContact}
                      onChange={(e) => setEscalationContact(e.target.value)}
                      placeholder="e.g. sales@company.com or +27..."
                      className="input text-xs w-full"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--text)]">AI Engine</span>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="input text-xs w-full cursor-pointer"
                    >
                      <option value="claude-haiku-4-5">Claude Haiku 4.5 (Sub-100ms Inference)</option>
                      <option value="claude-sonnet-3-7">Claude Sonnet 3.7 (Deep Reasoning)</option>
                      <option value="gpt-4o">GPT-4o (Multimodal)</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Section 5: Advanced Developer Integrations (Webhooks & MCP) */}
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-panel)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex w-full items-center justify-between p-3.5 text-xs font-semibold text-[var(--muted)] hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>⚙️ Advanced Integrations (Custom Webhooks & MCP)</span>
                    <span className="chip chip-gray !py-0 !text-[9px]">Developer</span>
                  </div>
                  <span>{showAdvanced ? "▲ Hide" : "▼ Expand"}</span>
                </button>

                {showAdvanced ? (
                  <div className="p-4 pt-1 space-y-4 border-t border-[var(--line)] text-xs">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">Custom Webhook Dispatch</span>
                        <span className="text-[10px] text-[var(--muted)]">HTTP POST events</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="url"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          placeholder="https://api.yourdomain.com/webhooks/agent"
                          className="input text-xs font-mono w-full"
                        />
                        <input
                          type="password"
                          value={webhookSecret}
                          onChange={(e) => setWebhookSecret(e.target.value)}
                          placeholder="Secret Header / HMAC Token"
                          className="input text-xs font-mono w-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[var(--line)]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">Model Context Protocol (MCP) Server</span>
                        <span className="text-[10px] text-[var(--muted)]">Dynamic Tool Server</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="url"
                          value={mcpEndpoint}
                          onChange={(e) => setMcpEndpoint(e.target.value)}
                          placeholder="https://mcp.yourdomain.com/sse"
                          className="input text-xs font-mono w-full"
                        />
                        <input
                          type="password"
                          value={mcpToken}
                          onChange={(e) => setMcpToken(e.target.value)}
                          placeholder="MCP Bearer Token"
                          className="input text-xs font-mono w-full"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Active Tools & Capabilities */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text)]">Active Capabilities ({selectedTools.length})</span>
                  <span className="text-[10px] text-[var(--muted)]">Auto-mapped from connectors</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTools.map((tool) => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => toggleTool(tool)}
                      className="rounded-lg border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] px-2.5 py-1 text-[11px] font-mono text-[var(--accent-bright)] font-semibold transition-all hover:opacity-80"
                    >
                      ✓ {tool}()
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customToolInput}
                    onChange={(e) => setCustomToolInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomTool();
                      }
                    }}
                    placeholder="+ Add custom capability..."
                    className="input text-[11px] font-mono flex-1 py-1"
                  />
                  <button
                    type="button"
                    onClick={addCustomTool}
                    className="btn btn-ghost text-xs px-3 py-1"
                  >
                    + Add
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--line)]">
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="btn btn-primary w-full py-3 text-xs font-semibold shadow-[0_0_20px_color-mix(in_srgb,var(--accent)_30%,transparent)] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Deploying Custom Agent...</span>
                    </span>
                  ) : (
                    <span>Deploy Custom Agent →</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Live Preview Card Column (5 cols) */}
          <div className="lg:col-span-5 space-y-4 sticky top-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                Live Agent Card Preview
              </span>
              <span className="text-[10px] text-[var(--accent-bright)]">Auto-syncs with form</span>
            </div>

            <div className="panel relative overflow-hidden rounded-2xl border border-[var(--line-strong)] bg-gradient-to-b from-[var(--bg-elev)] to-[var(--bg-panel)] p-5 shadow-card space-y-4">
              <div className="card-specular-rim" />
              <div className="flex items-start gap-3.5">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-glow-sm transition-colors duration-300"
                  style={{ backgroundColor: accentColor }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                    <rect x="4" y="6" width="16" height="12" rx="3" />
                    <circle cx="9" cy="11.5" r="1.25" fill="currentColor" stroke="none" />
                    <circle cx="15" cy="11.5" r="1.25" fill="currentColor" stroke="none" />
                    <path d="M12 2v4M8 15h8M2 12h2M20 12h2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-base font-bold text-white tracking-tight truncate">
                      {name || "Agent Name"}
                    </p>
                    <span className="chip chip-live !py-0.5 !text-[10px]">LIVE</span>
                    <span className="rounded-md bg-indigo-500/18 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-300 border border-indigo-500/35">
                      CUSTOM
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{role || "Specialist Role"}</p>
                </div>
              </div>

              {/* Persona & Tone Badges */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-white/80 font-medium">
                  Tone: {TONE_OPTIONS.find((t) => t.id === tone)?.label || tone}
                </span>
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-white/80 font-medium">
                  {market === "za" ? "🇿🇦 South Africa" : market === "us" ? "🇺🇸 United States" : market === "eu" ? "🇪🇺 EU" : "🌍 Global"}
                </span>
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-white/80 font-medium">
                  {model.split("-")[1] || model}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {description || "Provide a summary in the form to preview the card description."}
              </p>

              {/* Equipped Business Apps */}
              <div className="space-y-1.5 border-t border-[var(--line)] pt-3">
                <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-[var(--muted)]">
                  <span>Equipped Apps ({selectedConnectors.length})</span>
                  <span className="text-[9px] text-[var(--accent-bright)]">OAuth setup after launch</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedConnectors.map((cid) => {
                    const conn = BUSINESS_CONNECTORS.find((c) => c.id === cid);
                    return (
                      <span
                        key={cid}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--bg-panel)] px-2 py-0.5 text-[10px] text-white"
                      >
                        <span>{conn?.icon || "🔌"}</span>
                        <span>{conn?.name || cid}</span>
                        <span className="text-[8px] text-[var(--muted)] font-mono">({conn?.authBadge})</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Tools list */}
              <div className="space-y-1.5 border-t border-[var(--line)] pt-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Active Capabilities ({selectedTools.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedTools.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-[var(--line)] bg-[var(--bg-panel)] px-2 py-0.5 text-[10px] text-slate-200 capitalize font-medium"
                    >
                      {t.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>

              {/* Escalation & Developer Integrations */}
              {(escalationContact || webhookUrl || mcpEndpoint) ? (
                <div className="rounded-xl border border-[var(--line)] bg-black/30 p-3 space-y-1 text-xs">
                  <span className="text-[10px] uppercase font-semibold text-[var(--muted)]">Active Integrations</span>
                  {escalationContact ? (
                    <p className="text-[11px] text-slate-300 truncate">
                      👤 Escalation: <span className="font-mono text-[var(--accent-bright)]">{escalationContact}</span>
                    </p>
                  ) : null}
                  {webhookUrl ? (
                    <p className="text-[11px] text-slate-300 truncate">
                      ⚡ Webhook: <span className="font-mono text-amber-400">{webhookUrl}</span>
                    </p>
                  ) : null}
                  {mcpEndpoint ? (
                    <p className="text-[11px] text-slate-300 truncate">
                      🔌 MCP Server: <span className="font-mono text-purple-400">{mcpEndpoint}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
