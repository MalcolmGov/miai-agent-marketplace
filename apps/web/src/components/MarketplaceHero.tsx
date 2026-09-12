"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/locale";

export function MarketplaceHero({
  familyCount,
  agentCount = 500,
}: {
  familyCount: number;
  /** Indexed catalogue SKUs (100 families × 5 regions). */
  agentCount?: number;
  categoryCount?: number;
  workflowCount?: number;
}) {
  const router = useRouter();
  const [promptText, setPromptText] = useState("");
  const [selectedModel, setSelectedModel] = useState("Auto");

  const cards = [
    {
      tag: "Compare",
      tagColor: "bg-blue-500/15 text-blue-400 border-blue-500/25",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
          <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" />
        </svg>
      ),
      query: "React vs Vue vs Svelte in 2026",
    },
    {
      tag: "Research",
      tagColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
          <path d="M10 2v7.31M14 9.3V1.99M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0" strokeLinecap="round" />
        </svg>
      ),
      query: "Latest breakthroughs in AI agent architectures",
    },
    {
      tag: "Draft",
      tagColor: "bg-purple-500/15 text-purple-400 border-purple-500/25",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
      query: "Compelling B2B enterprise outreach email",
    },
    {
      tag: "Explain",
      tagColor: "bg-amber-500/15 text-amber-400 border-amber-500/25",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ),
      query: "How autonomous multi-agent systems delegate tasks",
    },
  ];

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!promptText.trim()) return;
    router.push(`/ask?q=${encodeURIComponent(promptText.trim())}`);
  }

  function handleSelectCard(query: string) {
    router.push(`/ask?q=${encodeURIComponent(query)}`);
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

      <div className="relative mx-auto max-w-3xl text-center">
        {/* Signature headline */}
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
          AI Agent Marketplace
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)] sm:text-base">
          Browse 500 enterprise AI agents across 100 industry families and 5 global markets.
        </p>

        {/* 4 Interactive Suggestion Cards */}
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 text-left">
          {cards.map((card) => (
            <button
              key={card.tag}
              type="button"
              onClick={() => handleSelectCard(card.query)}
              className="group flex flex-col justify-between rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-panel)_80%,transparent)] p-3.5 transition-all hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--bg-elev)_60%,transparent)] shadow-sm cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-lg border ${card.tagColor}`}>
                  {card.icon}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text)]">
                  {card.tag}
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--muted)] group-hover:text-white transition-colors truncate">
                {card.query}
              </p>
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
            placeholder="Ask anything..."
            className="flex-1 bg-transparent px-2 py-1.5 text-sm text-white placeholder-[var(--muted-dim)] focus:outline-none"
          />

          {/* Model picker & Send action */}
          <div className="flex items-center gap-1.5 pr-1">
            <button
              type="button"
              onClick={() => setSelectedModel(selectedModel === "Auto" ? "Agents" : "Auto")}
              className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.06)] px-2.5 py-1 text-xs font-medium text-[var(--muted)] hover:text-white transition-all"
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
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] text-slate-950 shadow-md transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              aria-label="Send prompt"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
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
