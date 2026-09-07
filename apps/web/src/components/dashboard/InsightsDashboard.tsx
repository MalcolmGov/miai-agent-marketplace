"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AreaChart, HBarChart, formatCompact, formatUsd } from "@/components/dashboard/Charts";

export type InsightsPayload = {
  period: string;
  source: "live" | "empty";
  kpis: {
    conversations: number;
    conversationsDeltaPct: number | null;
    autoResolvedPct: number | null;
    leadsCaptured: number;
    avgFirstResponseSec: number | null;
    tokensUsed: number;
    spendUsd: number;
    estSavingsUsd: number;
    assumedCostPerDeflectionUsd: number;
  };
  conversationSeries: Array<{ day: string; count: number }>;
  tokenSeries: Array<{ day: string; tokens: number }>;
  channels: Array<{ id: string; label: string; pct: number }>;
  topQuestions: Array<{ q: string; count: number }>;
  byAgent: Array<{
    agentId: string;
    name: string;
    status: { label: string; tone: "live" | "warn" | "muted" };
    conversations: number;
    resolvedPct: number | null;
    leads: number;
    tokens: number;
    spend: number;
  }>;
};

function statusChip(tone: "live" | "warn" | "muted", label: string) {
  if (tone === "live") {
    return (
      <span className="chip chip-live !py-0.5 !text-[10px] font-semibold">
        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        {label}
      </span>
    );
  }
  if (tone === "warn") {
    return (
      <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
        ● {label}
      </span>
    );
  }
  return (
    <span className="chip !py-0.5 !text-[10px] font-medium text-[var(--muted-dim)]">
      ● {label}
    </span>
  );
}

function IconRefresh({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 21v-5h-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTrendUp({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17 6 23 6 23 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTrendDown({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17 18 23 18 23 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InsightsDashboard({
  showHeader = true,
  onNavigateToFleet,
}: {
  showHeader?: boolean;
  onNavigateToFleet?: () => void;
}) {
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  function loadInsights() {
    setRefreshing(true);
    fetch("/api/insights")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
        setRefreshing(false);
      })
      .catch(() => {
        setData(null);
        setLoading(false);
        setRefreshing(false);
      });
  }

  useEffect(() => {
    loadInsights();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading workspace insights">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="panel space-y-2 rounded-2xl p-4">
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-7 w-2/3" />
              <div className="skeleton h-2 w-3/4" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="panel space-y-3 rounded-2xl p-5">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-48 w-full rounded-xl" />
          </div>
          <div className="panel space-y-3 rounded-2xl p-5">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const k = data.kpis;
  const maxQ = Math.max(...data.topQuestions.map((q) => q.count), 1);
  const tokensLabel =
    k.tokensUsed >= 1_000_000
      ? `${(k.tokensUsed / 1_000_000).toFixed(2)}M`
      : formatCompact(k.tokensUsed);

  const totalConvos = data.conversationSeries.reduce((acc, s) => acc + s.count, 0);
  const totalTokensInSeries = data.tokenSeries.reduce((acc, s) => acc + s.tokens, 0);

  return (
    <div className="space-y-7">
      {/* Optional Top Header */}
      {showHeader ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="display text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
                Fleet Insights &amp; Analytics
              </h1>
              <span className="chip chip-live !py-0.5 !text-[10px] font-semibold">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                Live Telemetry
              </span>
            </div>
            <p className="mt-1.5 text-sm text-[var(--muted)]">
              Real-time operational intelligence across conversations, automated resolutions, token economics, and multi-channel usage.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={loadInsights}
              disabled={refreshing}
              className="btn btn-ghost inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-white"
              title="Refresh live metrics"
            >
              <IconRefresh className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-[var(--accent-bright)]" : ""}`} />
              <span>Refresh</span>
            </button>
            <Link href="/history" className="btn btn-ghost text-xs">
              Audit History
            </Link>
            {onNavigateToFleet ? (
              <button type="button" onClick={onNavigateToFleet} className="btn btn-primary text-xs">
                View Fleet
              </button>
            ) : (
              <Link href="/my-agents" className="btn btn-primary text-xs">
                My Agents
              </Link>
            )}
          </div>
        </div>
      ) : null}

      {/* 6 Executive KPI Metric Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Card 1: Conversations */}
        <div className="panel relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--accent)_45%,var(--line))] p-4 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.6)]">
          <div className="card-specular-rim" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-dim)]">
              Conversations
            </span>
            <span className="pulse-dot h-2 w-2 rounded-full bg-[var(--accent)]" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-white tabular-nums">
            {k.conversations.toLocaleString()}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px]">
            {k.conversationsDeltaPct !== null ? (
              <span
                className={`inline-flex items-center gap-0.5 font-semibold ${
                  k.conversationsDeltaPct >= 0 ? "text-[var(--accent-bright)]" : "text-amber-400"
                }`}
              >
                {k.conversationsDeltaPct >= 0 ? (
                  <IconTrendUp className="h-3 w-3" />
                ) : (
                  <IconTrendDown className="h-3 w-3" />
                )}
                {k.conversationsDeltaPct >= 0 ? "+" : ""}
                {k.conversationsDeltaPct}%
              </span>
            ) : (
              <span className="text-[var(--muted-dim)]">Active baseline</span>
            )}
            <span className="text-[var(--muted-dim)] truncate">vs last period</span>
          </div>
        </div>

        {/* Card 2: Auto-Resolved */}
        <div className="panel relative overflow-hidden rounded-2xl border border-[var(--line)] p-4 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.6)]">
          <div className="card-specular-rim" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-dim)]">
              Auto-Resolved
            </span>
            <span className="rounded-full bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] px-1.5 py-0.2 text-[9px] font-semibold text-[var(--accent-bright)]">
              Deflected
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--accent-bright)] tabular-nums">
            {k.autoResolvedPct == null ? "—" : `${k.autoResolvedPct}%`}
          </p>
          <p className="mt-1 text-[11px] text-[var(--muted-dim)]">
            {k.autoResolvedPct == null ? "Awaiting turn volume" : "Zero human handoff required"}
          </p>
        </div>

        {/* Card 3: Leads & Handoffs */}
        <div className="panel relative overflow-hidden rounded-2xl border border-[var(--line)] p-4 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.6)]">
          <div className="card-specular-rim" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-dim)]">
              Leads / Handoffs
            </span>
            <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[9px] font-semibold text-[var(--muted)]">
              Audit
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-white tabular-nums">
            {k.leadsCaptured}
          </p>
          <p className="mt-1 text-[11px] text-[var(--muted-dim)]">
            Flagged in turn transcripts
          </p>
        </div>

        {/* Card 4: Tokens Used */}
        <div className="panel relative overflow-hidden rounded-2xl border border-[var(--line)] p-4 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.6)]">
          <div className="card-specular-rim" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-dim)]">
              Tokens Consumed
            </span>
            <span className="rounded-full bg-[var(--bg-elev)] px-1.5 py-0.2 text-[9px] font-medium text-[var(--muted-dim)]">
              Compute
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-white tabular-nums">
            {tokensLabel}
          </p>
          <p className="mt-1 text-[11px] text-[var(--muted-dim)]">
            Prompt + completion tokens
          </p>
        </div>

        {/* Card 5: Spend on Tokens */}
        <div className="panel relative overflow-hidden rounded-2xl border border-[var(--line)] p-4 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.6)]">
          <div className="card-specular-rim" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-dim)]">
              Token Spend
            </span>
            <span className="rounded-full bg-[var(--bg-elev)] px-1.5 py-0.2 text-[9px] font-medium text-[var(--muted-dim)]">
              Metered
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-white tabular-nums">
            {formatUsd(k.spendUsd)}
          </p>
          <p className="mt-1 text-[11px] text-[var(--muted-dim)]">
            Display economics (model fees)
          </p>
        </div>

        {/* Card 6: Estimated Savings */}
        <div className="panel relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--accent)_55%,var(--line))] bg-gradient-to-br from-[color-mix(in_srgb,var(--accent)_12%,var(--bg-panel))] to-[var(--bg-elev)] p-4 shadow-[0_0_24px_-4px_color-mix(in_srgb,var(--accent)_22%,transparent)]">
          <div className="card-specular-rim" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent-bright)]">
              Est. Cost Savings
            </span>
            <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.2 text-[9px] font-bold text-[var(--accent-ink)]">
              ROI
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--accent-bright)] tabular-nums">
            {formatUsd(k.estSavingsUsd ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-white/80 font-medium">
            Based on ${k.assumedCostPerDeflectionUsd ?? 8}/deflection
          </p>
        </div>
      </div>

      {/* Dual Interactive Trend Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Chart 1: Conversations Trend */}
        <div className="panel relative overflow-hidden rounded-2xl border border-[var(--line)] p-5 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.5)]">
          <div className="card-specular-rim" />
          <div className="mb-3 flex items-baseline justify-between gap-2 border-b border-[var(--line)] pb-3">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Conversation Volume</h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">Rolling 14-day customer interactions</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-white tabular-nums">
                {totalConvos.toLocaleString()}
              </span>
              <span className="block text-[10px] text-[var(--muted-dim)]">total turns</span>
            </div>
          </div>
          <div className="h-[210px] pt-2">
            <AreaChart
              ariaLabel="Conversations trend, last 14 days"
              points={data.conversationSeries.map((s) => ({ value: s.count, label: s.day }))}
            />
          </div>
        </div>

        {/* Chart 2: Tokens Trend */}
        <div className="panel relative overflow-hidden rounded-2xl border border-[var(--line)] p-5 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.5)]">
          <div className="card-specular-rim" />
          <div className="mb-3 flex items-baseline justify-between gap-2 border-b border-[var(--line)] pb-3">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Token Consumption</h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">Rolling 14-day token throughput</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-white tabular-nums">
                {formatCompact(totalTokensInSeries)}
              </span>
              <span className="block text-[10px] text-[var(--muted-dim)]">tokens logged</span>
            </div>
          </div>
          <div className="h-[210px] pt-2">
            <AreaChart
              ariaLabel="Token usage trend, last 14 days"
              points={(data.tokenSeries ?? []).map((s) => ({ value: s.tokens, label: s.day }))}
            />
          </div>
        </div>
      </div>

      {/* Multi-Channel Distribution & Top User Queries */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Channel Breakdown */}
        <div className="panel relative overflow-hidden rounded-2xl border border-[var(--line)] p-5 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.5)]">
          <div className="card-specular-rim" />
          <div className="mb-4 border-b border-[var(--line)] pb-3">
            <h2 className="text-sm font-bold text-white tracking-tight">Channel Distribution</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">Turn volume by client interface</p>
          </div>
          {data.channels.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--muted)]">
              No multi-channel volume recorded yet this period.
            </div>
          ) : (
            <HBarChart rows={data.channels.map((c) => ({ label: c.label, pct: c.pct }))} />
          )}
        </div>

        {/* Top Questions */}
        <div className="panel relative overflow-hidden rounded-2xl border border-[var(--line)] p-5 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.5)] lg:col-span-2">
          <div className="card-specular-rim" />
          <div className="mb-4 flex items-baseline justify-between border-b border-[var(--line)] pb-3">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Top Customer Inquiries</h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">Most frequent topics &amp; questions across agents</p>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-dim)]">
              Turn Frequency
            </span>
          </div>

          {data.topQuestions.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--muted)]">
              Topic clustering will populate as conversation volume increases. Check{" "}
              <Link href="/history" className="text-[var(--accent-bright)] hover:underline">
                Audit History
              </Link>{" "}
              for granular logs.
            </div>
          ) : (
            <ul className="space-y-3">
              {data.topQuestions.map((q) => (
                <li key={q.q} className="group">
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-white/90 group-hover:text-[var(--accent-bright)] transition-colors truncate">
                      {q.q}
                    </span>
                    <span className="shrink-0 rounded-md bg-[var(--bg-elev)] px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--accent-bright)]">
                      {q.count} turns
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elev)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-bright)] transition-all duration-500"
                      style={{ width: `${(q.count / maxQ) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Fleet Performance Table by Agent */}
      <div className="panel relative overflow-hidden rounded-2xl border border-[var(--line)] shadow-[0_4px_24px_-10px_rgba(0,0,0,0.5)]">
        <div className="card-specular-rim" />
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Agent Performance Leaderboard</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">Per-unit conversations, resolution efficiency, and token economics</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-dim)]">
            Workspace Metering
          </span>
        </div>

        {data.byAgent.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-[var(--muted)]">
            Rent an agent and initiate conversations to view per-agent performance benchmarks.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-elev)_60%,transparent)] text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted-dim)]">
                  <th className="px-5 py-3.5">Agent Unit</th>
                  <th className="px-3 py-3.5">Status</th>
                  <th className="px-3 py-3.5 text-right">Conversations</th>
                  <th className="px-3 py-3.5 text-right">Resolution Rate</th>
                  <th className="px-3 py-3.5 text-right">Leads</th>
                  <th className="px-3 py-3.5 text-right">Tokens Used</th>
                  <th className="px-3 py-3.5 text-right">Spend</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {data.byAgent.map((a) => (
                  <tr
                    key={a.agentId}
                    className="hover:bg-[var(--bg-panel-hover)]/70 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/agents/${a.agentId}`}
                        className="font-semibold text-white hover:text-[var(--accent-bright)] transition-colors"
                      >
                        {a.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3.5">{statusChip(a.status.tone, a.status.label)}</td>
                    <td className="px-3 py-3.5 text-right font-mono font-medium tabular-nums text-white">
                      {a.conversations.toLocaleString()}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-medium tabular-nums text-[var(--accent-bright)]">
                      {a.resolvedPct == null ? "—" : `${a.resolvedPct}%`}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-medium tabular-nums text-white">
                      {a.leads}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-xs tabular-nums text-[var(--muted)]">
                      {a.tokens >= 1000 ? `${Math.round(a.tokens / 1000)}k` : a.tokens}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-medium tabular-nums text-white">
                      {formatUsd(a.spend)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/agents/${a.agentId}`}
                        className="btn btn-ghost !py-1 !px-2.5 text-xs text-[var(--accent-bright)] hover:text-white"
                      >
                        Studio →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
