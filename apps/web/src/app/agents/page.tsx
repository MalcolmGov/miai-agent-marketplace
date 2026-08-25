import type { Metadata } from "next";
import Link from "next/link";
import { listPersonalAgents } from "@/lib/consumer-catalog";
import { listFamilies, INDEXED_AGENT_COUNT, INDEXED_MARKETS } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "AI Agents — MyInstantAI",
  description:
    "Ready-made AI agents you can rent on your prepaid balance — for you and your family, or for your business. Pick a lane to start.",
};

/**
 * AI Agents hub — a single entry point (one nav tab) that presents BOTH agent
 * marketplaces and lets the person choose their lane:
 *   • Consumer Agents  → /personal  (17 prepaid, anonymous family agents)
 *   • Business Agents  → /          (500 ready-made agents across 5 markets)
 * Counts are read live from the same loaders each marketplace uses, so they never drift.
 */
export default async function AgentsHubPage() {
  const [personal, families] = await Promise.all([listPersonalAgents(), listFamilies()]);
  const certified = personal.filter((a) => a.certified).length;
  const industries = new Set(families.map((f) => f.marketplaceCategory)).size;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Header */}
      <header className="rise space-y-3 pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-bright)]">
          AI Agents
        </p>
        <h1 className="display text-[clamp(1.8rem,5vw,2.6rem)] font-semibold leading-[1.1] tracking-tight text-[var(--text)]">
          Rent a ready-made AI agent
        </h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--card-body)]">
          Ready-made AI agents you can rent on your prepaid balance. Pick a lane — for you and your
          family, or for your business.
        </p>
      </header>

      {/* Two lanes */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Consumer lane — teal */}
        <article
          className="panel relative flex flex-col overflow-hidden p-6"
          data-testid="lane-consumer"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 55%)",
            }}
          />
          <div className="relative flex flex-1 flex-col">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl text-xl"
              style={{
                background: "color-mix(in srgb, var(--accent) 14%, var(--bg-panel))",
                color: "var(--accent-bright)",
              }}
              aria-hidden
            >
              👨‍👩‍👧
            </span>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.13em] text-[var(--accent-bright)]">
              For you &amp; your family
            </p>
            <h2 className="display mt-1 text-xl font-semibold tracking-tight text-[var(--text)]">
              Consumer Agents
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--card-body)]">
              Specialist agents on one prepaid, anonymous household balance — a homework tutor, an
              English coach, a private confidant. Kid-safe and crisis-safe by design.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="chip">{personal.length} agents</span>
              <span className="chip">{certified} ✓ tested</span>
              <span className="chip">prepaid · no account</span>
            </div>
            <div className="mt-6 pt-2">
              <Link href="/personal" className="btn btn-primary" data-testid="go-consumer">
                Browse family agents
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </article>

        {/* Business lane — blue */}
        <article
          className="panel relative flex flex-col overflow-hidden p-6"
          data-testid="lane-business"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, var(--biz) 18%, transparent), transparent 55%)",
            }}
          />
          <div className="relative flex flex-1 flex-col">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl text-xl"
              style={{
                background: "color-mix(in srgb, var(--biz) 16%, var(--bg-panel))",
                color: "var(--biz-bright)",
              }}
              aria-hidden
            >
              🏢
            </span>
            <p
              className="mt-4 text-[11px] font-semibold uppercase tracking-[0.13em]"
              style={{ color: "var(--biz-bright)" }}
            >
              For your business
            </p>
            <h2 className="display mt-1 text-xl font-semibold tracking-tight text-[var(--text)]">
              Business Agents
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--card-body)]">
              {INDEXED_AGENT_COUNT} ready-made agents across {families.length} families and{" "}
              {INDEXED_MARKETS.length} markets. Hire, configure, connect your systems, and go live —
              front office, finance, ops and more.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="chip">{INDEXED_AGENT_COUNT} agents</span>
              <span className="chip">{families.length} families</span>
              <span className="chip">{industries} industries</span>
            </div>
            <div className="mt-6 pt-2">
              <Link
                href="/"
                className="btn"
                data-testid="go-business"
                style={{ background: "var(--biz)", color: "var(--biz-ink)" }}
              >
                Browse business agents
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
