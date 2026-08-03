"use client";

import Link from "next/link";
import { useT } from "@/lib/locale";

export function MarketplaceHero({
  familyCount,
  agentCount = 500,
  workflowCount = 10,
}: {
  familyCount: number;
  /** Indexed catalogue SKUs (100 families × 5 regions). */
  agentCount?: number;
  categoryCount?: number;
  workflowCount?: number;
}) {
  const t = useT();
  const agentsLive = agentCount || familyCount * 5 || 500;
  const steps = [
    t("hero.stepBrowse"),
    t("hero.stepRent"),
    t("hero.stepConfigure"),
    t("hero.stepGoLive"),
  ] as const;

  return (
    <section className="relative overflow-hidden pb-1 pt-2 sm:pt-3">
      <div
        aria-hidden
        className="hero-sheen hero-sheen-contained pointer-events-none absolute opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 50% 80% at 20% 30%, rgba(61,214,198,0.16), transparent 55%), radial-gradient(ellipse 40% 60% at 80% 10%, rgba(94,168,240,0.1), transparent 50%)",
        }}
      />

      <div className="rise relative">
        <p className="display text-[clamp(2rem,9vw,3.75rem)] font-semibold leading-[1.05] tracking-tight text-[var(--text)]">
          MyInstant<span className="text-[var(--accent-bright)]">AI</span>
        </p>

        <h1 className="mt-3 max-w-2xl text-lg font-medium leading-snug tracking-tight text-[var(--muted)] sm:text-2xl">
          {t("hero.headline")}
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">
          {t("hero.lede", { count: agentsLive })}
        </p>

        <div className="mt-5 flex flex-col gap-2.5 sm:mt-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <a href="#catalogue" className="btn btn-primary w-full sm:w-auto">
            {t("hero.browse")}
          </a>
          <Link href="/get-started" className="btn btn-ghost w-full sm:w-auto" data-testid="hero-business-setup">
            {t("hero.businessSetup")}
          </Link>
        </div>

        <div className="mt-5 space-y-2 text-xs text-[var(--muted-dim)] sm:mt-6">
          <p className="font-medium text-[var(--muted)]">{t("hero.howItWorks")}</p>
          <ol className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1">
            {steps.map((step, i) => (
              <li key={`${step}-${i}`} className="inline-flex min-w-0 items-center gap-1.5">
                <span className="text-[var(--accent)]">{i + 1}.</span>
                <span className="truncate">{step}</span>
              </li>
            ))}
          </ol>
          <p>{t("hero.workflows", { count: workflowCount })}</p>
        </div>
      </div>
    </section>
  );
}

export function MarketplaceCTA() {
  const t = useT();

  return (
    <section className="cta-banner rise" aria-label={t("cta.title")}>
      <div className="min-w-0 flex-1">
        <h2 className="display text-lg font-semibold tracking-tight text-[var(--text)] sm:text-xl">
          {t("cta.title")}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">{t("cta.body")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Link href="/create" className="btn btn-ghost !text-sm">
          {t("cta.describe")}
        </Link>
        <Link href="/request" className="btn btn-primary !text-sm">
          {t("cta.request")}
          <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
