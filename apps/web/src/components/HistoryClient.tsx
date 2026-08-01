"use client";

import { useCallback, useEffect, useState } from "react";

type AuditEvent = {
  id: string;
  at: string;
  type: string;
  agentId?: string;
  correlationId?: string;
  sessionId?: string;
  channel?: string;
  userId?: string;
  detail: Record<string, unknown>;
};

type Turn = {
  id: string;
  at: string;
  correlationId: string;
  agentId: string;
  channel: string;
  sessionId: string;
  userMessage: string;
  assistantMessage: string;
  toolCalls: Array<{ name: string; error?: string }>;
  tokensDebited: number;
  paused: boolean;
};

type Tab = "conversations" | "activity";

export function HistoryClient() {
  const [tab, setTab] = useState<Tab>("conversations");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState("");
  const [selectedCorr, setSelectedCorr] = useState<string | null>(null);
  const [trace, setTrace] = useState<{ turns: Turn[]; audit: AuditEvent[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "80" });
      if (channel) params.set("channel", channel);
      const [tRes, aRes] = await Promise.all([
        fetch(`/api/history/turns?${params}`),
        fetch(`/api/audit?limit=100`),
      ]);
      if (!tRes.ok || !aRes.ok) throw new Error("Failed to load history");
      const tData = await tRes.json();
      const aData = await aRes.json();
      setTurns(tData.turns ?? []);
      setEvents(aData.events ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [channel]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openTrace(correlationId: string) {
    setSelectedCorr(correlationId);
    setTrace(null);
    const res = await fetch(`/api/history/trace/${encodeURIComponent(correlationId)}`);
    if (!res.ok) return;
    const data = await res.json();
    setTrace({ turns: data.turns ?? [], audit: data.audit ?? [] });
  }

  const filteredTurns = turns.filter((t) => {
    if (!q.trim()) return true;
    const hay = `${t.userMessage} ${t.assistantMessage} ${t.agentId} ${t.correlationId}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  const filteredEvents = events.filter((e) => {
    if (channel && e.channel !== channel && e.detail?.channel !== channel) return false;
    if (!q.trim()) return true;
    const hay = `${e.type} ${e.agentId ?? ""} ${e.correlationId ?? ""} ${JSON.stringify(e.detail)}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">History</h1>
        <p className="max-w-2xl text-sm text-[var(--muted)]">
          Full audit trail and conversation transcripts for this workspace — every Studio, website,
          App, and Ask AI turn with a correlation id for end-to-end traceability.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5">
          {(
            [
              ["conversations", "Conversations"],
              ["activity", "Activity log"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                tab === id
                  ? "bg-[var(--accent)] text-[var(--accent-ink,#062)]"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--text)]"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          aria-label="Channel filter"
        >
          <option value="">All channels</option>
          <option value="studio">Studio</option>
          <option value="embed">Website</option>
          <option value="app">App</option>
          <option value="ask">Ask AI</option>
        </select>
        <input
          className="min-w-[12rem] flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text)]"
          placeholder="Search messages, agents, correlation id…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className="btn btn-ghost text-xs" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {loading && <p className="text-sm text-[var(--muted)]">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && tab === "conversations" && (
        <div className="space-y-3">
          {filteredTurns.length === 0 && (
            <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
              No conversation turns yet. Chat in Agent Studio, Ask AI, or a live channel — each reply
              is recorded here with a correlation id.
            </p>
          )}
          {filteredTurns.map((t) => (
            <article
              key={t.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
                <span className="rounded-full bg-[var(--bg)] px-2 py-0.5 font-medium uppercase tracking-wide">
                  {t.channel}
                </span>
                <span className="font-mono">{t.agentId}</span>
                <span>{new Date(t.at).toLocaleString()}</span>
                <span>{t.tokensDebited} tokens</span>
                {t.paused && <span className="text-amber-400">paused</span>}
                <button
                  type="button"
                  className="ml-auto font-mono text-[var(--accent-bright)] hover:underline"
                  onClick={() => void openTrace(t.correlationId)}
                  title="Open full trace"
                >
                  {t.correlationId}
                </button>
              </div>
              <p className="text-sm text-[var(--text)]">
                <span className="text-[var(--muted)]">You: </span>
                {t.userMessage}
              </p>
              <p className="mt-2 text-sm text-[var(--text)]">
                <span className="text-[var(--muted)]">Assistant: </span>
                {t.assistantMessage}
              </p>
              {t.toolCalls.length > 0 && (
                <p className="mt-2 text-[11px] text-[var(--muted)]">
                  Tools: {t.toolCalls.map((x) => x.name).join(", ")}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {!loading && !error && tab === "activity" && (
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface)] text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Agent</th>
                <th className="px-3 py-2 font-medium">Channel</th>
                <th className="px-3 py-2 font-medium">Correlation</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((e) => (
                <tr key={e.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 whitespace-nowrap text-[var(--muted)]">
                    {new Date(e.at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-medium text-[var(--text)]">{e.type}</td>
                  <td className="px-3 py-2 font-mono text-[var(--muted)]">{e.agentId ?? "—"}</td>
                  <td className="px-3 py-2 text-[var(--muted)]">
                    {e.channel ?? (e.detail.channel as string) ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {e.correlationId ? (
                      <button
                        type="button"
                        className="font-mono text-[var(--accent-bright)] hover:underline"
                        onClick={() => void openTrace(e.correlationId!)}
                      >
                        {e.correlationId}
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEvents.length === 0 && (
            <p className="p-6 text-sm text-[var(--muted)]">No audit events match.</p>
          )}
        </div>
      )}

      {selectedCorr && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal
          aria-label="Trace detail"
          onClick={() => setSelectedCorr(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text)]">Trace</h2>
                <p className="font-mono text-[11px] text-[var(--muted)]">{selectedCorr}</p>
              </div>
              <button type="button" className="btn btn-ghost text-xs" onClick={() => setSelectedCorr(null)}>
                Close
              </button>
            </div>
            {!trace && <p className="text-sm text-[var(--muted)]">Loading trace…</p>}
            {trace && (
              <div className="space-y-4">
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Turns ({trace.turns.length})
                  </h3>
                  {trace.turns.map((t) => (
                    <div key={t.id} className="mb-2 rounded-lg border border-[var(--border)] p-3 text-sm">
                      <p>
                        <span className="text-[var(--muted)]">You: </span>
                        {t.userMessage}
                      </p>
                      <p className="mt-1">
                        <span className="text-[var(--muted)]">Assistant: </span>
                        {t.assistantMessage}
                      </p>
                    </div>
                  ))}
                </section>
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Audit ({trace.audit.length})
                  </h3>
                  <ul className="space-y-1 text-xs text-[var(--muted)]">
                    {trace.audit.map((a) => (
                      <li key={a.id} className="font-mono">
                        {a.at} · {a.type}
                        {a.agentId ? ` · ${a.agentId}` : ""}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
