"use client";

import { useState } from "react";

export interface ConnectorItem {
  id: string;
  name: string;
  category: string;
  icon: string;
  status: "AVAILABLE" | "CONNECTED";
  desc: string;
  authType: "OAuth 2.0" | "API Key" | "Remote MCP" | "Webhook";
}

const INITIAL_CONNECTORS: ConnectorItem[] = [
  {
    id: "erp.xero",
    name: "Xero Accounting",
    category: "Accounting & ERP",
    icon: "📊",
    status: "AVAILABLE",
    authType: "OAuth 2.0",
    desc: "Sync invoices, bills, reconcile bank feeds, and track real-time runway with zero manual entry.",
  },
  {
    id: "erp.sage",
    name: "Sage Cloud",
    category: "Accounting & ERP",
    icon: "🌿",
    status: "AVAILABLE",
    authType: "OAuth 2.0",
    desc: "South African ERP & tax compliance, ledger journal posting, and automated VAT 201 reports.",
  },
  {
    id: "erp.quickbooks",
    name: "QuickBooks Online",
    category: "Accounting & ERP",
    icon: "📗",
    status: "AVAILABLE",
    authType: "OAuth 2.0",
    desc: "Automated accounts payable, 3-way purchase order matching, and supplier master records.",
  },
  {
    id: "crm.hubspot",
    name: "HubSpot CRM",
    category: "CRM & Revenue",
    icon: "🟠",
    status: "AVAILABLE",
    authType: "OAuth 2.0",
    desc: "10-second inbound lead qualification, pipeline deal stage updates, and meeting sync.",
  },
  {
    id: "crm.salesforce",
    name: "Salesforce Cloud",
    category: "CRM & Revenue",
    icon: "☁️",
    status: "AVAILABLE",
    authType: "OAuth 2.0",
    desc: "Enterprise account management, opportunity pipeline tracking, and automated CPQ quotes.",
  },
  {
    id: "microsoft.365",
    name: "Microsoft 365",
    category: "Productivity",
    icon: "🟦",
    status: "AVAILABLE",
    authType: "OAuth 2.0",
    desc: "Outlook email dispatch, Outlook Calendar scheduling, and Teams automated briefings.",
  },
  {
    id: "google.workspace",
    name: "Google Workspace",
    category: "Productivity",
    icon: "🔴",
    status: "AVAILABLE",
    authType: "OAuth 2.0",
    desc: "Gmail auto-replies, Google Calendar meeting booking, and Google Drive document intake.",
  },
  {
    id: "payments.paystack",
    name: "Paystack Gateway",
    category: "Payments & Banking",
    icon: "💳",
    status: "AVAILABLE",
    authType: "API Key",
    desc: "ZAR payment links, instant EFT verification, card charge settlement, and automated webhooks.",
  },
  {
    id: "payments.peach",
    name: "Peach Payments",
    category: "Payments & Banking",
    icon: "🍑",
    status: "AVAILABLE",
    authType: "API Key",
    desc: "Enterprise South African payment gateway, subscription debit orders, and reconciliation.",
  },
  {
    id: "support.zendesk",
    name: "Zendesk Support",
    category: "Support & Ops",
    icon: "🟢",
    status: "AVAILABLE",
    authType: "OAuth 2.0",
    desc: "24/7 ticket triage, sentiment analysis, priority escalations, and satisfaction CSAT tracking.",
  },
  {
    id: "support.jira",
    name: "Jira Service Desk",
    category: "Support & Ops",
    icon: "🔷",
    status: "AVAILABLE",
    authType: "OAuth 2.0",
    desc: "Internal IT helpdesk tickets, engineering sprint issue creation, and SLA management.",
  },
  {
    id: "db.postgres",
    name: "PostgreSQL Database",
    category: "Data & Warehouse",
    icon: "🐘",
    status: "AVAILABLE",
    authType: "API Key",
    desc: "Read-only SQL telemetry queries, order status lookups, customer records, and inventory.",
  },
  {
    id: "db.snowflake",
    name: "Snowflake Analytics",
    category: "Data & Warehouse",
    icon: "❄️",
    status: "AVAILABLE",
    authType: "API Key",
    desc: "Autonomous enterprise data analytics, CFO metrics, and executive KPI dashboard sync.",
  },
  {
    id: "protocol.mcp",
    name: "Remote MCP Server",
    category: "Universal Protocols",
    icon: "⚡",
    status: "AVAILABLE",
    authType: "Remote MCP",
    desc: "Connect any custom Model Context Protocol tool, local sidecar bridge, or private microservice.",
  },
];

const CATEGORIES = [
  "All",
  "Accounting & ERP",
  "CRM & Revenue",
  "Productivity",
  "Payments & Banking",
  "Support & Ops",
  "Data & Warehouse",
  "Universal Protocols",
];

export function EnterpriseConnectors() {
  const [connectors, setConnectors] = useState<ConnectorItem[]>(INITIAL_CONNECTORS);
  const [selectedCat, setSelectedCat] = useState("All");
  const [activeModal, setActiveModal] = useState<ConnectorItem | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");

  const filtered = selectedCat === "All"
    ? connectors
    : connectors.filter((c) => c.category === selectedCat);

  const connectedCount = connectors.filter((c) => c.status === "CONNECTED").length;

  function handleConnect(conn: ConnectorItem) {
    setIsVerifying(true);
    setTimeout(() => {
      setConnectors((prev) =>
        prev.map((c) => (c.id === conn.id ? { ...c, status: "CONNECTED" } : c))
      );
      setIsVerifying(false);
      setActiveModal(null);
      setApiKeyInput("");
    }, 800);
  }

  function handleDisconnect(connId: string) {
    setConnectors((prev) =>
      prev.map((c) => (c.id === connId ? { ...c, status: "AVAILABLE" } : c))
    );
    setActiveModal(null);
  }

  return (
    <section id="connectors" className="scroll-mt-24 space-y-6 pt-4">
      {/* Header matching Zara console style */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00D2FF]/15 border border-[#00D2FF]/30 text-base">
              🔌
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Enterprise Connectors</span>
              <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                Certified Toolsets
              </span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
            Everything your AI agents can communicate with — seamlessly authenticated through OAuth 2.0, Webhooks,
            or Model Context Protocol (MCP).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              <b>{connectors.length} Integrations</b> · {connectedCount > 0 ? `${connectedCount} Connected` : "All Systems Operational"}
            </span>
          </div>
        </div>
      </div>

      {/* Categories Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCat(cat)}
            className={`shrink-0 rounded-xl px-3 py-1.5 font-medium transition-all ${
              selectedCat === cat
                ? "bg-[#00D2FF] text-slate-950 font-bold shadow-[0_0_12px_rgba(0,210,255,0.3)]"
                : "border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Connectors Cards Grid matching Zara .connector-dashboard-grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((c) => {
          const isConnected = c.status === "CONNECTED";
          return (
            <div
              key={c.id}
              onClick={() => setActiveModal(c)}
              className={`group relative flex flex-col justify-between rounded-2xl border p-4 backdrop-blur-md transition-all duration-200 cursor-pointer hover:-translate-y-1 ${
                isConnected
                  ? "border-emerald-500/50 bg-emerald-950/20 shadow-[0_8px_24px_-8px_rgba(16,185,129,0.3)]"
                  : "border-[rgba(255,255,255,0.08)] bg-gradient-to-b from-[#111827]/90 to-[#0A101A]/95 hover:border-[#00D2FF]/50 hover:shadow-[0_8px_24px_-8px_rgba(0,210,255,0.2)]"
              }`}
            >
              <div className="space-y-3">
                {/* Top Row: Icon + Title + Status Pill */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-xl group-hover:scale-105 transition-transform">
                      {c.icon}
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#00D2FF] transition-colors truncate">
                        {c.name}
                      </h3>
                      <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.2 text-[9px] font-medium text-slate-400">
                        {c.category}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide flex items-center gap-1 ${
                      isConnected
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-white/5 text-slate-400 border border-white/10"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                      }`}
                    />
                    {isConnected ? "CONNECTED" : "AVAILABLE"}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {c.desc}
                </p>
              </div>

              {/* Bottom Affordance */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-500 font-mono">{c.authType}</span>
                <span className={`font-semibold flex items-center gap-1 ${isConnected ? "text-emerald-400" : "text-[#00D2FF] group-hover:translate-x-0.5 transition-transform"}`}>
                  <span>{isConnected ? "Configure" : "Connect"}</span>
                  <span aria-hidden>&rarr;</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Connector Auth Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl border border-[#00D2FF]/40 bg-gradient-to-b from-[#111c2a] to-[#0a111a] p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-2xl">
                  {activeModal.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{activeModal.name}</h3>
                  <span className="text-xs text-[#00D2FF] font-medium">{activeModal.category} · {activeModal.authType}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {activeModal.desc}
            </p>

            {activeModal.authType === "OAuth 2.0" ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs space-y-2 text-slate-300">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Protocol:</span>
                  <span className="font-mono text-white">OAuth 2.0 Bearer</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Scope:</span>
                  <span className="font-mono text-white">read_write, ledger_sync</span>
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  Clicking authorize will open the official vendor consent window. Credentials are cryptographically encrypted in your workspace enclave.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  API Token / Secret Key:
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={`Enter ${activeModal.name} live key...`}
                  className="w-full rounded-xl border border-white/10 bg-[#060c12] p-3 text-xs text-white placeholder-slate-500 focus:border-[#00D2FF] focus:outline-none"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {activeModal.status === "CONNECTED" ? (
                <button
                  type="button"
                  onClick={() => handleDisconnect(activeModal.id)}
                  className="flex-1 rounded-xl border border-rose-500/40 bg-rose-500/10 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition"
                >
                  Disconnect Integration
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConnect(activeModal)}
                  disabled={isVerifying}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-400 to-[#00D2FF] py-3 text-xs font-extrabold text-slate-950 hover:brightness-110 active:scale-95 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {isVerifying ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Verifying Handshake...</span>
                    </>
                  ) : (
                    <>
                      <span>Authorize & Connect</span>
                      <span aria-hidden>&rarr;</span>
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
