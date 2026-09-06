"use client";

import Link from "next/link";
import Image from "next/image";
import { useT } from "@/lib/locale";

/** Small leading glyph for the "Browse agents" CTA — a shuffle / route mark. */
function IconRoute() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
      <path d="M4 7h6l4 10h6M18 3l3 4-3 4M4 17h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" className="h-4 w-4" aria-hidden>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.6v2.5M12 18.9v2.5M4.4 7l2.1 1.3M17.5 15.7l2.1 1.3M4.4 17l2.1-1.3M17.5 8.3l2.1-1.3" strokeLinecap="round" />
    </svg>
  );
}

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

  // Headline with a highlighted fragment: "Hire [AI agents.] Scale your business."
  const headline = t("hero.headline");
  const accent = t("hero.headlineAccent");
  const idx = headline.indexOf(accent);
  const headlineParts =
    accent && idx >= 0
      ? { before: headline.slice(0, idx), mid: accent, after: headline.slice(idx + accent.length) }
      : { before: headline, mid: "", after: "" };

  const steps = [
    t("hero.stepBrowse"),
    t("hero.stepRent"),
    t("hero.stepConfigure"),
    t("hero.stepGoLive"),
  ] as const;

  return (
    <section className="biz-hero relative overflow-hidden pb-2 pt-2 sm:pt-3">
      <div
        aria-hidden
        className="hero-sheen hero-sheen-contained pointer-events-none absolute opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 50% 80% at 18% 30%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 55%), radial-gradient(ellipse 40% 60% at 82% 8%, color-mix(in srgb, var(--biz) 12%, transparent), transparent 50%)",
        }}
      />

      <div className="relative grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left — copy */}
        <div className="rise min-w-0">
          <div className="relative">
            <h1 className="display text-balance text-[clamp(2.1rem,5.4vw,3.4rem)] font-semibold leading-[1.06] tracking-tight text-[var(--text)]">
              {headlineParts.before}
              {headlineParts.mid ? (
                <span className="relative inline-block text-[var(--accent-bright)]">
                  {headlineParts.mid}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -inset-x-4 -inset-y-2 -z-10 rounded-full opacity-35 blur-xl"
                    style={{
                      background: "radial-gradient(ellipse, color-mix(in srgb, var(--accent) 40%, transparent) 0%, transparent 70%)",
                    }}
                  />
                </span>
              ) : null}
              {headlineParts.after}
            </h1>
          </div>

          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--card-body)] sm:text-base">
            {t("hero.lede", { count: agentsLive })}
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <a href="#catalogue" className="btn btn-primary w-full sm:w-auto shadow-[0_12px_28px_-10px_rgba(15,128,85,0.7)] hover:shadow-[0_16px_32px_-8px_rgba(15,128,85,0.8)]">
              <IconRoute />
              {t("hero.browse")}
            </a>
            <Link
              href="/get-started"
              className="btn btn-ghost w-full sm:w-auto hover:border-[var(--accent-dim)]"
              data-testid="hero-business-setup"
            >
              <IconGear />
              {t("hero.businessSetup")}
            </Link>
          </div>

          <div className="mt-7 space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-dim)]">
              {t("hero.howItWorks")}
            </p>
            <ol className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--card-body)]">
              {steps.map((step, i) => (
                <li key={`${step}-${i}`} className="inline-flex min-w-0 items-center gap-1.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[11px] font-bold text-[var(--accent-bright)] shadow-[0_0_10px_-2px_color-mix(in_srgb,var(--accent)_45%,transparent)]">
                    {i + 1}
                  </span>
                  <span className="font-medium">{step}</span>
                </li>
              ))}
            </ol>
            <p className="text-[13px] text-[var(--muted)]">{t("hero.workflows", { count: workflowCount })}</p>
          </div>
        </div>

        {/* Right — 3D AI Agent Hero illustration with floating telemetry badges (hidden on small screens) */}
        <div className="biz-hero-art relative hidden aspect-square w-full max-w-[460px] items-center justify-center justify-self-end lg:flex">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-4 rounded-full opacity-45 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--accent) 32%, transparent) 0%, color-mix(in srgb, var(--biz) 18%, transparent) 45%, transparent 70%)",
            }}
          />

          {/* Floating Telemetry 1 (Top Left) */}
          <div className="hero-telemetry-badge hero-telemetry-1 -left-5 top-5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_24%,transparent)] text-[var(--accent-bright)]">
              ✦
            </span>
            <span>500 Verified Agents</span>
          </div>

          {/* Floating Telemetry 2 (Bottom Left) */}
          <div className="hero-telemetry-badge hero-telemetry-2 -left-3 bottom-12">
            <span className="pulse-dot h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
            <span>Sub-100ms Inference</span>
          </div>

          {/* Floating Telemetry 3 (Bottom Right) */}
          <div className="hero-telemetry-badge hero-telemetry-3 -right-3 bottom-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-[var(--biz-bright)]">
              <path d="M12 3L4 7v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V7l-8-4z" />
            </svg>
            <span>Enterprise Sovereignty</span>
          </div>

          <div className="hero-3d-asset relative aspect-square w-full max-w-[430px] overflow-hidden rounded-3xl border border-white/[0.12] bg-gradient-to-b from-white/[0.05] to-transparent shadow-[0_24px_54px_-20px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.2)] backdrop-blur-sm">
            <Image
              src="/img/hero-agent-3d.webp"
              alt="Autonomous 3D AI Agent platform connected across your business tools"
              width={880}
              height={880}
              priority
              sizes="(max-width: 1024px) 100vw, 430px"
              className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
            />
          </div>
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
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--card-body)]">{t("cta.body")}</p>
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
