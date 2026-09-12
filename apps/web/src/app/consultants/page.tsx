"use client";

import Link from "next/link";
import { useState } from "react";

const SPECIALISTS = [
  {
    name: "Marcus Vance",
    role: "Principal Enterprise AI Architect",
    focus: "Sovereign Deployments, Zero-Retention Audits & LLM Routing",
    avatar: "MV",
    sla: "⚡ < 2hr SLA",
    tags: ["Azure / AWS VPC", "Claude & GPT-4o", "Security Compliance"],
  },
  {
    name: "Priya Naidoo",
    role: "Head of Omnichannel Solutions",
    focus: "WhatsApp Business API, Shopify, Zendesk & Multi-region CRM",
    avatar: "PN",
    sla: "⚡ < 1hr SLA",
    tags: ["WhatsApp Commerce", "HubSpot", "Multilingual Support"],
  },
  {
    name: "David Chen",
    role: "Staff Integrations & Systems Engineer",
    focus: "Custom MCP Tooling, Payment Rails, Stripe & Legacy APIs",
    avatar: "DC",
    sla: "⚡ < 4hr SLA",
    tags: ["MCP Server Protocols", "Banking Rails", "Automated Workflows"],
  },
];

export default function ConsultantsPage() {
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>("Marcus Vance");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [topic, setTopic] = useState("enterprise-deployment");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 700);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12 pt-2">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="chip chip-live text-[10px] font-semibold">
              ✦ Certified Advisory Network
            </span>
            <h1 className="display mt-2 text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
              Talk to an AI Solution Specialist
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--card-body)]">
              Get direct architectural support, custom connector scoping, and zero-retention compliance verification from certified MyInstantAI engineering consultants.
            </p>
          </div>
          <Link href="/ask" className="btn btn-primary text-xs shadow-glow-sm">
            💬 Ask AI Instantly
          </Link>
        </div>
      </header>

      {/* Specialist Cards Grid */}
      <section className="grid gap-4 sm:grid-cols-3">
        {SPECIALISTS.map((s) => {
          const isSelected = selectedSpecialist === s.name;
          return (
            <div
              key={s.name}
              onClick={() => setSelectedSpecialist(s.name)}
              className={`panel relative cursor-pointer overflow-hidden rounded-2xl border p-5 transition-all ${
                isSelected
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,var(--bg-panel))] shadow-[0_0_24px_color-mix(in_srgb,var(--accent)_18%,transparent)] -translate-y-1"
                  : "border-[var(--line)] bg-[var(--bg-elev)] hover:border-white/20 hover:bg-[var(--bg-panel-hover)]"
              }`}
            >
              <div className="card-specular-rim" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--biz-dim)] font-bold text-sm text-[var(--accent-ink)] shadow-md">
                  {s.avatar}
                </div>
                <span className="chip text-[10px] text-[var(--accent-bright)]">
                  {s.sla}
                </span>
              </div>
              <h3 className="mt-3.5 text-base font-bold text-white tracking-tight">
                {s.name}
              </h3>
              <p className="text-xs font-semibold text-[var(--accent-bright)] mt-0.5">
                {s.role}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                {s.focus}
              </p>
              <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-[var(--line)]/60 pt-3">
                {s.tags.map((t) => (
                  <span key={t} className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-[var(--muted-dim)] border border-white/[0.05]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Booking Form or Confirmation */}
      {submitted ? (
        <section className="panel card-specular-rim relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 via-[var(--bg-panel)] to-[var(--bg-panel)] p-8 text-center shadow-2xl rise">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-3xl text-emerald-400 border border-emerald-500/40 shadow-[0_0_24px_rgba(52,211,153,0.3)]">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Consultation Request Confirmed
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)] max-w-lg mx-auto leading-relaxed">
            Thank you, <strong className="text-white">{name}</strong>. {selectedSpecialist} has received your request regarding <strong className="text-white">{topic}</strong>. A calendar invite and prep pack will arrive at <strong className="text-white">{email}</strong> shortly.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/my-agents" className="btn btn-primary text-xs">
              Go to My Agents
            </Link>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="btn btn-ghost text-xs"
            >
              Book Another Consultation
            </button>
          </div>
        </section>
      ) : (
        <section className="panel card-specular-rim relative overflow-hidden rounded-2xl border border-[var(--line)] p-6 sm:p-8 shadow-xl">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Request a Technical Deep-Dive Session
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Matched with: <strong className="text-[var(--accent-bright)]">{selectedSpecialist}</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-dim)] mb-1.5">
                Your Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className="input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-dim)] mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@enterprise.com"
                className="input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-dim)] mb-1.5">
                Organization / Company
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Corp Global"
                className="input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-dim)] mb-1.5">
                Consultation Topic
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="input"
              >
                <option value="enterprise-deployment">Enterprise Fleet Deployment (50+ Agents)</option>
                <option value="custom-connectors">Custom Connector &amp; MCP Integration</option>
                <option value="data-compliance">Data Residency &amp; Zero-Retention Audit</option>
                <option value="whatsapp-omnichannel">High-Volume WhatsApp &amp; Commerce Setup</option>
              </select>
            </div>

            <div className="sm:col-span-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary w-full sm:w-auto text-sm font-bold !py-2.5 !px-6 shadow-glow-sm"
              >
                {submitting ? "Booking Session…" : `Schedule Consultation with ${selectedSpecialist.split(" ")[0]} →`}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
