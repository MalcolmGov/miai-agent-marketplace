import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersonalAgent } from "@/lib/consumer-catalog";
import { AgentIcon } from "@/components/AgentIcon";
import { specialistStarters } from "@/lib/consumer-specialist-starters";
import SpecialistChat from "./SpecialistChat";

/** Friendly one-word label for the consumer taxonomy (vertical/front-office/commerce). */
function audienceLabel(category: string): string {
  if (category === "front-office") return "Companion";
  if (category === "commerce") return "Concierge";
  return "Specialist";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const agent = await getPersonalAgent(id);
  if (!agent) return { title: "Specialist — MyInstantAI" };
  return { title: `${agent.name} — MyInstantAI`, description: agent.summary };
}

/**
 * A single consumer specialist's own page — its identity (icon, name, what it does), what's
 * included, and, when the agent is certified, a chat scoped to just that agent. Distinct from the
 * general assistant at /me: this presents the specialist rather than a personal-assistant surface.
 */
export default async function SpecialistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getPersonalAgent(id);
  if (!agent) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-10">
      <Link
        href="/personal"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--muted)] transition hover:text-[var(--text)]"
        data-testid="specialist-back"
      >
        <span aria-hidden>←</span> All specialists
      </Link>

      {/* Identity */}
      <section className="panel flex flex-col gap-4 p-6">
        <div className="flex items-start gap-4">
          <AgentIcon familyId={agent.id} category={agent.category} className="h-14 w-14" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-bright)]">
              {audienceLabel(agent.category)}
            </p>
            <h1 className="display mt-1 text-[clamp(1.5rem,4vw,2rem)] font-semibold leading-tight tracking-tight text-[var(--text)]">
              {agent.name}
            </h1>
          </div>
          {agent.certified ? (
            <span className="chip chip-live shrink-0 whitespace-nowrap">✓ Tested</span>
          ) : (
            <span className="chip shrink-0 whitespace-nowrap">In certification</span>
          )}
        </div>
        <p className="text-[15px] leading-relaxed text-[var(--card-body)]">{agent.summary}</p>
        {agent.badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {agent.badges.map((b) => (
              <span key={b} className="chip">
                {b}
              </span>
            ))}
          </div>
        )}
        <p className="border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
          {agent.evals} behavioural tests · {agent.languages.join(" · ")} · metered on your prepaid balance
        </p>
      </section>

      {/* What's inside */}
      {agent.skus.length > 0 && (
        <section className="panel p-6">
          <h2 className="display text-base font-semibold tracking-tight text-[var(--text)]">
            What&apos;s inside
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--card-body)]">
            {agent.skus.map((sku) => (
              <li key={sku} className="flex items-start gap-2.5">
                <svg
                  aria-hidden
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-bright)]"
                >
                  <path d="m4.5 10.5 3.2 3.2L15.5 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{sku}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Chat — every specialist is usable; certification is a quality label, not a lock. */}
      <section className="flex flex-col gap-2.5" data-testid="specialist-chat">
        <h2 className="display text-base font-semibold tracking-tight text-[var(--text)]">
          Chat with your {agent.name}
        </h2>
        {!agent.certified && (
          <p
            className="rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-elev)_35%,transparent)] px-3.5 py-2.5 text-xs leading-relaxed text-[var(--muted)]"
            data-testid="in-certification-note"
          >
            <span className="font-semibold text-[var(--card-body)]">In certification.</span> This
            specialist is authored and safety-guardrailed, but hasn&apos;t finished behavioural
            testing yet — you can use it now, just expect the rough edges we&apos;re still ironing out.
          </p>
        )}
        <SpecialistChat
          agentId={agent.id}
          agentName={agent.name}
          starters={specialistStarters(agent.id)}
        />
      </section>
    </div>
  );
}
