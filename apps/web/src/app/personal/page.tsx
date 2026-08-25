import type { Metadata } from "next";
import Link from "next/link";
import { listPersonalAgents } from "@/lib/consumer-catalog";
import { AgentIcon } from "@/components/AgentIcon";

/** Friendly one-word label for the consumer taxonomy (vertical/front-office/commerce). */
function audienceLabel(category: string): string {
  if (category === "front-office") return "Companion";
  if (category === "commerce") return "Concierge";
  return "Specialist";
}

export const metadata: Metadata = {
  title: "For you & your family — MyInstantAI",
  description:
    "Specialist AI agents for you and your household — a homework tutor, an English coach, exam prep and a private confidant — on one prepaid balance. No account, no subscription; each agent is fenced to its job and kid-safe by design.",
};

/**
 * Consumer marketplace — the CONSUMER-mode landing surface.
 *
 * Leads with the prepaid specialist families (the flagship consumer line), each browsable as a
 * card. The general personal assistant is demoted to a single "or just chat" entry at the foot.
 * Data comes from the same loader/section the /api/catalog/personal route and the assistant rail
 * use (data/catalog-consumer), so the marketplace never drifts from the catalogue.
 */
export default async function PersonalMarketplacePage() {
  const agents = await listPersonalAgents();

  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-10">
      {/* Hero */}
      <section className="rise space-y-4 pt-2 text-center sm:pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-bright)]">
          For you &amp; your family
        </p>
        <h1 className="display text-[clamp(1.9rem,6vw,3rem)] font-semibold leading-[1.08] tracking-tight text-[var(--text)]">
          Specialist agents, on one prepaid balance
        </h1>
        <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-[var(--card-body)]">
          Focused AI agents the whole household shares — each one fenced to its job, priced in
          sessions, and covered by per-member limits. No account, no subscription: redeem a card and
          go. Kid-safe and crisis-safe by design.
        </p>
        <div className="flex flex-col items-center justify-center gap-2.5 pt-1 sm:flex-row sm:gap-3">
          <Link href="/get-started" className="btn btn-primary" data-testid="personal-get-started">
            Get started
            <span aria-hidden>→</span>
          </Link>
          <Link href="/assistant" className="btn btn-ghost" data-testid="personal-just-chat">
            Or just chat with the assistant
          </Link>
        </div>
      </section>

      {/* The families */}
      {agents.length > 0 ? (
        <section className="space-y-4" data-testid="personal-marketplace">
          <p className="text-center text-xs text-[var(--muted)]">
            {agents.filter((a) => a.certified).length} tested &amp; live · {agents.filter((a) => !a.certified).length} in certification
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <article
                key={agent.id}
                data-testid="personal-agent-card"
                className={`panel flex flex-col gap-4 p-5 text-left ${agent.certified ? "panel-interactive" : ""}`}
              >
                {/* Header: icon · label + name · status */}
                <div className="flex items-start gap-3.5">
                  <AgentIcon familyId={agent.id} category={agent.category} className="h-11 w-11" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[var(--accent-bright)]">
                      {audienceLabel(agent.category)}
                    </p>
                    <h2 className="display mt-0.5 text-[1.05rem] font-semibold leading-tight tracking-tight text-[var(--text)]">
                      {agent.name}
                    </h2>
                  </div>
                  {agent.certified && (
                    <span className="chip chip-live shrink-0 whitespace-nowrap">✓ Tested</span>
                  )}
                </div>

                <p className="text-sm leading-relaxed text-[var(--card-body)]">{agent.summary}</p>

                {agent.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {agent.badges.map((b) => (
                      <span key={b} className="chip">
                        {b}
                      </span>
                    ))}
                  </div>
                )}

                {agent.skus.length > 0 && (
                  <ul className="space-y-1.5 text-xs text-[var(--card-body)]">
                    {agent.skus.map((sku) => (
                      <li key={sku} className="flex items-start gap-2">
                        <svg
                          aria-hidden
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.2}
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-bright)]"
                        >
                          <path d="m4.5 10.5 3.2 3.2L15.5 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>{sku}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Footer: meta · action */}
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3.5">
                  <span className="text-[11px] leading-tight text-[var(--muted)]">
                    {agent.evals} tests{agent.certified ? "" : " authored"} · {agent.languages.join(" · ")}
                  </span>
                  {agent.certified ? (
                    <Link
                      href={`/me?agent=${encodeURIComponent(agent.id)}&label=${encodeURIComponent(agent.name)}`}
                      className="btn btn-primary shrink-0 px-3.5 py-2 text-[13px]"
                      data-testid="personal-try"
                    >
                      Try free
                      <span aria-hidden>→</span>
                    </Link>
                  ) : (
                    <span
                      className="shrink-0 whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]"
                      data-testid="in-certification"
                    >
                      In certification
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <p className="text-center text-sm text-[var(--muted)]">
          The family catalogue is being set up — check back shortly.
        </p>
      )}

      {/* Trust strip */}
      <section className="panel p-6 text-center sm:p-8">
        <h2 className="display text-xl font-semibold tracking-tight text-[var(--text)]">
          Built for a household, safe for kids
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[var(--card-body)]">
          One card, one shared balance, per-member caps. Each agent stays in its lane, guides rather
          than does the work, and routes anything worrying to the adult who owns the workspace —
          with a category only, never the conversation.
        </p>
      </section>
    </div>
  );
}
