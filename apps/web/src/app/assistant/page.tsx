import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  CAPABILITY_GROUPS,
  CONNECTOR_LABEL,
} from "@/lib/assistant-capabilities";
import { listPersonalAgents } from "@/lib/consumer-catalog";

export const metadata: Metadata = {
  title: "Your personal AI assistant — MyInstantAI",
  description:
    "A personal AI that handles your email, calendar, reminders and errands — and remembers your preferences across every conversation. Start free on prepaid credits.",
};

/**
 * Consumer entry point — the landing page a person reaches before the assistant itself.
 *
 * A marketplace buyer arrives cold; this page transfers the mental model (a capable everyday
 * assistant, grouped by life-area), shows the "remembers you" differentiator, and routes into the
 * live assistant at /me. It reuses the same capability data the in-app onboarding does, so the
 * pitch and the product never drift.
 */
export default async function AssistantLandingPage() {
  const connectors = Object.values(CONNECTOR_LABEL);
  const personalAgents = await listPersonalAgents();

  return (
    <div className="mx-auto max-w-5xl space-y-14 pb-10">
      {/* Hero */}
      <section className="rise grid items-center gap-8 pt-2 sm:pt-4 md:grid-cols-2 md:gap-10">
        <div className="text-center md:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-bright)]">
            Your personal AI
          </p>
          <h1 className="display mt-3 text-[clamp(1.9rem,6vw,3rem)] font-semibold leading-[1.08] tracking-tight text-[var(--text)]">
            An assistant that knows you and gets things done
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--card-body)] md:mx-0">
            It handles your inbox, calendar, reminders and the small errands that eat your day — and
            it remembers your preferences, so you never repeat yourself. Just talk to it normally.
          </p>
          <div className="mt-7 flex flex-col items-center gap-2.5 sm:flex-row sm:gap-3 md:justify-start">
            <Link href="/me" className="btn btn-primary w-full sm:w-auto" data-testid="assistant-start">
              Start using your assistant
              <span aria-hidden>→</span>
            </Link>
            <Link href="/me/connectors" className="btn btn-ghost w-full sm:w-auto">
              Connect your accounts
            </Link>
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">
            Runs on prepaid credits · confirms with you before sending or changing anything
          </p>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_6%,var(--bg-panel))] shadow-[var(--shadow-panel)]">
          <Image
            src="/img/assistant-hero.webp"
            alt="Friendly AI assistants managing a calendar, messages, a to-do list and the weather"
            width={1200}
            height={896}
            priority
            sizes="(max-width: 768px) 100vw, 480px"
            className="h-auto w-full"
          />
        </div>
      </section>

      {/* Capabilities */}
      <section className="space-y-5">
        <div className="text-center">
          <h2 className="display text-2xl font-semibold tracking-tight text-[var(--text)]">
            Everything it can take off your plate
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[var(--card-body)]">
            The top two work the moment you start — no setup. Connect your accounts to unlock the rest.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {CAPABILITY_GROUPS.map((group) => (
            <article key={group.key} className="panel p-5">
              <div className="flex items-start gap-3.5">
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--accent)_28%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-lg leading-none"
                >
                  {group.icon}
                </span>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
                      {group.title}
                    </h3>
                    {group.needs.length === 0 ? (
                      <span className="chip chip-live text-[10px]">No setup</span>
                    ) : null}
                  </div>
                  <p className="text-[13px] leading-relaxed text-[var(--card-body)]">{group.blurb}</p>
                  <ul className="space-y-1 pt-0.5">
                    {group.examples.slice(0, 2).map((ex) => (
                      <li key={ex} className="text-[13px] italic leading-snug text-[var(--card-meta)]">
                        “{ex}”
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Differentiator: memory */}
      <section className="panel p-6 text-center sm:p-8">
        <span aria-hidden className="text-2xl">🧠</span>
        <h2 className="display mt-3 text-2xl font-semibold tracking-tight text-[var(--text)]">
          It actually remembers you
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--card-body)]">
          Tell it you&apos;re vegetarian, how you sign your emails, or your kids&apos; names — once. It
          keeps that across every conversation and uses it naturally, so it feels like{" "}
          <span className="text-[var(--text)]">yours</span>, not a generic chatbot that forgets you
          the moment you close the tab.
        </p>
      </section>

      {/* Personal agents — specialist coaches for the household */}
      {personalAgents.length > 0 && (
        <section className="space-y-5" data-testid="personal-agents">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-bright)]">
              For you &amp; your family
            </p>
            <h2 className="display mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">
              Specialist coaches, on the same balance
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[var(--card-body)]">
              Beyond your everyday assistant: focused agents the whole household shares — each one
              fenced to its job, priced in sessions, and covered by the family workspace&apos;s
              per-member limits.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {personalAgents.map((agent) => (
              <article key={agent.id} className="panel flex flex-col gap-3 p-5 text-left">
                <div>
                  <h3 className="display text-lg font-semibold tracking-tight text-[var(--text)]">
                    {agent.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--card-body)]">
                    {agent.summary}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="chip">Multilingual</span>
                  {agent.badges.map((b) => (
                    <span key={b} className="chip">
                      {b}
                    </span>
                  ))}
                </div>
                <p className="mt-auto text-xs text-[var(--muted)]">
                  {agent.evals} behavioural tests
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Works with your apps */}
      <section className="space-y-4 text-center">
        <h2 className="display text-2xl font-semibold tracking-tight text-[var(--text)]">
          Works with the apps you already use
        </h2>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-[var(--card-body)]">
          Connect only what you want. Your data stays yours — the assistant never sends an email or
          changes your calendar without confirming with you first, and it never stores passwords or
          card numbers.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {connectors.map((label) => (
            <span key={label} className="chip">
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="cta-banner rise">
        <div className="min-w-0 flex-1">
          <h2 className="display text-lg font-semibold tracking-tight text-[var(--text)] sm:text-xl">
            Ready when you are
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--card-body)]">
            Start with a question — the weather for your run, a dinner spot nearby, or a fact worth
            remembering. No setup required.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/me" className="btn btn-primary !text-sm">
            Start using your assistant
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
