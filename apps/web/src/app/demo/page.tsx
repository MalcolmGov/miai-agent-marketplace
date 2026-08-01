import Link from "next/link";
import { DEMO_SCRIPT_STEPS, MONDAY_PILOT_CARDS } from "@/lib/monday-pilot";

export const metadata = {
  title: "Monday demo — MyInstantAI Agents",
  description:
    "Platform annual license for 220 agents — demo shortlist and 12–15 minute commercial script.",
};

export default function DemoPage() {
  return (
    <div className="space-y-8">
      <div className="rise">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          Commercial readiness
        </p>
        <h1 className="display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Monday demo pack
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">
          Sell the <span className="font-semibold text-[var(--text)]">platform</span> — annual
          license for all <span className="font-semibold text-[var(--text)]">220 agents</span>.
          Pilot 6 below is the demo / UAT shortlist only, not a limited SKU deal. Leave-behind:{" "}
          <code className="text-[var(--accent-bright)]">docs/MONDAY_COMMERCIAL_PACK.md</code>
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link href="/#catalogue" className="btn btn-primary">
            Browse full catalogue
          </Link>
          <Link href="/?pilot=1#catalogue" className="btn btn-ghost">
            Demo shortlist (6)
          </Link>
          <Link href="/trust" className="btn btn-ghost">
            Trust Center
          </Link>
          <a
            href="https://miaiweb-production.up.railway.app/demo"
            className="btn btn-ghost"
            target="_blank"
            rel="noreferrer"
          >
            Staging URL
          </a>
        </div>
      </div>

      <section className="panel overflow-hidden" aria-labelledby="pilot-heading">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 id="pilot-heading" className="text-sm font-semibold uppercase tracking-wider">
            Demo shortlist — 6 of 220
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Depth for the room and Week‑3 UAT · license still covers the full catalogue
          </p>
        </div>
        <ul className="divide-y divide-[var(--line)]">
          {MONDAY_PILOT_CARDS.map((card, i) => (
            <li
              key={card.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-[var(--muted-dim)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-semibold text-[var(--text)]">{card.name}</h3>
                  <span className="chip !px-2 !py-0.5 text-[10px] capitalize">{card.audience}</span>
                  <span className="rounded-md bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--accent-bright)]">
                    Multi-step
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-[var(--muted)]">{card.blurb}</p>
                <p className="mt-2 text-xs text-[var(--muted-dim)]">
                  Try: <span className="text-[var(--card-body)]">“{card.prompt}”</span>
                </p>
              </div>
              <Link
                href={`/agents/${card.demoAgentId}`}
                className="btn btn-ghost shrink-0 !px-3 !py-2 text-xs sm:text-sm"
              >
                Rent / setup
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel overflow-hidden" aria-labelledby="script-heading">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 id="script-heading" className="text-sm font-semibold uppercase tracking-wider">
            Demo script — 12–15 minutes
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Rehearse once on staging. Under-claim on compliance; show Live tags on Trust.
          </p>
        </div>
        <ol className="divide-y divide-[var(--line)]">
          {DEMO_SCRIPT_STEPS.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                  {i + 1}. · ~{step.minutes} min
                </p>
                <h3 className="mt-1 font-semibold text-[var(--text)]">{step.title}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{step.detail}</p>
              </div>
              {step.href ? (
                <Link href={step.href} className="text-sm font-semibold text-[var(--accent-bright)] hover:underline">
                  Open →
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="cta-banner" aria-label="Commercial close">
        <div className="min-w-0 flex-1">
          <h2 className="display text-lg font-semibold tracking-tight">Monday close checklist</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-[var(--muted)]">
            <li>· Annual platform license = full 220 agents</li>
            <li>· Annual fee (+ optional cutover fee) agreed or parked with owners</li>
            <li>· Named owners: Auth, Wallet, Models, Azure, Commercial</li>
            <li>· Date for staging OIDC + wallet + model gateway</li>
          </ul>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/roadmap" className="btn btn-ghost !text-sm">
            Roadmap
          </Link>
          <Link href="/admin" className="btn btn-primary !text-sm">
            Agent Admin
          </Link>
        </div>
      </section>
    </div>
  );
}
