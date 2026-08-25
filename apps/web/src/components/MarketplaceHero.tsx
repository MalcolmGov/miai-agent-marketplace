"use client";

import Link from "next/link";
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

function FloatTile({
  x,
  y,
  tint,
  glyph,
}: {
  x: number;
  y: number;
  tint: string;
  glyph: "mail" | "chat" | "doc" | "grid";
}) {
  const glyphs: Record<string, React.ReactNode> = {
    mail: (
      <path d="M-9,-6 h18 v12 h-18 z M-9,-6 L0,2 L9,-6" fill="none" stroke={tint} strokeWidth="2" strokeLinejoin="round" />
    ),
    chat: (
      <path d="M-9,-7 h18 v11 h-11 l-4,4 v-4 h-3 z" fill="none" stroke={tint} strokeWidth="2" strokeLinejoin="round" />
    ),
    doc: (
      <path
        d="M-7,-9 h9 l5,5 v13 h-14 z M2,-9 v5 h5 M-4,2 h8 M-4,6 h8"
        fill="none"
        stroke={tint}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    ),
    grid: (
      <path
        d="M-8,-8 h7 v7 h-7 z M1,-8 h7 v7 h-7 z M-8,1 h7 v7 h-7 z M1,1 h7 v7 h-7 z"
        fill="none"
        stroke={tint}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    ),
  };
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-24" y="-24" width="48" height="48" rx="14" fill="var(--bg-panel)" stroke="var(--line)" strokeWidth="1.5" />
      <rect x="-24" y="-24" width="48" height="48" rx="14" fill={`color-mix(in srgb, ${tint} 8%, transparent)`} />
      <g>{glyphs[glyph]}</g>
    </g>
  );
}

/**
 * Isometric "agents platform" illustration — a raised agent tile on a soft iso slab,
 * surrounded by floating tool tiles wired to it. Pure inline SVG, fully theme-aware
 * (every fill routes through CSS tokens), so it reads clean on both light and dark.
 */
function HeroArt() {
  return (
    <svg
      viewBox="0 0 480 420"
      className="h-full w-full"
      role="img"
      aria-label="AI agents connected across your business tools"
    >
      <defs>
        <linearGradient id="hero-agent" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-bright)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
        <linearGradient id="hero-slab" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="color-mix(in srgb, var(--accent) 20%, var(--bg-panel))" />
          <stop offset="100%" stopColor="color-mix(in srgb, var(--accent) 6%, var(--bg-panel))" />
        </linearGradient>
        <radialGradient id="hero-glow" cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="color-mix(in srgb, var(--accent) 30%, transparent)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      {/* ambient glow */}
      <ellipse cx="248" cy="210" rx="220" ry="180" fill="url(#hero-glow)" opacity="0.7" />

      {/* isometric base slab */}
      <g>
        <polygon points="240,300 430,210 240,120 50,210" fill="url(#hero-slab)" />
        <polygon
          points="50,210 240,300 240,330 50,240"
          fill="color-mix(in srgb, var(--accent) 22%, var(--bg))"
          opacity="0.55"
        />
        <polygon
          points="430,210 240,300 240,330 430,240"
          fill="color-mix(in srgb, var(--accent) 12%, var(--bg))"
          opacity="0.45"
        />
        <polygon
          points="240,300 430,210 240,120 50,210"
          fill="none"
          stroke="color-mix(in srgb, var(--accent) 40%, transparent)"
          strokeWidth="1.5"
        />
      </g>

      {/* connector lines from hub to tiles */}
      <g
        stroke="color-mix(in srgb, var(--accent) 45%, transparent)"
        strokeWidth="1.5"
        strokeDasharray="3 5"
        fill="none"
      >
        <path d="M240,196 L120,132" />
        <path d="M240,196 L372,140" />
        <path d="M240,196 L118,250" />
        <path d="M240,196 L378,246" />
      </g>

      {/* floating tool tiles */}
      <FloatTile x={98} y={110} tint="var(--biz)" glyph="mail" />
      <FloatTile x={356} y={118} tint="var(--accent)" glyph="chat" />
      <FloatTile x={100} y={236} tint="var(--warn)" glyph="doc" />
      <FloatTile x={358} y={228} tint="var(--biz)" glyph="grid" />

      {/* central raised agent tile */}
      <g>
        <polygon
          points="240,196 300,161 240,126 180,161"
          fill="color-mix(in srgb, var(--accent) 30%, var(--bg))"
          opacity="0.6"
        />
        <rect x="196" y="96" width="88" height="88" rx="20" fill="url(#hero-agent)" />
        <rect
          x="196"
          y="96"
          width="88"
          height="88"
          rx="20"
          fill="none"
          stroke="color-mix(in srgb, #ffffff 35%, transparent)"
          strokeWidth="1.5"
        />
        {/* robot face */}
        <g>
          <rect
            x="216"
            y="122"
            width="48"
            height="34"
            rx="10"
            fill="color-mix(in srgb, var(--accent-ink) 92%, transparent)"
            opacity="0.16"
          />
          <circle cx="228" cy="139" r="5.5" fill="#ffffff" />
          <circle cx="252" cy="139" r="5.5" fill="#ffffff" />
          <circle cx="228" cy="139" r="2.4" fill="var(--accent-ink)" />
          <circle cx="252" cy="139" r="2.4" fill="var(--accent-ink)" />
          <rect x="230" y="106" width="20" height="6" rx="3" fill="#ffffff" opacity="0.9" />
          <circle cx="240" cy="101" r="3.4" fill="#ffffff" />
        </g>
      </g>
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
          <h1 className="display text-balance text-[clamp(2.1rem,5.4vw,3.4rem)] font-semibold leading-[1.06] tracking-tight text-[var(--text)]">
            {headlineParts.before}
            {headlineParts.mid ? (
              <span className="text-[var(--accent-bright)]">{headlineParts.mid}</span>
            ) : null}
            {headlineParts.after}
          </h1>

          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--card-body)] sm:text-base">
            {t("hero.lede", { count: agentsLive })}
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <a href="#catalogue" className="btn btn-primary w-full sm:w-auto">
              <IconRoute />
              {t("hero.browse")}
            </a>
            <Link
              href="/get-started"
              className="btn btn-ghost w-full sm:w-auto"
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
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[11px] font-bold text-[var(--accent-bright)]">
                    {i + 1}
                  </span>
                  <span className="font-medium">{step}</span>
                </li>
              ))}
            </ol>
            <p className="text-[13px] text-[var(--muted)]">{t("hero.workflows", { count: workflowCount })}</p>
          </div>
        </div>

        {/* Right — illustration (hidden on small screens) */}
        <div className="biz-hero-art relative hidden aspect-[6/5] w-full max-w-[520px] justify-self-end lg:block">
          <HeroArt />
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
