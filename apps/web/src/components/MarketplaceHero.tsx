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
        className="hero-sheen pointer-events-none absolute -left-1/4 top-0 h-full w-[150%] opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 50% 80% at 20% 30%, rgba(61,214,198,0.16), transparent 55%), radial-gradient(ellipse 40% 60% at 80% 10%, rgba(94,168,240,0.1), transparent 50%)",
        }}
      />

      <div className="rise relative">
        <p className="display text-[clamp(2.4rem,5vw,3.75rem)] font-semibold leading-[1.05] tracking-tight text-[var(--text)]">
          MyInstant<span className="text-[var(--accent-bright)]">AI</span>
        </p>

        <h1 className="mt-3 max-w-2xl text-xl font-medium leading-snug tracking-tight text-[var(--muted)] sm:text-2xl">
          {t("hero.headline")}
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">
          {t("hero.lede", { count: agentsLive })}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a href="#catalogue" className="btn btn-primary">
            {t("hero.browse")}
          </a>
          <Link href="/demo" className="btn btn-ghost">
            {t("hero.mondayDemo")}
          </Link>
        </div>

        <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted-dim)]">
          <span className="font-medium text-[var(--muted)]">{t("hero.howItWorks")}</span>
          {steps.map((step, i) => (
            <span key={`${step}-${i}`} className="inline-flex items-center gap-2">
              {i > 0 ? <span aria-hidden className="text-[var(--line-strong)]">→</span> : null}
              <span>
                <span className="text-[var(--accent)]">{i + 1}.</span> {step}
              </span>
            </span>
          ))}
          <span className="text-[var(--muted-dim)]">
            · {t("hero.workflows", { count: workflowCount })}
          </span>
        </p>
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
