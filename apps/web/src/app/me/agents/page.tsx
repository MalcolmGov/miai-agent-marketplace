"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_CONSUMER_AGENT } from "@/lib/consumer";

type AgentCard = {
  id: string;
  name: string;
  summary: string;
  emoji: string;
  tools: number;
  isDefault: boolean;
};

const ENABLED_KEY = "miai:me:enabled-agents:v1";

/** Load the set of agent ids this consumer has enabled (localStorage). */
function loadEnabled(): Set<string> {
  try {
    const raw = localStorage.getItem(ENABLED_KEY);
    if (!raw) return new Set([DEFAULT_CONSUMER_AGENT]);
    const ids: string[] = JSON.parse(raw);
    return new Set(ids.length ? ids : [DEFAULT_CONSUMER_AGENT]);
  } catch {
    return new Set([DEFAULT_CONSUMER_AGENT]);
  }
}

function saveEnabled(ids: Set<string>) {
  try {
    localStorage.setItem(ENABLED_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore — private mode etc */
  }
}

export default function ConsumerAgentsPage() {
  const [agents, setAgents] = useState<AgentCard[]>([]);
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setEnabled(loadEnabled());
    fetch("/api/consumer/agents")
      .then((r) => r.json())
      .then((d) => setAgents(Array.isArray(d.agents) ? d.agents : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = useCallback((id: string) => {
    if (id === DEFAULT_CONSUMER_AGENT) return; // flagship is always enabled
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveEnabled(next);
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-12">
        <p className="text-sm text-[var(--muted)]">Loading agents…</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="display text-2xl font-semibold tracking-tight text-[var(--text)]">
          Your agents
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          Choose which agents you want available. Switch between them any time when chatting.
        </p>
      </div>

      <div className="space-y-3">
        {agents.map((a) => {
          const isOn = enabled.has(a.id);
          return (
            <div
              key={a.id}
              className={`rounded-2xl border p-4 transition ${
                isOn
                  ? "border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent)_6%,transparent)]"
                  : "border-[var(--line)] bg-[var(--bg-panel)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-2xl" aria-hidden>
                  {a.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-[var(--text)]">{a.name}</h2>
                    {a.isDefault ? (
                      <span className="chip chip-live text-[11px]">Default</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{a.summary}</p>
                  <p className="mt-1.5 text-xs text-[var(--muted)]">{a.tools} tools</p>
                </div>
                <button
                  type="button"
                  disabled={a.isDefault}
                  onClick={() => toggle(a.id)}
                  className={`btn inline-flex h-8 shrink-0 items-center px-3 text-xs font-medium ${
                    a.isDefault
                      ? "cursor-not-allowed opacity-50"
                      : isOn
                        ? "btn-primary"
                        : "btn-ghost border border-[var(--line)]"
                  }`}
                >
                  {a.isDefault ? "Always on" : isOn ? "Enabled" : "Enable"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 border-t border-[var(--line)] pt-5">
        <Link
          href="/me"
          className="text-sm text-[var(--accent)] underline decoration-1 underline-offset-2 hover:opacity-80"
        >
          ← Back to chat
        </Link>
      </div>
    </div>
  );
}
