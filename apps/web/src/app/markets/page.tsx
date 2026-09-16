import type { Metadata } from "next";
import Link from "next/link";
import { listCatalog } from "@/lib/catalog";
import { marketLocalizationMatrix, showcaseSummaries } from "@/lib/localization";

export const metadata: Metadata = {
  title: "Five localized markets — MyInstantAI Agents",
  description:
    "Every agent family ships as regional packs — localized compliance regimes, languages and channel mix for US, EU, Africa, Asia and Oceania.",
};

export const dynamic = "force-dynamic";

function chips(list: string[], tone: "emerald" | "slate", n = 9) {
  const shown = list.slice(0, n);
  return (
    <>
      {shown.map((x) => (
        <span
          key={x}
          className={
            tone === "emerald"
              ? "rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-400"
              : "rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--card-body)]"
          }
        >
          {x.replace(/_/g, " ")}
        </span>
      ))}
      {list.length > n ? (
        <span className="text-[10px] text-[var(--muted)]">+{list.length - n}</span>
      ) : null}
    </>
  );
}

export default async function MarketsPage() {
  const [entries, matrix, showcase] = await Promise.all([
    listCatalog(),
    marketLocalizationMatrix(),
    showcaseSummaries("sales-closer"),
  ]);
  const totalSkus = matrix.reduce((n, m) => n + m.skus, 0);
  // Indexed families only — keeps the headline arithmetic exact (families × 5 = agents).
  const familyCount = new Set(
    entries.map((e) => e.id.replace(/^(us|eu|africa|asia|oceania)-/, "")),
  ).size;

  return (
    <div className="biz-market mx-auto max-w-6xl space-y-8 px-4 py-10">
      <header className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-bright)]">
          {totalSkus} agents · {familyCount} families · 5 regional packs each
        </p>
        <h1 className="display text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">
          One catalogue. Five localized markets.
        </h1>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          Every agent family ships as five regional packs — each with its own compliance framing,
          language set, channel mix and localized copy. The same agent your customer rents in
          New York exists, compliant and localized, for London, Lagos, Singapore and Sydney.
        </p>
        <div className="flex justify-center gap-2 pt-1">
          <Link href="/agents" className="btn btn-primary text-xs">
            Browse the catalogue →
          </Link>
          <Link
            href="/get-started"
            className="btn btn-ghost text-xs"
          >
            Get started free
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {matrix.map((m) => (
          <div key={m.market} className="panel space-y-3 p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
                <span aria-hidden>{m.flag}</span>
                {m.label}
              </p>
              <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                {m.skus} agents
              </span>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Compliance regimes
              </p>
              <div className="flex flex-wrap gap-1">{chips(m.compliance, "emerald", 6)}</div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Languages
              </p>
              <div className="flex flex-wrap gap-1">{chips(m.languages, "slate", 8)}</div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Channel mix
              </p>
              <div className="flex flex-wrap gap-1">{chips(m.channels, "slate", 5)}</div>
            </div>
          </div>
        ))}
      </section>

      {showcase.length >= 2 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">Same agent, five regions</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Example — the Sales Closer family, as buyers see it per market. Each card links to
              that region&apos;s studio.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {showcase.map((s) => (
              <Link
                key={s.market}
                href={`/agents/${s.packId}`}
                className="panel flex flex-col gap-2 p-4 transition-colors hover:border-[var(--accent)]"
              >
                <p className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
                  <span aria-hidden>{s.flag}</span>
                  {s.label}
                </p>
                <p className="text-xs leading-relaxed text-[var(--card-body)]">
                  {s.summary.slice(0, 200)}
                  {s.summary.length > 200 ? "…" : ""}
                </p>
                <span className="mt-auto text-[11px] font-semibold text-[var(--accent-bright)]">
                  Open studio →
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel p-5">
        <h2 className="text-sm font-semibold text-[var(--text)]">How the five-market model works</h2>
        <ul className="mt-3 grid gap-2 text-xs leading-relaxed text-[var(--card-body)] sm:grid-cols-3">
          <li>
            <span className="font-semibold text-[var(--text)]">One family, five SKUs.</span> Buyers
            rent the pack for their market — compliance, pricing framing and copy come localized
            out of the box.
          </li>
          <li>
            <span className="font-semibold text-[var(--text)]">Right channel by default.</span>{" "}
            WhatsApp-first for Africa, SMS-heavy for the US, web/app for the EU — each pack ships
            with its market&apos;s expected mix.
          </li>
          <li>
            <span className="font-semibold text-[var(--text)]">Same platform underneath.</span>{" "}
            Knowledge, connectors and tokens work identically in every region — the localization is
            in the pack, not a fork.
          </li>
        </ul>
      </section>
    </div>
  );
}
