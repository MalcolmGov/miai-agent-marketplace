"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AreaChart, HBarChart, formatCompact, formatUsd } from "@/components/dashboard/Charts";

type InsightsPayload = {
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
  if (tone === "live") return <span className="chip chip-live">● {label}</span>;
  if (tone === "warn")
    return (
      <span className="chip" style={{ color: "#f0b429", borderColor: "rgba(240,180,41,0.45)" }}>
        ● {label}
      </span>
    );
  return <span className="chip">● {label}</span>;
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsPayload | null>(null);

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading insights">
        <div>
          <div className="skeleton h-7 w-48 mb-2" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel space-y-2 p-4">
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-7 w-2/3" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="panel space-y-3 p-5">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-48 w-full" />
          </div>
          <div className="panel space-y-3 p-5">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-48 w-full" />
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

  const deltaSub =
    k.conversationsDeltaPct == null ? (
      "this month · from live turns"
    ) : (
      <span className="text-[var(--accent-bright)]">
        {k.conversationsDeltaPct >= 0 ? "+" : ""}
        {k.conversationsDeltaPct}% vs last month
      </span>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Insights</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            How your live agents are performing this month — conversations, resolutions, leads and
            cost. Metered from this workspace only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data.source === "live" ? (
            <span className="chip chip-live">Live data</span>
          ) : (
            <span className="chip">Awaiting volume</span>
          )}
          <Link href="/history" className="btn btn-ghost">
            History
          </Link>
          <Link href="/ops" className="btn btn-ghost">
            Live Ops
          </Link>
          <Link href="/workspace" className="btn btn-ghost">
            Workspace
          </Link>
          <Link href="/my-agents" className="btn btn-ghost">
            My Agents
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {[
          {
            label: "Conversations",
            value: k.conversations.toLocaleString(),
            sub: deltaSub,
            glow: true,
          },
          {
            label: "Auto-resolved",
            value: k.autoResolvedPct == null ? "—" : `${k.autoResolvedPct}%`,
            sub: k.autoResolvedPct == null ? "needs conversation volume" : "no human handoff",
          },
          {
            label: "Leads / handoffs",
            value: String(k.leadsCaptured),
            sub: "flagged in turn audit",
          },
          {
            label: "Tokens used",
            value: tokensLabel,
            sub: "this month · audit + transcripts",
          },
          {
            label: "Spend on tokens",
            value: formatUsd(k.spendUsd),
            sub: "display economics · not invoice",
          },
          {
            label: "Est. savings",
            value: formatUsd(k.estSavingsUsd ?? 0),
            sub: `estimate · $${k.assumedCostPerDeflectionUsd ?? 8}/deflection`,
            glow: true,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="panel p-4"
            style={
              card.glow
                ? {
                    borderColor: "color-mix(in srgb, var(--accent) 55%, var(--line))",
                    boxShadow:
                      "0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent), 0 12px 32px -20px rgba(61,214,198,0.35)",
                  }
                : undefined
            }
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              {card.label}
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-[var(--accent-bright)]">
              {card.value}
            </div>
            <div className="mt-1 text-xs text-[var(--muted)]">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">Conversations</h2>
            <span className="text-xs text-[var(--muted)]">last 14 days</span>
          </div>
          <div className="h-[220px]">
            <AreaChart
              ariaLabel="Conversations trend, last 14 days"
              points={data.conversationSeries.map((s) => ({ value: s.count, label: s.day }))}
            />
          </div>
        </div>
        <div className="panel p-5">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">Tokens</h2>
            <span className="text-xs text-[var(--muted)]">last 14 days</span>
          </div>
          <div className="h-[220px]">
            <AreaChart
              ariaLabel="Token usage trend, last 14 days"
              points={(data.tokenSeries ?? []).map((s) => ({ value: s.tokens, label: s.day }))}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5">
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">Where conversations happen</h2>
          </div>
          <p className="mb-4 text-xs text-[var(--muted)]">by turn channel, this month</p>
          {data.channels.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Channel mix appears once agents have conversation volume.
            </p>
          ) : (
            <HBarChart rows={data.channels.map((c) => ({ label: c.label, pct: c.pct }))} />
          )}
        </div>
        <div className="panel p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Top questions</h2>
          <p className="mb-4 mt-1 text-xs text-[var(--muted)]">what customers ask most</p>
          {data.topQuestions.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Topic clustering is on the roadmap. Until then, use{" "}
              <Link href="/history" className="text-[var(--accent-bright)] hover:underline">
                History
              </Link>{" "}
              and Live Ops audit.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.topQuestions.map((q) => (
                <li key={q.q}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span>{q.q}</span>
                    <span className="shrink-0 text-[var(--muted)]">{q.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elev)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${(q.count / maxQ) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="panel overflow-hidden">
          <div className="flex items-baseline justify-between gap-2 border-b border-[var(--line)] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">By agent</h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">this month</p>
            </div>
          </div>
          {data.byAgent.length === 0 ? (
            <p className="px-5 py-8 text-sm text-[var(--muted)]">
              Rent an agent and run conversations to see per-agent metrics.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                    <th className="px-5 py-3 font-medium">Agent</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 text-right font-medium">Convos</th>
                    <th className="px-3 py-3 text-right font-medium">Resolved</th>
                    <th className="px-3 py-3 text-right font-medium">Leads</th>
                    <th className="px-3 py-3 text-right font-medium">Tokens</th>
                    <th className="px-5 py-3 text-right font-medium">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byAgent.map((a) => (
                    <tr key={a.agentId} className="border-t border-[var(--line)] hover:bg-[var(--bg-panel-hover)]/60 transition-colors">
                      <td className="px-5 py-3 font-medium">{a.name}</td>
                      <td className="px-3 py-3">{statusChip(a.status.tone, a.status.label)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{a.conversations.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {a.resolvedPct == null ? "—" : `${a.resolvedPct}%`}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{a.leads}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-[var(--muted)]">
                        {a.tokens >= 1000 ? `${Math.round(a.tokens / 1000)}k` : a.tokens}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">{formatUsd(a.spend)}</td>
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
