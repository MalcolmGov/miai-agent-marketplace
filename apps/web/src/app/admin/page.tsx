"use client";

import { useEffect, useState } from "react";
import { LineTrendChart, formatCompact, formatUsd } from "@/components/dashboard/Charts";

type AdminPayload = {
  source: string;
  kpis: {
    liveAgents: number;
    customers: number;
    monthlyRentalRevenue: number;
    monthlyRentalRevenueDisplay: number;
    tokensConsumed: number;
    customRequests: number;
    customRequestsNew: number;
  };
  economics: {
    tokenRevenueMonth: number;
    tokenRevenueDeltaPct: number;
    rentalMrr: number;
    activeBusinesses: number;
    blendedPerBusiness: number;
    miaiPct: number;
    partnerPct: number;
    miaiKeepMonth: number;
    projectedArr: number;
    tokenTrend: Array<{ month: string; value: number }>;
  };
  rentals: Array<{
    workspaceId: string;
    customer: string;
    agentId: string;
    agentName: string;
    tier: string;
    channel: string;
    state: string;
    status: { label: string; tone: "live" | "warn" | "muted" };
    rentalUsd: number | null;
  }>;
  customRequests: Array<{
    id: string;
    business: string;
    need: string;
    source: string;
    status: "new" | "reviewing" | "scoped";
  }>;
};

function tierChip(tier: string) {
  const t = tier.toUpperCase();
  const style =
    tier === "enterprise"
      ? { color: "#c4b5fd", borderColor: "rgba(167,139,250,0.45)", background: "rgba(139,92,246,0.15)" }
      : tier === "pro"
        ? { color: "var(--accent-bright)", borderColor: "color-mix(in srgb, var(--accent) 50%, transparent)", background: "color-mix(in srgb, var(--accent) 12%, transparent)" }
        : undefined;
  return (
    <span className="chip" style={style}>
      {t}
    </span>
  );
}

function statusText(tone: "live" | "warn" | "muted", label: string) {
  const color =
    tone === "live" ? "var(--accent-bright)" : tone === "warn" ? "#f0b429" : "var(--muted)";
  return (
    <span style={{ color }}>
      ● {label}
    </span>
  );
}

function requestStatus(status: "new" | "reviewing" | "scoped") {
  if (status === "new")
    return (
      <span className="chip" style={{ color: "#f0b429", borderColor: "rgba(240,180,41,0.45)" }}>
        ● New
      </span>
    );
  if (status === "scoped")
    return <span className="chip chip-live">● Scoped</span>;
  return <span className="chip">● Reviewing</span>;
}

export default function AdminPage() {
  const [data, setData] = useState<AdminPayload | null>(null);

  useEffect(() => {
    fetch("/api/admin")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) {
    return <div className="text-[var(--muted)]">Loading Agent Admin…</div>;
  }

  const { kpis: k, economics: e } = data;
  const tokensLabel =
    k.tokensConsumed >= 1_000_000
      ? `${(k.tokensConsumed / 1_000_000).toFixed(1)}M`
      : formatCompact(k.tokensConsumed);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-[var(--muted)]">AI Agents › Agent Admin</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Agent Admin</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Every agent your customers have rented, live status, and monthly rental revenue — the
            operator&apos;s view.
          </p>
        </div>
        <span className="chip chip-live px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
          Operator
        </span>
      </div>

      {/* Ops KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Live agents",
            value: String(k.liveAgents),
            sub: `across ${k.customers} customers`,
          },
          {
            label: "Monthly rental revenue",
            value: formatUsd(k.monthlyRentalRevenueDisplay),
            sub: "recurring • this month",
          },
          {
            label: "Tokens consumed",
            value: tokensLabel,
            sub: "this month • billed as usage",
          },
          {
            label: "Custom requests",
            value: String(k.customRequests),
            sub: `${k.customRequestsNew} new to triage`,
          },
        ].map((card) => (
          <div key={card.label} className="panel p-4">
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

      {/* Partner economics */}
      <section className="panel overflow-hidden" style={{ borderTop: "2px solid var(--accent)" }}>
        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              Partner economics
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              What this marketplace generates on MyInstantAI
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
              Combined token usage and agent rentals across the live partner base — and how the
              revenue splits between the two of us.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            <div
              className="panel p-4"
              style={{
                borderColor: "color-mix(in srgb, var(--accent) 60%, var(--line))",
                boxShadow: "0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent)",
              }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Token revenue — this month
              </div>
              <div className="mt-2 text-2xl font-semibold text-[var(--accent-bright)]">
                {formatUsd(e.tokenRevenueMonth)}
              </div>
              <div className="mt-1 text-xs text-[var(--accent-bright)]">
                ↑ {e.tokenRevenueDeltaPct}% vs last month — metered usage, billed as consumed.
              </div>
            </div>
            <div className="panel p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Rental MRR
              </div>
              <div className="mt-2 text-2xl font-semibold">{formatUsd(e.rentalMrr)}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">recurring — live agent rentals.</div>
            </div>
            <div className="panel p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Active businesses
              </div>
              <div className="mt-2 text-2xl font-semibold">{e.activeBusinesses.toLocaleString()}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">paying, with a live agent.</div>
            </div>
            <div className="panel p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Blended $ / business / mo
              </div>
              <div className="mt-2 text-2xl font-semibold">{formatUsd(e.blendedPerBusiness)}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">rental + tokens combined.</div>
            </div>
            <div className="panel p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                MyInstantAI / partner split
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {e.miaiPct}% / {e.partnerPct}%
              </div>
              <div className="mt-1 text-xs text-[var(--muted)]">
                MyInstantAI keeps ~{formatUsd(e.miaiKeepMonth, { compact: true })}/mo — partner{" "}
                {e.partnerPct}% commission.
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="panel p-4 xl:col-span-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Projected ARR
              </div>
              <div className="mt-2 text-2xl font-semibold text-[var(--accent-bright)]">
                {formatUsd(e.projectedArr, { compact: true })}
              </div>
              <div className="mt-1 text-xs text-[var(--muted)]">annualised run-rate.</div>
            </div>
            <div className="panel p-4 sm:col-span-2 xl:col-span-4">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold">Token revenue trend</h3>
                <span className="text-xs text-[var(--muted)]">last 6 months — monthly, $000s</span>
              </div>
              <div className="h-[220px]">
                <LineTrendChart points={e.tokenTrend} valueLabel={`$${e.tokenTrend.at(-1)?.value}K`} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All rented agents */}
      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider">All rented agents</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Full visibility across clients, tiers, channels, and rental MRR.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-3 py-3 font-medium">Agent</th>
                <th className="px-3 py-3 font-medium">Tier</th>
                <th className="px-3 py-3 font-medium">Channel</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Rental</th>
              </tr>
            </thead>
            <tbody>
              {data.rentals.map((r) => (
                <tr key={`${r.workspaceId}-${r.agentId}`} className="border-t border-[var(--line)]">
                  <td className="px-5 py-3 font-medium">{r.customer}</td>
                  <td className="px-3 py-3">{r.agentName}</td>
                  <td className="px-3 py-3">{tierChip(r.tier)}</td>
                  <td className="px-3 py-3 text-[var(--muted)]">{r.channel}</td>
                  <td className="px-3 py-3">{statusText(r.status.tone, r.status.label)}</td>
                  <td className="px-5 py-3 tabular-nums">
                    {r.rentalUsd != null ? `${formatUsd(r.rentalUsd)}/mo` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Custom requests */}
      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Custom agent requests</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Bespoke agents businesses asked for — from the dashboard and the marketing page. Scope,
            build, publish to the catalogue.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                <th className="px-5 py-3 font-medium">Business</th>
                <th className="px-3 py-3 font-medium">What they need</th>
                <th className="px-3 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.customRequests.map((req) => (
                <tr key={req.id} className="border-t border-[var(--line)]">
                  <td className="px-5 py-3 font-medium">{req.business}</td>
                  <td className="px-3 py-3 text-[var(--muted)]">{req.need}</td>
                  <td className="px-3 py-3">
                    <span className="chip">{req.source}</span>
                  </td>
                  <td className="px-5 py-3">{requestStatus(req.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
