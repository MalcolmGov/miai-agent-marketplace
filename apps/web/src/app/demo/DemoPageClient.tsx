"use client";

import Link from "next/link";
import { useT } from "@/lib/locale";
import {
  DEMO_SCRIPT_STEPS,
  GO_LIVE_55_MORE,
  GO_LIVE_100_MORE,
  MONDAY_PILOT_CARDS,
} from "@/lib/monday-pilot";

export function DemoPageClient() {
  const t = useT();

  return (
    <div className="space-y-8">
      <div className="rise">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          {t("demo.eyebrow")}
        </p>
        <h1 className="display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("demo.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">
          {t("demo.lede")}
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link href="/#catalogue" className="btn btn-primary">
            {t("demo.browseFull")}
          </Link>
          <Link href="/?pilot=1#catalogue" className="btn btn-ghost">
            {t("demo.shortlist")}
          </Link>
          <Link href="/trust" className="btn btn-ghost">
            {t("demo.trust")}
          </Link>
          <a
            href="https://miaiweb-production.up.railway.app/demo"
            className="btn btn-ghost"
            target="_blank"
            rel="noreferrer"
          >
            {t("demo.staging")}
          </a>
        </div>
      </div>

      <section className="panel overflow-hidden" aria-labelledby="pilot-heading">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 id="pilot-heading" className="text-sm font-semibold uppercase tracking-wider">
            {t("demo.shortlistHeading")}
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">{t("demo.shortlistSub")}</p>
        </div>
        <div className="border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] px-5 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent-bright)]">
            {t("demo.featured18")}
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
                  <span className="chip !px-2 !py-0.5 text-[10px] capitalize">
                    {card.audience === "internal" ? t("catalog.internal") : t("catalog.customer")}
                  </span>
                  <span className="rounded-md bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--accent-bright)]">
                    {t("catalog.multiStep")}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-[var(--muted)]">{card.blurb}</p>
                <p className="mt-2 text-xs text-[var(--muted-dim)]">
                  {t("demo.try")}:{" "}
                  <span className="text-[var(--card-body)]">“{card.prompt}”</span>
                </p>
              </div>
              <Link
                href={`/agents/${card.demoAgentId}`}
                className="btn btn-ghost shrink-0 !px-3 !py-2 text-xs sm:text-sm"
              >
                {t("catalog.rentSetup")}
              </Link>
            </li>
          ))}
        </ul>
        <div className="border-t border-[var(--line)] px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            {t("demo.more37")}
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {GO_LIVE_55_MORE.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/agents/${row.demoAgentId}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] px-3 py-2 text-sm transition hover:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
                >
                  <span className="min-w-0 truncate font-medium text-[var(--text)]">{row.name}</span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--muted-dim)]">
                    {row.audience === "internal" ? t("catalog.internal") : t("catalog.customer")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-[var(--line)] px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            {t("demo.more45")}
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {GO_LIVE_100_MORE.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/agents/${row.demoAgentId}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] px-3 py-2 text-sm transition hover:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
                >
                  <span className="min-w-0 truncate font-medium text-[var(--text)]">{row.name}</span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--muted-dim)]">
                    {row.audience === "internal" ? t("catalog.internal") : t("catalog.customer")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="panel overflow-hidden" aria-labelledby="script-heading">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 id="script-heading" className="text-sm font-semibold uppercase tracking-wider">
            {t("demo.scriptHeading")}
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">{t("demo.scriptSub")}</p>
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
                <Link
                  href={step.href}
                  className="text-sm font-semibold text-[var(--accent-bright)] hover:underline"
                >
                  {t("demo.open")}
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="cta-banner" aria-label={t("demo.closeTitle")}>
        <div className="min-w-0 flex-1">
          <h2 className="display text-lg font-semibold tracking-tight">{t("demo.closeTitle")}</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-[var(--muted)]">
            <li>· {t("demo.close1")}</li>
            <li>· {t("demo.close2")}</li>
            <li>· {t("demo.close3")}</li>
            <li>· {t("demo.close4")}</li>
          </ul>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/roadmap" className="btn btn-ghost !text-sm">
            {t("nav.roadmap")}
          </Link>
          <Link href="/admin" className="btn btn-primary !text-sm">
            {t("nav.agentAdmin")}
          </Link>
        </div>
      </section>
    </div>
  );
}
