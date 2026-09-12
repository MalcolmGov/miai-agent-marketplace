"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TokenPackageGrid } from "@/components/TokenPackageGrid";

const MODEL_BURNS = [
  { name: "Gemini 2.5 Flash", rate: "1 token / turn", speed: "⚡ Sub-120ms", desc: "High throughput customer FAQ, triage & routing" },
  { name: "GPT-4o Mini", rate: "2 tokens / turn", speed: "⚡ ~180ms", desc: "Structured data extraction & multi-language support" },
  { name: "Claude 3.7 Sonnet", rate: "5 tokens / turn", speed: "⚡ ~250ms", desc: "Enterprise default: consultative sales & workflow execution" },
  { name: "GPT-4o / Claude Opus", rate: "15 tokens / turn", speed: "⚡ ~450ms", desc: "Deep reasoning, financial audit & complex code contracts" },
];

export default function TokensPage() {
  const [tokens, setTokens] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  async function loadBalance() {
    try {
      const res = await fetch("/api/wallet");
      if (res.ok) {
        const data = await res.json();
        setTokens(typeof data?.tokens === "number" ? data.tokens : 0);
      } else {
        setTokens(null);
      }
    } catch {
      setTokens(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBalance();
  }, [refreshKey]);

  return (
    <div className="mx-auto max-w-4xl space-y-7 pb-12">
      <header className="space-y-1.5 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="display text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
              My Tokens &amp; Billing
            </h1>
            <p className="mt-1 text-sm text-[var(--card-body)]">
              Prepaid workspace balance, instant top-ups, and model execution telemetry. Tokens never expire.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/redeem" className="btn btn-primary text-xs">
              🎁 Redeem e-PIN
            </Link>
            <Link href="/my-agents?tab=insights" className="btn btn-ghost text-xs">
              📊 View Fleet Insights
            </Link>
          </div>
        </div>
      </header>

      {/* Main Balance Overview Card */}
      <section className="panel card-specular-rim relative overflow-hidden rounded-2xl border border-[var(--line)] p-6 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted-dim)]">
                Available Balance
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">
                ACTIVE
              </span>
            </div>
            <p className="font-mono text-4xl font-extrabold tracking-tight text-white tabular-nums sm:text-5xl">
              {loading ? (
                <span className="text-[var(--muted-dim)]">…</span>
              ) : tokens !== null ? (
                tokens.toLocaleString()
              ) : (
                "0"
              )}
              <span className="ml-2.5 font-sans text-sm font-semibold uppercase tracking-wider text-[var(--muted-dim)]">
                Tokens
              </span>
            </p>
            <p className="text-xs text-[var(--muted)]">
              Shared across all rented agents in this workspace · Burned on inference turns only.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:flex-col sm:items-end">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setRefreshKey((k) => k + 1);
              }}
              className="btn btn-ghost !py-1.5 !px-3 text-xs"
              title="Refresh wallet balance"
            >
              🔄 Refresh Balance
            </button>
            <span className="text-[11px] text-[var(--muted-dim)]">
              Auto-renews when low if configured
            </span>
          </div>
        </div>
      </section>

      {/* Instant Token Top-Up Packages Grid */}
      <section className="panel card-specular-rim relative overflow-hidden rounded-2xl border border-[var(--line)] p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white tracking-tight">Top Up Tokens</h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Select a package to credit tokens instantly. Payment handled via secure card checkout or regional rails.
          </p>
        </div>
        <TokenPackageGrid
          scope="workspace"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          onCredited={(newTokens) => {
            setTokens(newTokens);
            setRefreshKey((k) => k + 1);
          }}
        />
      </section>

      {/* Model Consumption Rates */}
      <section className="panel relative overflow-hidden rounded-2xl border border-[var(--line)] p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white tracking-tight">Model Consumption Schedule</h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Token burn is strictly proportional to agent turn complexity and underlying LLM reasoning tier.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODEL_BURNS.map((item) => (
            <div
              key={item.name}
              className="rounded-xl border border-[var(--line)] bg-[var(--bg-elev)] p-4 transition-all hover:border-[var(--accent-dim)]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-sm text-white">{item.name}</span>
                <span className="rounded-md bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] px-2 py-0.5 text-[10px] font-mono font-bold text-[var(--accent-bright)] border border-[var(--accent)]/30">
                  {item.rate}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">{item.desc}</p>
              <div className="mt-3 flex items-center gap-2 border-t border-[var(--line)]/60 pt-2 text-[11px] text-[var(--accent-bright)] font-medium">
                <span>{item.speed}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Prepaid Guarantee & Perks Banner */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-white/[0.08] bg-gradient-to-r from-[color-mix(in_srgb,var(--accent)_10%,transparent)] via-[var(--bg-panel)] to-transparent p-5 text-xs text-[var(--card-body)]">
        <div className="space-y-1">
          <p className="font-bold text-white text-sm">💡 Zero Waste Guarantee</p>
          <p className="text-[var(--muted)] leading-relaxed max-w-xl">
            Unused tokens roll over indefinitely with zero expiration. Switch agent models, reconfigure knowledge bases, or change connected tools anytime without forfeiting balance.
          </p>
        </div>
        <Link href="/learn" className="btn btn-ghost text-xs shrink-0 self-start sm:self-auto">
          Read Billing Documentation →
        </Link>
      </section>
    </div>
  );
}
