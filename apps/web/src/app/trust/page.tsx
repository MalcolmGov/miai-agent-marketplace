"use client";

import { useEffect, useState } from "react";
import {
  DATA_CLASSES,
  REGION_PACKS,
  ROADMAP_SECURITY,
  SECURITY_CONTROLS,
  SUBPROCESSORS,
  statusLabel,
  type Status,
} from "@/lib/trust-content";

type AuditEvent = {
  id: string;
  at: string;
  type: string;
  agentId?: string;
};

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

export default function TrustPage() {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);

  useEffect(() => {
    fetch("/api/audit?limit=8")
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(() => setEvents([]));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-xs text-[var(--muted)]">Trust Center</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Trust &amp; Security</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            How MyInstantAI Agents Marketplace protects customer data across US, EU, Africa (incl.
            South Africa), and Asia — what is shipped today, what is agent-level compliance, and what
            is on the Azure production roadmap. No certification theatre.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip chip-live">Multi-region packs</span>
          <span className="chip">Honest claims</span>
        </div>
      </div>

      {/* Posture strip */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Tenancy", "Workspace-scoped OIDC / mock demos"],
          ["Audit", "Rent · chat · OAuth · knowledge"],
          ["Embed", "Entitled + rate-limited"],
          ["Regions", "US · EU · Africa · Asia packs"],
        ].map(([label, value]) => (
          <div key={label} className="panel p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              {label}
            </div>
            <div className="mt-2 text-sm font-medium text-[var(--accent-bright)]">{value}</div>
          </div>
        ))}
      </div>

      {/* Security controls */}
      <section className="panel overflow-hidden" style={{ borderTop: "2px solid var(--accent)" }}>
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Platform security controls</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Technical controls in this codebase and the Azure landing path — status is accurate as of
            this build.
          </p>
        </div>
        <ul className="divide-y divide-[var(--line)]">
          {SECURITY_CONTROLS.map((c) => (
            <li key={c.title} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{c.title}</div>
                <p className="mt-1 text-sm text-[var(--muted)]">{c.body}</p>
              </div>
              <StatusChip status={c.status} />
            </li>
          ))}
        </ul>
      </section>

      {/* Regional compliance */}
      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold tracking-tight">Regional compliance matrix</h2>
          <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
            Market packs encode <em>agent</em> guardrails (prompts, handoffs, channel norms). They are
            not a substitute for platform certifications or a signed DPA. South Africa is covered under
            the Africa pack (POPIA-style).
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {REGION_PACKS.map((r) => (
            <article key={r.id} className="panel p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold">{r.label}</h3>
                <span className="chip">{r.id.toUpperCase()}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.frameworks.map((f) => (
                  <span key={f} className="chip chip-live text-[11px]">
                    {f}
                  </span>
                ))}
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                    Agent layer
                  </dt>
                  <dd className="mt-0.5 text-[var(--text)]">{r.agentLayer}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                    Platform / residency
                  </dt>
                  <dd className="mt-0.5 text-[var(--muted)]">{r.platformNote}</dd>
                </div>
                <div className="flex flex-wrap gap-4 pt-1 text-xs text-[var(--muted)]">
                  <span>Emergency: {r.emergency}</span>
                  <span>Channels: {r.channels.join(" · ")}</span>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      {/* Data handling */}
      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Data we store</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Minimisation by design. Erasure and access requests are handed to a human today — agents
            never claim to complete GDPR/CCPA/POPIA deletion in chat.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                <th className="px-5 py-3 font-medium">Class</th>
                <th className="px-3 py-3 font-medium">Examples</th>
                <th className="px-5 py-3 font-medium">Retention</th>
              </tr>
            </thead>
            <tbody>
              {DATA_CLASSES.map((d) => (
                <tr key={d.name} className="border-t border-[var(--line)]">
                  <td className="px-5 py-3 font-medium">{d.name}</td>
                  <td className="px-3 py-3 text-[var(--muted)]">{d.examples}</td>
                  <td className="px-5 py-3 text-[var(--muted)]">{d.retention}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Live audit proof */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Your workspace audit trail</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Live events for this workspace only — never cross-tenant.
          </p>
          {events == null ? (
            <p className="mt-4 text-sm text-[var(--muted)]">Loading audit…</p>
          ) : events.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">
              No events yet. Rent an agent, connect a connector, or run a chat turn to see the trail.
            </p>
          ) : (
            <ul className="mt-4 max-h-[280px] space-y-2 overflow-y-auto text-sm">
              {events.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-2 rounded-md bg-[var(--bg-elev)] px-3 py-2"
                >
                  <span>
                    <span className="font-medium text-[var(--accent-bright)]">{e.type}</span>
                    {e.agentId ? (
                      <span className="ml-2 text-[var(--muted)]">{e.agentId}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--muted)]">
                    {new Date(e.at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Subprocessors</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Staging vs production. Formal schedule ships with the DPA pack.
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            {SUBPROCESSORS.map((s) => (
              <li key={s.name} className="border-b border-[var(--line)] pb-3 last:border-0">
                <div className="font-medium">{s.name}</div>
                <div className="text-[var(--muted)]">{s.role}</div>
                <div className="mt-0.5 text-xs text-[var(--muted)]">Region: {s.region}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Roadmap + claims discipline */}
      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Security &amp; compliance roadmap
          </h2>
        </div>
        <ul className="divide-y divide-[var(--line)]">
          {ROADMAP_SECURITY.map((r) => (
            <li key={r.item} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
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

      <section className="panel p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider">Claims discipline</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-bright)]">
              We say
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[var(--muted)]">
              <li>Market packs with GDPR / POPIA / CCPA / PDPA agent guardrails</li>
              <li>Deploy region = chosen Azure region (residency pinning on roadmap)</li>
              <li>Erasure requests escalate to a human</li>
              <li>OAuth tokens HMAC-sealed; AES-GCM planned</li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              We do not say
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[var(--muted)]">
              <li>“SOC 2 certified” before the audit completes</li>
              <li>“GDPR-compliant platform” as a blanket claim</li>
              <li>“EU data residency guaranteed” on today’s single-region deploy</li>
              <li>“Automated right-to-be-forgotten” in the agent chat</li>
            </ul>
          </div>
        </div>
        <p className="mt-5 text-sm text-[var(--muted)]">
          Security / DPO contact for partners:{" "}
          <a className="text-[var(--accent-bright)] underline-offset-2 hover:underline" href="mailto:security@myinstantai.com">
            security@myinstantai.com
          </a>
          . Full write-up: <code className="text-[var(--accent-bright)]">docs/TRUST_AND_COMPLIANCE.md</code>.
        </p>
      </section>
    </div>
  );
}
