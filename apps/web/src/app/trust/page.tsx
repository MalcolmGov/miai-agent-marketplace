"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  HERO_BADGES,
  PILLARS,
  REGION_PACKS,
  ROADMAP_SECURITY,
  statusLabel,
  truthLabel,
  type Pillar,
  type Status,
  type Truth,
} from "@/lib/trust-content";

type AuditEvent = { id: string; at: string; type: string; agentId?: string };

function TruthChip({ truth }: { truth: Truth }) {
  if (truth === "live") return <span className="chip chip-live text-[10px]">{truthLabel(truth)}</span>;
  if (truth === "via_provider")
    return (
      <span
        className="chip text-[10px]"
        style={{ color: "#93c5fd", borderColor: "rgba(96,165,250,0.45)" }}
      >
        {truthLabel(truth)}
      </span>
    );
  if (truth === "partial")
    return (
      <span
        className="chip text-[10px]"
        style={{ color: "#f0b429", borderColor: "rgba(240,180,41,0.45)" }}
      >
        {truthLabel(truth)}
      </span>
    );
  return <span className="chip text-[10px]">{truthLabel(truth)}</span>;
}

function StatusChip({ status }: { status: Status }) {
  if (status === "shipped") return <span className="chip chip-live">{statusLabel(status)}</span>;
  if (status === "in_progress")
    return (
      <span className="chip" style={{ color: "#f0b429", borderColor: "rgba(240,180,41,0.45)" }}>
        {statusLabel(status)}
      </span>
    );
  return <span className="chip">{statusLabel(status)}</span>;
}

function PillarIcon({ pillar }: { pillar: Pillar }) {
  const stroke = pillar.accent;
  return (
    <span
      className="inline-flex h-11 w-11 items-center justify-center rounded-full"
      style={{ background: pillar.accentSoft, boxShadow: `0 0 0 1px ${pillar.accent}55` }}
      aria-hidden
    >
      {pillar.icon === "lock" && (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      )}
      {pillar.icon === "key" && (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8">
          <circle cx="8" cy="15" r="4" />
          <path d="M12 15h9l-2 2m0-4 2 2" />
        </svg>
      )}
      {pillar.icon === "shield" && (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8">
          <path d="M12 3 5 6v6c0 5 3.5 8 7 9 3.5-1 7-4 7-9V6l-7-3z" />
          <path d="M9.5 12.5 11 14l3.5-3.5" />
        </svg>
      )}
      {pillar.icon === "building" && (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8">
          <path d="M4 20h16M6 20V10l6-4 6 4v10M9 20v-4h6v4M9 12h.01M12 12h.01M15 12h.01" />
        </svg>
      )}
    </span>
  );
}

export default function TrustPage() {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [dsarBusy, setDsarBusy] = useState(false);
  const [dsarError, setDsarError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/audit?limit=6")
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(() => setEvents([]));
  }, []);

  async function downloadDsar() {
    setDsarBusy(true);
    setDsarError(null);
    try {
      const res = await fetch("/api/dsar/export");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `miai-dsar-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setDsarError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setDsarBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs text-[var(--muted)]">Security &amp; compliance</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Trust &amp; Security</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Enterprise-grade by design — how every conversation, action and token stays safe. Each
          claim is tagged so you can see what is live in this build versus planned or via a provider.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {HERO_BADGES.map((b) => (
            <span
              key={b.label}
              className="chip chip-live inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
              title={b.note}
            >
              <span aria-hidden>✓</span>
              {b.label}
            </span>
          ))}
        </div>
        <p className="mt-3 flex flex-wrap gap-3 text-[11px] text-[var(--muted)]">
          <span>
            <span className="text-[var(--accent-bright)]">Live</span> — in this build
          </span>
          <span>
            <span style={{ color: "#f0b429" }}>Partial</span> — real capability, fuller story on roadmap
          </span>
          <span>
            <span style={{ color: "#93c5fd" }}>Via provider</span> — Stripe / host / IdP
          </span>
          <span>
            <span className="text-[var(--muted)]">Planned</span> — not claiming today
          </span>
        </p>
      </div>

      {/* 2×2 pillars — Claude layout, truth-tagged */}
      <div className="grid gap-4 lg:grid-cols-2">
        {PILLARS.map((pillar) => (
          <article
            key={pillar.id}
            className="panel overflow-hidden"
            style={{ borderTop: `2px solid ${pillar.accent}` }}
          >
            <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4">
              <PillarIcon pillar={pillar} />
              <h2 className="text-base font-semibold tracking-tight">{pillar.title}</h2>
            </div>
            <ul>
              {pillar.items.map((item, i) => (
                <li
                  key={item.title}
                  className={`px-5 py-3.5 ${i > 0 ? "border-t border-[var(--line)]" : ""}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className="mt-0.5 shrink-0 text-sm font-bold"
                      style={{ color: pillar.accent }}
                      aria-hidden
                    >
                      ✓
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{item.title}</span>
                        <TruthChip truth={item.truth} />
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted)]">{item.body}</p>
                      {item.caveat ? (
                        <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)] opacity-80">
                          {item.caveat}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      {/* Guardrails CTA */}
      <section
        className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderColor: "color-mix(in srgb, #fb923c 45%, var(--line))" }}
      >
        <div className="flex gap-3">
          <span
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            style={{ background: "rgba(251, 146, 60, 0.14)" }}
            aria-hidden
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="1.8">
              <path d="M12 3 5 6v6c0 5 3.5 8 7 9 3.5-1 7-4 7-9V6l-7-3z" />
              <path d="M9.5 12.5 11 14l3.5-3.5" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold">See it live</p>
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
              Open any agent&apos;s studio chat and tap <strong>Test the guardrails</strong> — watch it
              block a prompt-injection attack, refuse cross-tenant data, and escalate an erasure
              request to a human, in real time.
            </p>
          </div>
        </div>
        <Link href="/" className="btn btn-primary shrink-0 whitespace-nowrap">
          Open AI Agents
        </Link>
      </section>

      {/* Regions */}
      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold tracking-tight">Regional packs</h2>
          <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
            Agent-layer compliance by market. Not the same as platform certification or residency
            guarantees.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {REGION_PACKS.map((r) => (
            <article key={r.id} className="panel p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{r.label}</h3>
                <span className="chip text-[10px]">{r.id.toUpperCase()}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {r.frameworks.map((f) => (
                  <span key={f} className="chip chip-live text-[10px]">
                    {f}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">{r.agentLayer}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider">
                Workspace audit &amp; DSAR
              </h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                This workspace only — never cross-tenant. Owners/admins can export a DSAR JSON pack.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost text-xs"
              disabled={dsarBusy}
              onClick={() => void downloadDsar()}
            >
              {dsarBusy ? "Exporting…" : "Download DSAR export"}
            </button>
          </div>
          {dsarError ? <p className="mt-2 text-xs text-[var(--warn,#fb923c)]">{dsarError}</p> : null}
          {events == null ? (
            <p className="mt-4 text-sm text-[var(--muted)]">Loading…</p>
          ) : events.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">
              No events yet. Rent, chat, or connect a connector to see the trail.
            </p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {events.map((e) => (
                <li
                  key={e.id}
                  className="flex justify-between gap-2 rounded-md bg-[var(--bg-elev)] px-3 py-2"
                >
                  <span>
                    <span className="text-[var(--accent-bright)]">{e.type}</span>
                    {e.agentId ? <span className="ml-2 text-[var(--muted)]">{e.agentId}</span> : null}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(e.at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider">Roadmap</h2>
          </div>
          <ul className="divide-y divide-[var(--line)]">
            {ROADMAP_SECURITY.map((r) => (
              <li
                key={r.item}
                className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                    {r.when}
                  </span>
                  <p className="mt-0.5 text-sm">{r.item}</p>
                </div>
                <StatusChip status={r.status} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="text-xs text-[var(--muted)]">
        Full write-up: <code className="text-[var(--accent-bright)]">docs/TRUST_AND_COMPLIANCE.md</code>
        . Partner security:{" "}
        <a
          className="text-[var(--accent-bright)] hover:underline"
          href="mailto:security@myinstantai.com"
        >
          security@myinstantai.com
        </a>
        .
      </p>
    </div>
  );
}
