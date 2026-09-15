"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function MyInstantAIDashboard({ tokenBalance = 11716 }: { tokenBalance?: number }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/ask?q=${encodeURIComponent(searchQuery.trim())}&search=true`);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 pt-2 px-1 sm:px-2">
      {/* Welcome Banner */}
      <section
        className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 sm:p-8"
        style={{
          background:
            "radial-gradient(circle at 85% 25%, rgba(46, 196, 182, 0.18), transparent 55%), linear-gradient(180deg, #121924 0%, #0d131d 100%)",
        }}
      >
        <div className="relative z-10 max-w-2xl space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Welcome <span className="text-[#2ec4b6]">back</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 font-normal">
            Your AI command center — chat, search, automate, learn.
          </p>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-2">
            <Link
              href="/ask"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2ec4b6] px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 shadow-sm transition hover:brightness-110 active:scale-95 touch-manipulation min-h-[40px]"
            >
              Ask AI
            </Link>

            <Link
              href="/ask?search=true"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2ec4b6]/40 bg-[#2ec4b6]/10 px-4 py-2.5 text-xs sm:text-sm font-medium text-[#2ec4b6] transition hover:bg-[#2ec4b6]/20 active:scale-95 touch-manipulation min-h-[40px]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              <span>AI Search</span>
            </Link>

            <Link
              href="/learn"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2ec4b6]/40 bg-[#2ec4b6]/10 px-4 py-2.5 text-xs sm:text-sm font-medium text-[#2ec4b6] transition hover:bg-[#2ec4b6]/20 active:scale-95 touch-manipulation min-h-[40px]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span>Learn</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 4 Metric / Stat Cards — 2x2 on phones, 4 cols on desktop */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Token Balance */}
        <Link
          href="/tokens"
          className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#121924]/80 p-3.5 sm:p-5 backdrop-blur-sm transition hover:border-[#2ec4b6]/40 hover:bg-[#121924] active:scale-[0.98] touch-manipulation"
        >
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            TOKEN BALANCE
          </span>
          <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
            {tokenBalance.toLocaleString()}
          </div>
        </Link>

        {/* Lessons Complete */}
        <Link
          href="/learn"
          className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#121924]/80 p-3.5 sm:p-5 backdrop-blur-sm transition hover:border-[#2ec4b6]/40 hover:bg-[#121924] active:scale-[0.98] touch-manipulation"
        >
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            LESSONS COMPLETE
          </span>
          <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
            2/54
          </div>
          <p className="mt-1 text-[11px] sm:text-xs text-slate-400 truncate">4% complete</p>
        </Link>

        {/* Questions Today */}
        <Link
          href="/ask"
          className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#121924]/80 p-3.5 sm:p-5 backdrop-blur-sm transition hover:border-[#2ec4b6]/40 hover:bg-[#121924] active:scale-[0.98] touch-manipulation"
        >
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            QUESTIONS TODAY
          </span>
          <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
            0
          </div>
          <p className="mt-1 text-[11px] sm:text-xs text-[#2ec4b6] truncate">No questions yet</p>
        </Link>

        {/* Models Used */}
        <Link
          href="/ask"
          className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#121924]/80 p-3.5 sm:p-5 backdrop-blur-sm transition hover:border-[#2ec4b6]/40 hover:bg-[#121924] active:scale-[0.98] touch-manipulation"
        >
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            MODELS USED
          </span>
          <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
            0
          </div>
          <p className="mt-1 text-[11px] sm:text-xs text-[#2ec4b6] truncate">No models used yet</p>
        </Link>
      </section>

      {/* AI Search Card */}
      <section className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#121924]/80 p-5 sm:p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 text-[#2ec4b6] border border-white/5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">AI Search</h2>
              <p className="text-xs text-slate-400">
                Answers grounded in real-time web results
              </p>
            </div>
          </div>

          <Link
            href="/ask?search=true"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-[#2ec4b6]"
          >
            <span>Open Search</span>
            <span aria-hidden>&gt;</span>
          </Link>
        </div>

        <form onSubmit={handleSearchSubmit} className="mt-4">
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3.5 text-slate-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search the web with AI..."
              className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0d131d] py-3.5 pl-10 pr-14 text-base sm:text-sm text-white placeholder-slate-500 transition focus:border-[#2ec4b6] focus:outline-none focus:ring-1 focus:ring-[#2ec4b6]"
            />
            <button
              type="submit"
              disabled={!searchQuery.trim()}
              className="absolute right-2 flex h-9 w-9 items-center justify-center rounded-lg bg-[#2ec4b6] text-slate-950 transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:hover:brightness-100 touch-manipulation"
              aria-label="Submit search"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </form>
      </section>

      {/* What can you do? */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-white">What can you do?</h2>
          <span className="text-xs text-slate-500">3 features available</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
          {/* Ask AI */}
          <Link
            href="/ask"
            className="group rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#121924]/80 p-4 sm:p-5 backdrop-blur-sm transition hover:border-[#2ec4b6]/40 hover:bg-[#121924] active:scale-[0.98] touch-manipulation"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80 text-[#2ec4b6] border border-white/5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-slate-500 transition group-hover:text-[#2ec4b6] group-hover:translate-x-0.5" aria-hidden>&gt;</span>
            </div>
            <h3 className="mt-3 sm:mt-4 text-sm font-semibold text-white">Ask AI</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Chat with frontier models — GPT-4o, Claude, Gemini and more
            </p>
          </Link>

          {/* AI Search */}
          <Link
            href="/ask?search=true"
            className="group rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#121924]/80 p-4 sm:p-5 backdrop-blur-sm transition hover:border-[#2ec4b6]/40 hover:bg-[#121924] active:scale-[0.98] touch-manipulation"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80 text-[#2ec4b6] border border-white/5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-slate-500 transition group-hover:text-[#2ec4b6] group-hover:translate-x-0.5" aria-hidden>&gt;</span>
            </div>
            <h3 className="mt-3 sm:mt-4 text-sm font-semibold text-white">AI Search</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Get answers grounded in real-time web results
            </p>
          </Link>

          {/* Learn & Earn */}
          <Link
            href="/learn"
            className="group rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#121924]/80 p-4 sm:p-5 backdrop-blur-sm transition hover:border-[#2ec4b6]/40 hover:bg-[#121924] active:scale-[0.98] touch-manipulation"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80 text-[#2ec4b6] border border-white/5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <span className="text-slate-500 transition group-hover:text-[#2ec4b6] group-hover:translate-x-0.5" aria-hidden>&gt;</span>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-white">Learn & Earn</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Complete lessons and earn tokens as you grow
            </p>
          </Link>
        </div>
      </section>

      {/* Zara Autonomous Flagship Suite & Executive Workspaces */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#00D2FF] shadow-[0_0_8px_#00D2FF]" />
              <h2 className="text-sm sm:text-base font-semibold text-white">
                Enterprise Autonomous Agents & Executive Suites
              </h2>
              <span className="rounded-full bg-[#00D2FF]/10 border border-[#00D2FF]/30 px-2 py-0.2 text-[10px] font-bold text-[#00D2FF]">
                Zara Partner Suite
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Production-grade AI agents pre-configured with certified financial, ERP, and communication tools.
            </p>
          </div>

          <Link
            href="/agents"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#00D2FF] hover:underline"
          >
            <span>View all 10 Flagship Agents</span>
            <span aria-hidden>&rarr;</span>
          </Link>
        </div>

        {/* Executive Workspaces: Voice Studio & AI Boardroom */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {/* Voice Studio · Instant Agent Forge */}
          <Link
            href="/agents"
            className="group relative overflow-hidden rounded-2xl border border-[rgba(0,210,255,0.3)] bg-gradient-to-br from-[#0c1f2d] via-[#091520] to-[#070e17] p-5 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-[#00D2FF]/70 hover:shadow-[0_8px_28px_-8px_rgba(0,210,255,0.4)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00D2FF]/15 text-[#00D2FF] border border-[#00D2FF]/40 shadow-[0_0_12px_rgba(0,210,255,0.3)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </div>
              <span className="rounded-full bg-gradient-to-r from-[#00D2FF] to-emerald-400 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-950 shadow-sm">
                KILLER FEATURE · ZERO-CODE FORGE
              </span>
            </div>
            <h3 className="mt-3.5 text-base font-bold text-white group-hover:text-[#00D2FF] transition-colors flex items-center gap-2">
              <span>Voice Studio · Instant Agent Forge</span>
            </h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Speak or describe any business bottleneck — compiles a custom, production-ready AI agent in milliseconds for you to configure and deploy.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#00D2FF]">
              <span>Forge Custom Agent in Milliseconds</span>
              <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
            </div>
          </Link>

          {/* AI Boardroom */}
          <Link
            href="/agents#boardroom"
            className="group relative overflow-hidden rounded-2xl border border-[rgba(124,58,237,0.25)] bg-gradient-to-br from-[#160d2e] via-[#0d091e] to-[#070512] p-5 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-400/60 hover:shadow-[0_8px_24px_-8px_rgba(124,58,237,0.3)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <circle cx="12" cy="11" r="3" />
                  <path d="m9 18 3-2 3 2" />
                </svg>
              </div>
              <span className="rounded-full bg-purple-400 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-950">
                Multi-Agent Consensus
              </span>
            </div>
            <h3 className="mt-3.5 text-base font-bold text-white group-hover:text-purple-400 transition-colors">
              AI Executive Boardroom
            </h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Convene CFO, Legal, CISO, and Ops agents to debate strategic decisions, interrogate contracts, and reach unanimous verdicts.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-purple-400">
              <span>Convene the Board</span>
              <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
            </div>
          </Link>
        </div>

        {/* 4 Flagship Agent Quick-Launch Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/catalogue/financial-reporting"
            className="group rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#121924]/80 p-4 backdrop-blur-sm transition hover:border-[#00D2FF]/40 hover:bg-[#121924] active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#00D2FF] uppercase tracking-wider">
                FINANCE & CASH
              </span>
              <span className="rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.2">
                $180k/yr saved
              </span>
            </div>
            <h4 className="mt-2.5 text-sm font-semibold text-white group-hover:text-[#00D2FF] transition-colors">
              Autonomous AI CFO
            </h4>
            <p className="mt-1 text-xs text-slate-400 line-clamp-2">
              Continuous runway forecasting, variance analysis & cash flow automation.
            </p>
          </Link>

          <Link
            href="/catalogue/invoicing"
            className="group rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#121924]/80 p-4 backdrop-blur-sm transition hover:border-[#00D2FF]/40 hover:bg-[#121924] active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                ACCOUNTS PAYABLE
              </span>
              <span className="rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.2">
                $65k/yr saved
              </span>
            </div>
            <h4 className="mt-2.5 text-sm font-semibold text-white group-hover:text-amber-400 transition-colors">
              Accounts Payable Specialist
            </h4>
            <p className="mt-1 text-xs text-slate-400 line-clamp-2">
              3-way PO matching, ERP batch posting, and fraud anomaly detection.
            </p>
          </Link>

          <Link
            href="/catalogue/cold-email-lead-gen"
            className="group rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#121924]/80 p-4 backdrop-blur-sm transition hover:border-[#00D2FF]/40 hover:bg-[#121924] active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                SALES & REVENUE
              </span>
              <span className="rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.2">
                $240k pipe/mo
              </span>
            </div>
            <h4 className="mt-2.5 text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
              Autonomous Sales Rep (SDR)
            </h4>
            <p className="mt-1 text-xs text-slate-400 line-clamp-2">
              Multi-channel prospecting, dynamic pricing, and automatic CRM synchronization.
            </p>
          </Link>

          <Link
            href="/catalogue/executive-assistant"
            className="group rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#121924]/80 p-4 backdrop-blur-sm transition hover:border-[#00D2FF]/40 hover:bg-[#121924] active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                OPERATIONS
              </span>
              <span className="rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.2">
                32 hrs/wk saved
              </span>
            </div>
            <h4 className="mt-2.5 text-sm font-semibold text-white group-hover:text-purple-400 transition-colors">
              Autonomous Chief of Staff
            </h4>
            <p className="mt-1 text-xs text-slate-400 line-clamp-2">
              Cross-functional project tracking, executive briefing, and task orchestration.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
