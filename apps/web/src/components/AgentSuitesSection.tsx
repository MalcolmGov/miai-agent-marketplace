"use client";

import { useState } from "react";

export interface AgentSuite {
  id: string;
  title: string;
  category: string;
  color: string;
  tagline: string;
  combinedRoi: string;
  bundlePrice: string;
  agents: Array<{ name: string; role: string; icon: string }>;
  connectors: string[];
  description: string;
}

const ENTERPRISE_SUITES: AgentSuite[] = [
  {
    id: "suite.finance",
    title: "Autonomous Finance & Accounting Suite",
    category: "Finance & Treasury",
    color: "#10B981",
    tagline: "End-to-end autonomous treasury, AP/AR, 3-way reconciliation, and CFO forecasting.",
    combinedRoi: "$310,000 / yr saved",
    bundlePrice: "$1,800 / mo",
    agents: [
      { name: "AI CFO", role: "Cash runway & variance forecasting", icon: "📊" },
      { name: "Accounts Payable Agent", role: "3-way PO matching & batch pay", icon: "🧾" },
      { name: "AR & Collections Agent", role: "Smart multi-channel recovery", icon: "💰" },
      { name: "Autonomous Invoice Processing", role: "Touchless OCR ledger posting", icon: "📁" },
    ],
    connectors: ["xero", "sage", "quickbooks", "paystack"],
    description: "Unifies every financial touchpoint into an automated, zero-error ledger pipeline with daily runway simulations and board reporting.",
  },
  {
    id: "suite.revenue",
    title: "Autonomous Revenue & Sales Suite",
    category: "Sales & Pipeline",
    color: "#3B82F6",
    tagline: "Autonomous prospecting, multi-channel outreach, instant qualification, and meeting scheduling.",
    combinedRoi: "$480,000 pipeline / mo",
    bundlePrice: "$2,200 / mo",
    agents: [
      { name: "Autonomous Sales Rep (SDR)", role: "Multi-channel outbound & enrichment", icon: "🎯" },
      { name: "Lead Qualifier & Deal Radar", role: "Instant 10-second qualification", icon: "⚡" },
      { name: "Contract Intelligence Copilot", role: "Deal terms & redline review", icon: "⚖️" },
      { name: "Customer Support Director", role: "Retention & upsell trigger", icon: "🎧" },
    ],
    connectors: ["hubspot", "salesforce", "google_workspace", "m365"],
    description: "Accelerates sales velocity by running multi-channel outbound campaigns, synchronizing CRM records in real-time, and redlining sales agreements.",
  },
  {
    id: "suite.operations",
    title: "Executive Operations & Governance Suite",
    category: "Executive Operations",
    color: "#A855F7",
    tagline: "Cross-department project tracking, AI board deliberation, and executive KPI intelligence.",
    combinedRoi: "54 hrs / wk saved",
    bundlePrice: "$1,950 / mo",
    agents: [
      { name: "Autonomous Chief of Staff", role: "Cross-functional orchestration", icon: "👑" },
      { name: "AI Executive Boardroom", role: "Multi-agent consensus war room", icon: "🏛️" },
      { name: "Business Intelligence Analyst", role: "Automated executive board decks", icon: "📈" },
    ],
    connectors: ["slack", "microsoft_teams", "jira", "snowflake"],
    description: "Empowers founders and executive teams with an autonomous operational layer that synthesizes departmental metrics, runs board debates, and keeps initiatives on track.",
  },
  {
    id: "suite.cx",
    title: "Omnichannel Customer Experience Suite",
    category: "Customer Support",
    color: "#EC4899",
    tagline: "24/7 multi-channel customer concierge, WhatsApp support, and ticket escalation management.",
    combinedRoi: "92% First-Contact Resolution",
    bundlePrice: "$1,400 / mo",
    agents: [
      { name: "Customer Support Operations Director", role: "Autonomous ticket routing", icon: "🎧" },
      { name: "WhatsApp Business Concierge", role: "Order status & instant FAQ", icon: "💬" },
      { name: "Feedback & CSAT Analyst", role: "Sentiment scoring & churn alarms", icon: "⭐" },
    ],
    connectors: ["zendesk", "whatsapp", "shopify", "stripe"],
    description: "Delivers instant, human-grade customer care across WhatsApp, email, and live chat with real-time Shopify order synchronization and refund validation.",
  },
  {
    id: "suite.legal",
    title: "Legal, Risk & Compliance Suite",
    category: "Legal & Risk",
    color: "#F59E0B",
    tagline: "Autonomous contract redlining, regulatory audit readiness, and vendor risk benchmarking.",
    combinedRoi: "75% Faster Contract Review",
    bundlePrice: "$1,650 / mo",
    agents: [
      { name: "Contract Intelligence Copilot", role: "Risk clause detection & redlines", icon: "⚖️" },
      { name: "Regulatory Compliance Sentinel", role: "POPIA, GDPR & SEC checks", icon: "📋" },
      { name: "Procurement & Vendor Intelligence", role: "Vendor counterparty audits", icon: "📦" },
    ],
    connectors: ["docusign", "remote_mcp", "email", "postgresql"],
    description: "Protects institutional integrity by cross-referencing agreements against company policy standards, verifying regulatory compliance, and monitoring vendor risk.",
  },
];

export function AgentSuitesSection() {
  const [selectedSuite, setSelectedSuite] = useState<AgentSuite | null>(null);
  const [deployedSuites, setDeployedSuites] = useState<Set<string>>(new Set());

  function handleDeploy(suiteId: string) {
    setDeployedSuites((prev) => new Set(prev).add(suiteId));
    setSelectedSuite(null);
  }

  return (
    <section id="suites" className="scroll-mt-24 space-y-6 pt-4">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#10B981] shadow-[0_0_10px_#10B981]" />
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Enterprise Agent Suites</span>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                Complete Business Bundles
              </span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
            Pre-assembled multi-agent ecosystems designed to automate entire business departments.
            Pre-wired with certified ERP, CRM, and communication toolsets for 1-click deployment.
          </p>
        </div>
      </div>

      {/* Suites Cards Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {ENTERPRISE_SUITES.map((suite) => {
          const isDeployed = deployedSuites.has(suite.id);
          return (
            <div
              key={suite.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-[rgba(255,255,255,0.08)] bg-gradient-to-b from-[#111827]/90 to-[#0A101A]/95 p-5 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-[#00D2FF]/50 hover:shadow-[0_12px_32px_-10px_rgba(0,210,255,0.2)]"
            >
              <div className="space-y-4">
                {/* Header: Category + Combined ROI */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${suite.color}20`,
                      color: suite.color,
                      border: `1px solid ${suite.color}40`,
                    }}
                  >
                    {suite.category}
                  </span>
                  <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    {suite.combinedRoi}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-[#00D2FF] transition-colors">
                    {suite.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                    {suite.tagline}
                  </p>
                </div>

                {/* Member Agents List */}
                <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Included Agents ({suite.agents.length})</span>
                    <span className="text-[#00D2FF]">Synchronized</span>
                  </div>
                  <div className="space-y-1.5">
                    {suite.agents.map((ag) => (
                      <div key={ag.name} className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="text-sm">{ag.icon}</span>
                        <span className="font-semibold text-white">{ag.name}</span>
                        <span className="text-[10px] text-slate-400 truncate">· {ag.role}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pre-wired connectors strip */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Connectors:</span>
                  {suite.connectors.map((conn) => (
                    <span
                      key={conn}
                      className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[10px] font-mono text-slate-300"
                    >
                      {conn}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Actions: Price + Deploy */}
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block">Bundle Price</span>
                  <span className="text-xs font-bold text-white">{suite.bundlePrice}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSuite(suite)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
                  >
                    Details
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeploy(suite.id)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm ${
                      isDeployed
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-gradient-to-r from-emerald-400 to-[#00D2FF] text-slate-950 hover:brightness-110 active:scale-95"
                    }`}
                  >
                    {isDeployed ? "✓ Suite Active" : "Deploy Suite →"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Suite Details Modal */}
      {selectedSuite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-xl rounded-3xl border border-[#00D2FF]/30 bg-gradient-to-b from-[#111c2a] to-[#0a111a] p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#00D2FF]">
                  {selectedSuite.category} · Enterprise Suite
                </span>
                <h3 className="text-xl font-extrabold text-white mt-0.5">{selectedSuite.title}</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{selectedSuite.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSuite(null)}
                className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-white/10">
                <span className="text-slate-400">Combined ROI Impact:</span>
                <span className="font-bold text-emerald-400">{selectedSuite.combinedRoi}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Bundle Pricing:</span>
                <span className="font-bold text-white">{selectedSuite.bundlePrice}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Synchronized Agents in Bundle
              </span>
              <div className="space-y-2">
                {selectedSuite.agents.map((ag) => (
                  <div
                    key={ag.name}
                    className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/5 p-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{ag.icon}</span>
                      <div>
                        <div className="font-bold text-white">{ag.name}</div>
                        <div className="text-[11px] text-slate-400">{ag.role}</div>
                      </div>
                    </div>
                    <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">
                      Pre-Wired
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleDeploy(selectedSuite.id)}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-400 to-[#00D2FF] py-3 text-xs font-extrabold text-slate-950 hover:brightness-110 transition"
              >
                Deploy Complete Suite to Workspace &rarr;
              </button>
              <button
                type="button"
                onClick={() => setSelectedSuite(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-white hover:bg-white/10 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
