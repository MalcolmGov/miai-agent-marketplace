"use client";

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

  if (!data) return <div className="text-[var(--muted)]">Loading Live Ops…</div>;

  const s = data.summary;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Live Ops</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Lightweight insights — turns, pauses, connector health for this workspace.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Wallet", data.wallet.tokens.toLocaleString()],
          ["Rented", String(s.rented)],
          ["Live", String(s.live)],
          ["Paused", String(s.paused)],
          ["Turns", String(s.turns)],
        ].map(([label, value]) => (
          <div key={label} className="panel p-4">
            <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</div>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="mb-3 text-sm font-semibold">Workspace agents</h2>
          {s.agents.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Rent an agent to see it here.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {s.agents.map((a) => (
                <li key={a.agentId} className="flex justify-between gap-2 border-b border-[var(--line)] pb-2">
                  <span>
                    <code className="text-[var(--accent)]">{a.agentId}</code>
                    <span className="ml-2 text-[var(--muted)]">{a.model}</span>
                  </span>
                  <span className="chip">{a.state}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel p-4">
          <h2 className="mb-3 text-sm font-semibold">Recent audit</h2>
          <ul className="max-h-[420px] space-y-2 overflow-y-auto text-xs">
            {data.recent.map((e) => (
              <li key={e.id} className="rounded-md bg-[var(--bg-elev)] px-2 py-1.5">
                <div className="flex justify-between gap-2 text-[var(--muted)]">
                  <span>{e.type}</span>
                  <span>{new Date(e.at).toLocaleTimeString()}</span>
                </div>
                <div>
                  {e.agentId ?? "—"} · {JSON.stringify(e.detail).slice(0, 120)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
