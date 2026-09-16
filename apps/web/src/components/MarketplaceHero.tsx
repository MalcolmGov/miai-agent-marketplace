"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/locale";

export function MarketplaceHero({
  familyCount,
  agentCount = 525,
  onSearch,
  onSelectFeature,
}: {
  familyCount: number;
  /** Indexed catalogue SKUs (102 families × 5 regions). */
  agentCount?: number;
  categoryCount?: number;
  workflowCount?: number;
  onSearch?: (term: string) => void;
  onSelectFeature?: (feature: "voice-studio" | "boardroom" | "suites" | "connectors" | "catalogue") => void;
}) {
  const router = useRouter();
  const [promptText, setPromptText] = useState("");
  const [selectedModel, setSelectedModel] = useState("Auto");

  const cards = [
    {
      featureId: "voice-studio" as const,
      tag: "Voice Studio Forge",
      tagColor: "bg-[#00D2FF]/15 text-[#00D2FF] border-[#00D2FF]/40",
      badge: "KILLER FEATURE",
      badgeColor: "bg-[#00D2FF] text-slate-950",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      ),
      title: "Voice Studio · Instant Agent Forge",
      desc: "Speak or describe any bottleneck — compiles custom AI agents in milliseconds ready to deploy.",
    },
    {
      featureId: "boardroom" as const,
      tag: "AI Boardroom",
      tagColor: "bg-purple-500/15 text-purple-300 border-purple-500/40",
      badge: "10-SEAT QUORUM",
      badgeColor: "bg-purple-400 text-slate-950",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <circle cx="12" cy="11" r="3" />
          <path d="m9 18 3-2 3 2" />
        </svg>
      ),
      title: "AI Executive Boardroom",
      desc: "Convene CFO, Legal, CISO & Ops for multi-agent consensus deliberation & contract interrogation.",
    },
    {
      featureId: "suites" as const,
      tag: "Agent Suites",
      tagColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
      badge: "5 BUNDLES",
      badgeColor: "bg-emerald-400 text-slate-950",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="14" rx="1" />
          <rect width="7" height="7" x="3" y="14" rx="1" />
        </svg>
      ),
      title: "Departmental Agent Suites",
      desc: "Pre-assembled ecosystems for Finance ($310k saved), Revenue ($480k pipe), Ops & Legal.",
    },
    {
      featureId: "connectors" as const,
      tag: "Connectors",
      tagColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
      badge: "14 INTEGRATIONS",
      badgeColor: "bg-cyan-400 text-slate-950",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M12 2v8M12 18v4M4.93 4.93l5.66 5.66M13.41 13.41l5.66 5.66" />
          <circle cx="12" cy="14" r="4" />
        </svg>
      ),
      title: "Zara-Grade Connectors Directory",
      desc: "OAuth 2.0 & MCP integrations for Xero, Sage, QuickBooks, HubSpot, Salesforce & Paystack.",
    },
  ];

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const term = promptText.trim();
    if (!term) return;
    if (onSearch) {
      onSearch(term);
    } else {
      router.push(`/agents?q=${encodeURIComponent(term)}`);
    }
  }

  function handleSelectCard(featureId: "voice-studio" | "boardroom" | "suites" | "connectors") {
    if (onSelectFeature) {
      onSelectFeature(featureId);
    } else {
      const el = document.getElementById(featureId);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <section className="relative overflow-hidden pt-6 pb-4 sm:pt-10 sm:pb-8">
      {/* Background ambient glow matching screenshot */}
      <div
        aria-hidden
        className="hero-sheen pointer-events-none absolute -inset-x-20 -top-20 h-96 opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 20%, color-mix(in srgb, var(--accent) 22%, transparent) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl text-center">
        {/* Signature headline */}
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
          AI Agent Marketplace
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)] sm:text-base">
          Browse 525+ enterprise AI agents across 102 industry families, flagship suites, and 5 global markets.
        </p>
        <Link
          href="/markets"
          className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--bg-elev)] px-3.5 py-1.5 text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-white transition-all"
        >
          🌍 See the five-market localization model →
        </Link>

        {/* 4 Premier Interactive Spotlight Cards */}
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 text-left">
          {cards.map((card) => (
            <button
              key={card.tag}
              type="button"
              onClick={() => handleSelectCard(card.featureId)}
              className="group flex flex-col justify-between rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-panel)_85%,transparent)] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--bg-elev)_70%,transparent)] hover:shadow-[0_8px_24px_-8px_rgba(46,196,182,0.3)] shadow-sm cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-xl border ${card.tagColor}`}>
                      {card.icon}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      {card.tag}
                    </span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </div>
                <h4 className="mt-2.5 text-sm font-bold text-white group-hover:text-[var(--accent)] transition-colors">
                  {card.title}
                </h4>
                <p className="mt-1 text-xs text-[var(--muted)] group-hover:text-slate-200 transition-colors line-clamp-2 leading-relaxed">
                  {card.desc}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] font-semibold text-[var(--accent)]">
                <span>Explore Feature</span>
                <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
              </div>
            </button>
          ))}
        </div>

        {/* Floating Bottom Prompt Bar matching app.myinstantai.com */}
        <form
          onSubmit={handleSubmit}
          className="mt-6 flex items-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--bg-panel)_90%,transparent)] p-2 shadow-lg backdrop-blur-xl transition-all focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)]"
        >
          {/* Quick tool icons on the left */}
          <div className="flex items-center gap-1 pl-1 text-[var(--muted)]">
            <button
              type="button"
              className="p-1.5 rounded-lg hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all"
              title="Attach document or file"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all"
              title="Web search mode"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all"
              title="Agent tool actions"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </button>
          </div>

          {/* Main prompt input */}
          <input
            type="text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Search 510 AI agents (e.g. Autonomous Shopping Agent, Dental, IT)..."
            className="flex-1 bg-transparent px-2.5 py-2 text-base sm:text-sm text-white placeholder-[var(--muted-dim)] focus:outline-none"
          />

          {/* Model picker & Send action */}
          <div className="flex items-center gap-1.5 pr-1">
            <button
              type="button"
              onClick={() => setSelectedModel(selectedModel === "Auto" ? "Agents" : "Auto")}
              className="hidden sm:flex items-center gap-1 rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.06)] px-2.5 py-1 text-xs font-medium text-[var(--muted)] hover:text-white transition-all touch-manipulation"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{selectedModel}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 opacity-60">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              type="submit"
              disabled={!promptText.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-slate-950 shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 touch-manipulation"
              aria-label="Send prompt"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </form>

        {/* Catalog Jump Link */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <a
            href="#catalogue"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.04)] px-4 py-1.5 text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-white transition-all"
          >
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            <span>Explore {agentCount} Enterprise AI Agents ({familyCount} Families)</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

export function MarketplaceCTA() {
  const t = useT();

  return (
    <section className="cta-banner rise" aria-label={t("cta.title")}>
      <div className="min-w-0 flex-1">
        <h2 className="display text-lg font-semibold tracking-tight text-[var(--text)] sm:text-xl">
          {t("cta.title")}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--card-body)]">{t("cta.body")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Link href="/create" className="btn btn-ghost !text-sm">
          {t("cta.describe")}
        </Link>
        <Link href="/request" className="btn btn-primary !text-sm">
          {t("cta.request")}
          <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
