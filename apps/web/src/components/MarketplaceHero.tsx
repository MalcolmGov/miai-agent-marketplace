"use client";

import Link from "next/link";

/** Compact journey — one line, not a five-panel dashboard. */
const STEPS = ["Browse", "Rent", "Configure", "Go live"] as const;

export function MarketplaceHero({
  familyCount,
  workflowCount = 10,
}: {
  familyCount: number;
  categoryCount?: number;
  workflowCount?: number;
}) {
  const agentsLive = familyCount || 55;

  return (
    <section className="relative overflow-hidden pb-1 pt-2 sm:pt-3">
      <div
        aria-hidden
        className="hero-sheen pointer-events-none absolute -left-1/4 top-0 h-full w-[150%] opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 50% 80% at 20% 30%, rgba(20,150,138,0.14), transparent 55%), radial-gradient(ellipse 40% 60% at 80% 10%, rgba(56,120,190,0.1), transparent 50%)",
        }}
      />

      <div className="rise relative">
        <p className="display text-[clamp(2.4rem,5vw,3.75rem)] font-semibold leading-[1.05] tracking-tight text-[var(--text)]">
          MyInstant<span className="text-[var(--accent-bright)]">AI</span>
        </p>

        <h1 className="mt-3 max-w-2xl text-xl font-medium leading-snug tracking-tight text-[var(--muted)] sm:text-2xl">
          Hire an AI agent for your business
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">
          {agentsLive} ready-made agents for WhatsApp, web, and app — rent one, configure, go live.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a href="#catalogue" className="btn btn-primary">
            Browse agents
          </a>
          <Link href="/agents/us-executive-assistant" className="btn btn-ghost">
            Try a workflow agent
          </Link>
        </div>

        <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted-dim)]">
          <span className="font-medium text-[var(--muted)]">How it works</span>
          {STEPS.map((step, i) => (
            <span key={step} className="inline-flex items-center gap-2">
              {i > 0 ? <span aria-hidden className="text-[var(--line-strong)]">→</span> : null}
              <span>
                <span className="text-[var(--accent)]">{i + 1}.</span> {step}
              </span>
            </span>
          ))}
          <span className="text-[var(--muted-dim)]">· {workflowCount} multi-step workflows</span>
        </p>
      </div>
    </section>
  );
}

export function MarketplaceCTA() {
  return (
    <section className="cta-banner rise" aria-label="Custom agents">
      <div className="min-w-0 flex-1">
        <h2 className="display text-lg font-semibold tracking-tight text-[var(--text)] sm:text-xl">
          Don&apos;t see what you need?
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
          Tell us the job and we&apos;ll scope a custom agent for your operations.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Link href="/create" className="btn btn-ghost !text-sm">
          Describe a job
        </Link>
        <Link href="/request" className="btn btn-primary !text-sm">
          Request a custom agent
          <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
