"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function OpsPage() {
  const [data, setData] = useState<{
    wallet: { tokens: number };
    summary: {
      rented: number;
      live: number;
      paused: number;
      turns: number;
      toolFails: number;
      agents: Array<{ agentId: string; state: string; model: string; connectors: string[] }>;
    };
    recent: Array<{ id: string; at: string; type: string; agentId?: string; detail: Record<string, unknown> }>;
  } | null>(null);

  useEffect(() => {
    fetch("/api/ops")
      .then((r) => r.json())
      .then(setData);
    const t = setInterval(() => {
      fetch("/api/ops")
        .then((r) => r.json())
        .then(setData);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  if (!data) {
    return (
      <div className="space-y-4 py-8">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-4 w-96" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="panel p-4 space-y-2">
              <div className="skeleton h-3 w-16" />
              <div className="skeleton h-6 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="space-y-7 pb-12 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Telemetry Stream Active</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Live Ops Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--muted)] max-w-2xl">
            Real-time inference turns, token burn, and connector telemetry for this workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/my-agents?tab=insights" className="btn btn-ghost text-xs">
            📊 Fleet Insights
          </Link>
          <Link href="/history" className="btn btn-ghost text-xs">
            📜 History
          </Link>
          <Link href="/workspace" className="btn btn-ghost text-xs">
            🏢 Workspace
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Wallet Tokens", data.wallet.tokens.toLocaleString(), "Available", "var(--accent-bright)"],
          ["Rented Agents", String(s.rented), "Deployed", "white"],
          ["Live Units", String(s.live), "Active", "#5eead4"],
          ["Paused", String(s.paused), "Standby", "#f59e0b"],
          ["Inference Turns", String(s.turns), "Completed", "white"],
        ].map(([label, value, meta, color]) => (
          <div key={label} className="panel card-specular-rim relative overflow-hidden rounded-2xl border border-[var(--line)] p-4 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-dim)]">{label}</div>
            <div className="mt-1.5 text-2xl font-extrabold tracking-tight tabular-nums" style={{ color }}>{value}</div>
            <div className="mt-1 text-[11px] text-[var(--muted)] font-medium">{meta}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="panel card-specular-rim relative overflow-hidden rounded-2xl border border-[var(--line)] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white tracking-tight">Active Workspace Agents</h2>
            <span className="chip text-[10px]">{s.agents.length} Units</span>
          </div>
          {s.agents.length === 0 ? (
            <div className="p-6 text-center text-sm text-[var(--muted)]">
              No agents deployed yet. <Link href="/#catalogue" className="text-[var(--accent-bright)] hover:underline">Browse catalogue →</Link>
            </div>
          ) : (
            <ul className="space-y-2.5 text-sm">
              {s.agents.map((a) => (
                <li key={a.agentId} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)]/60 bg-[var(--bg-elev)] p-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/agents/${a.agentId}`} className="font-bold text-sm text-white hover:text-[var(--accent-bright)] truncate block">
                      {a.agentId}
                    </Link>
                    <span className="text-xs text-[var(--muted)] font-mono">{a.model}</span>
                  </div>
                  <span className={`chip text-[10px] uppercase font-bold ${a.state === "live" || a.state === "rented" ? "chip-live" : ""}`}>
                    {a.state}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel card-specular-rim relative overflow-hidden rounded-2xl border border-[var(--line)] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white tracking-tight">Recent Audit Events</h2>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Live</span>
          </div>
          <ul className="max-h-[380px] space-y-2 overflow-y-auto pr-1 text-xs">
            {data.recent.map((e) => {
              const isWallet = e.type.includes("wallet");
              const isTurn = e.type.includes("turn") || e.type.includes("inference");
              const badgeClass = isWallet
                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                : isTurn
                ? "text-[var(--accent-bright)] bg-[var(--accent)]/10 border-[var(--accent)]/20"
                : "text-[var(--biz-bright)] bg-[var(--biz)]/10 border-[var(--biz)]/20";

              return (
                <li key={e.id} className="rounded-xl border border-[var(--line)]/60 bg-[var(--bg-elev)] p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-mono font-semibold ${badgeClass}`}>
                      {e.type}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--muted-dim)]">
                      {new Date(e.at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-1.5 font-mono text-[11px] text-[var(--card-body)] truncate">
                    {e.agentId ? <strong className="text-white">{e.agentId}: </strong> : null}
                    {JSON.stringify(e.detail).slice(0, 100)}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
