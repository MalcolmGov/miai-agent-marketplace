"use client";

import Link from "next/link";

const STEPS = [
  {
    n: 1,
    title: "Browse",
    body: "Pick an agent from the catalogue",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M20 20l-3.2-3.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    n: 2,
    title: "Rent",
    body: "Monthly by tier — sandbox is free",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
        <path d="M4 6h2l2.2 10h9.6l2-7H8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="11" cy="20" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="17" cy="20" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    n: 3,
    title: "Configure",
    body: "WhatsApp, website or your app",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
        <circle cx="12" cy="12" r="3" />
        <path
          d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6.2 6.2l1.4 1.4M16.4 16.4l1.4 1.4M17.8 6.2l-1.4 1.4M7.6 16.4l-1.4 1.4"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    n: 4,
    title: "Go live",
    body: "One payment — rental + tokens",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
        <path d="M13 3 5 14h6l-1 7 9-12h-6l0-6Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    n: 5,
    title: "Live",
    body: "Answering your customers 24/7",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
        <circle cx="12" cy="12" r="8" />
        <path d="m8.5 12.5 2.2 2.2 4.8-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function MarketplaceHero({
  familyCount,
  categoryCount,
  workflowCount = 8,
}: {
  familyCount: number;
  categoryCount: number;
  workflowCount?: number;
}) {
  const agentsLive = familyCount || 55;
  const categories = categoryCount || 10;
  const workflows = workflowCount || 8;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden pb-2 pt-2 sm:pt-4">
        <div
          aria-hidden
          className="hero-sheen pointer-events-none absolute -left-1/4 top-0 h-full w-[150%] opacity-50"
          style={{
            background:
              "radial-gradient(ellipse 50% 80% at 20% 30%, rgba(61,214,198,0.16), transparent 55%), radial-gradient(ellipse 40% 60% at 80% 10%, rgba(94,168,240,0.1), transparent 50%)",
          }}
        />

        <div className="rise relative">
          <p className="text-[12px] text-[var(--muted)]">
            <span className="text-[var(--accent)]">AI Agents</span>
            <span className="mx-1.5 text-[var(--muted-dim)]">›</span>
            <span>Marketplace</span>
          </p>

          <p className="mt-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
            <span className="inline-block h-px w-5 bg-[var(--accent)]" />
            AI agent marketplace
          </p>

          <h1 className="display mt-3 max-w-3xl text-[2rem] font-semibold leading-[1.12] tracking-tight text-[var(--text)] sm:text-4xl lg:text-[2.65rem]">
            Hire an{" "}
            <span className="bg-gradient-to-r from-[var(--accent-bright)] to-[#7ec8f0] bg-clip-text text-transparent">
              AI agent
            </span>{" "}
            for your business
          </h1>

          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--muted)] sm:text-base">
            Ready-made agents for WhatsApp, your website, or your app — including multi-step
            workflows that propose a plan, wait for your confirm, then run Calendar, Slack, and more
            on your MyInstantAI tokens.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href="#catalogue" className="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M20 20l-3.2-3.2" strokeLinecap="round" />
              </svg>
              Browse agents
            </a>
            <Link href="/agents/us-executive-assistant" className="btn btn-ghost">
              Try Executive Assistant
            </Link>
            <Link href="/my-agents" className="btn btn-ghost">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
                <rect x="4" y="4" width="6" height="6" rx="1" />
                <rect x="14" y="4" width="6" height="6" rx="1" />
                <rect x="4" y="14" width="6" height="6" rx="1" />
                <rect x="14" y="14" width="6" height="6" rx="1" />
              </svg>
              My Agents
            </Link>
          </div>
        </div>
      </section>

      <section className="how-flow rise" style={{ animationDelay: "60ms" }} aria-label="How it works">
        <div className="how-flow-track" aria-hidden />
        <ol className="how-flow-steps">
          {STEPS.map((step) => (
            <li key={step.n} className="how-step">
              <div className="how-step-icon">
                <span className="how-step-num">{step.n}</span>
                {step.icon}
              </div>
              <p className="mt-3 text-sm font-semibold text-[var(--text)]">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Marketplace highlights">
        <StatCard text={`${agentsLive} agents live in the runtime today`} />
        <StatCard text={`${workflows} multi-step workflow agents`} />
        <StatCard text={`${categories} industry categories`} />
        <StatCard text="Confirm-before-write · Calendar + Slack" />
      </section>
    </div>
  );
}

function StatCard({ text }: { text: string }) {
  return (
    <div className="panel px-4 py-4 text-sm leading-snug text-[var(--muted)]">
      <span className="text-[var(--text)]">{text}</span>
    </div>
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
          Tell us the job — the workflow, the systems it touches, the channel your customers use —
          and we&apos;ll build a custom agent for your operations.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Link href="/scan" className="btn btn-ghost !text-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-3.2-3.2" strokeLinecap="round" />
          </svg>
          Scan my website
        </Link>
        <Link href="/create" className="btn btn-ghost !text-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4 text-[var(--warn)]">
            <path
              d="M12 3l1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z"
              strokeLinejoin="round"
            />
          </svg>
          Build an agent instantly
        </Link>
        <Link href="/request" className="btn btn-primary !text-sm">
          Request a custom agent
          <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
