"use client";

import { useState } from "react";
import {
  BUSINESS_CONNECTORS,
  TONE_OPTIONS,
  toolsForConnectors,
} from "@/lib/connectors-catalog";

export interface CustomAgentCreated {
  agentId: string;
  name: string;
  summary: string;
  category: string;
  publicKey: string;
  accentColor: string;
  state: string;
  tier: string;
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
    description: "Greets visitors, qualifies company requirements, captures contact details, and logs leads into the CRM.",
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
};

export function ConfigureAgentModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (agent: CustomAgentCreated) => void;
}) {
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

  if (!isOpen) return null;

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

    // Automatically sync tools with selected connectors
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

      onCreated(data.agent);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl rounded-3xl border border-[var(--line-strong)] bg-gradient-to-b from-[var(--bg-elev)] to-[var(--bg-panel)] p-6 shadow-2xl space-y-5 my-8 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--accent)_40%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent-bright)] shadow-[0_0_16px_color-mix(in_srgb,var(--accent)_30%,transparent)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <rect x="4" y="6" width="16" height="12" rx="3" />
                <circle cx="9" cy="11.5" r="1.25" fill="currentColor" stroke="none" />
                <circle cx="15" cy="11.5" r="1.25" fill="currentColor" stroke="none" />
                <path d="M12 2v4M8 15h8M2 12h2M20 12h2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[var(--text)]">Configure New AI Agent</h2>
              <p className="text-xs text-[var(--muted)]">Intuitive setup — business apps, identity, and guided capabilities.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--muted)] hover:text-white hover:bg-[var(--line)] transition-all"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Template Presets Bar */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Start from Preset
          </label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(TEMPLATES).map(([key, t]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyTemplate(key)}
                className={`rounded-xl border px-3 py-1 text-xs font-medium transition-all ${
                  selectedTemplate === key
                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--accent-bright)] shadow-[0_0_12px_color-mix(in_srgb,var(--accent)_25%,transparent)]"
                    : "border-[var(--line)] bg-[var(--bg-panel)] text-[var(--muted)] hover:text-white hover:border-[var(--line-strong)]"
                }`}
              >
                {t.name.split(" ")[0]} {t.name.split(" ")[1]}
              </button>
            ))}
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-[var(--danger)]/40 bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] p-3 text-xs text-[var(--danger)]">
            {errorMessage}
          </div>
        ) : null}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section 1: Identity & Tone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
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

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[var(--text)]">Role / Function *</span>
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
            <label className="block space-y-1">
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

            <label className="block space-y-1">
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

            <label className="block space-y-1">
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
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-[var(--text)]">Tone & Persona</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTone(t.id)}
                  className={`rounded-xl border p-2 text-left transition-all ${
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

          {/* Section 2: Business Connectors */}
          <div className="space-y-2 rounded-2xl border border-[var(--line)] bg-[var(--bg-card)] p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[var(--text)]">Connect Business Apps</span>
                <p className="text-[11px] text-[var(--muted)]">Select the tools and platforms this agent interfaces with.</p>
              </div>
              <span className="text-[10px] font-semibold text-[var(--accent-bright)]">
                {selectedConnectors.length} apps selected
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {BUSINESS_CONNECTORS.map((c) => {
                const active = selectedConnectors.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleConnector(c.id)}
                    className={`flex items-start gap-2 rounded-xl border p-2 text-left transition-all ${
                      active
                        ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-white"
                        : "border-[var(--line)] bg-[var(--bg-panel)] text-[var(--muted)] hover:text-white"
                    }`}
                  >
                    <span className="text-base">{c.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-medium truncate">{c.name}</p>
                        <span
                          className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            active ? "bg-[var(--accent)] text-black" : "bg-white/10 text-white/60"
                          }`}
                        >
                          {active ? "✓ ADDED" : "+ ADD"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[8px] font-mono text-[var(--accent-bright)]">{c.authBadge}</span>
                      </div>
                      <p className="text-[9px] text-[var(--muted)] line-clamp-1 mt-0.5">{c.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-[color-mix(in_srgb,var(--accent)_30%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] p-2.5 text-xs text-slate-300 flex items-start gap-2">
              <span className="text-sm shrink-0">💡</span>
              <p className="text-[10px] text-[var(--muted)] leading-relaxed">
                Selecting apps equips your agent with capabilities. Once launched, you can 1-click authenticate your Google Calendar or HubSpot account via OAuth in the Agent Studio.
              </p>
            </div>
          </div>

          {/* Section 3: Instructions & Escalation */}
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--text)]">What this agent accomplishes</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Qualifies sales leads, answers product questions, and schedules intro calls."
              className="input text-xs w-full"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--text)]">System Persona & Guidelines</span>
            <textarea
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Define rules, company knowledge, services offered, and conversational boundaries..."
              className="input text-xs w-full resize-none leading-relaxed"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[var(--text)]">Human Escalation Contact (Optional)</span>
              <input
                type="text"
                value={escalationContact}
                onChange={(e) => setEscalationContact(e.target.value)}
                placeholder="e.g. sales@company.com or +27..."
                className="input text-xs w-full"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[var(--text)]">AI Model</span>
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

          {/* Section 4: Advanced Webhooks & MCP Accordion */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-panel)] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between p-3 text-xs font-semibold text-[var(--muted)] hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>⚙️ Advanced Integrations (Webhooks & MCP)</span>
                <span className="chip chip-gray !py-0 !text-[9px]">Developer</span>
              </div>
              <span>{showAdvanced ? "▲ Hide" : "▼ Expand"}</span>
            </button>

            {showAdvanced ? (
              <div className="p-3.5 pt-1 space-y-3 border-t border-[var(--line)] text-xs">
                <div className="space-y-2">
                  <span className="font-semibold text-slate-200">Custom Webhook Endpoint</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                      placeholder="Webhook Secret / HMAC Token"
                      className="input text-xs font-mono w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-[var(--line)]">
                  <span className="font-semibold text-slate-200">Model Context Protocol (MCP) Server</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

          {/* Active Capabilities Checklist */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text)]">Active Capabilities & Tools</span>
              <span className="text-[10px] text-[var(--muted)]">Auto-mapped from connectors</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedTools.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTool(t)}
                  className="rounded-lg border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] px-2 py-0.5 text-[10px] font-mono text-[var(--accent-bright)] font-semibold"
                >
                  ✓ {t}
                </button>
              ))}
            </div>

            {/* Custom Tool Adder */}
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
                className="btn btn-ghost text-xs px-2.5 py-1"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-ghost text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="btn btn-primary inline-flex items-center gap-1.5 text-xs px-4 py-2 shadow-[0_0_16px_color-mix(in_srgb,var(--accent)_30%,transparent)] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Creating Agent...</span>
                </>
              ) : (
                <>
                  <span>Create & Launch Agent</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
