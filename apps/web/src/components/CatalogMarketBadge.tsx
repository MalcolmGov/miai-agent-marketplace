"use client";

export const PACK_ORDER = ["us", "eu", "africa", "asia", "oceania"] as const;
export type PackId = (typeof PACK_ORDER)[number];

export function packLabel(m: string) {
  if (m === "africa") return "Africa";
  if (m === "asia") return "Asia";
  if (m === "oceania") return "Oceania";
  return m.toUpperCase();
}

export function isPackId(m: string): m is PackId {
  return (PACK_ORDER as readonly string[]).includes(m);
}

/** Compact SVG market flags — readable at chip size without emoji inconsistency. */
export function MarketFlagIcon({ market, className = "h-3 w-[18px]" }: { market: PackId; className?: string }) {
  if (market === "us") {
    return (
      <svg viewBox="0 0 19 13" className={`${className} rounded-[2px] shadow-sm`} aria-hidden>
        <rect width="19" height="13" fill="#B22234" rx="1" />
        <path
          fill="#fff"
          d="M0 1.5h19v1.4H0zm0 2.8h19v1.4H0zm0 2.8h19v1.4H0zm0 2.8h19v1.4H0z"
        />
        <rect width="8" height="7" fill="#3C3B6E" rx="1" />
        <path
          fill="#fff"
          d="M1.2 1.3h.7l.2.6.2-.6h.7l-.55.4.2.65L1.9 2l-.55.4.2-.65zm2.6 0h.7l.2.6.2-.6h.7l-.55.4.2.65L4.5 2l-.55.4.2-.65zm2.6 0h.7l.2.6.2-.6h.7l-.55.4.2.65L7.1 2l-.55.4.2-.65zM1.2 3.5h.7l.2.6.2-.6h.7l-.55.4.2.65L1.9 4.2l-.55.4.2-.65zm2.6 0h.7l.2.6.2-.6h.7l-.55.4.2.65L4.5 4.2l-.55.4.2-.65zm2.6 0h.7l.2.6.2-.6h.7l-.55.4.2.65L7.1 4.2l-.55.4.2-.65zM1.2 5.7h.7l.2.6.2-.6h.7l-.55.4.2.65L1.9 6.4l-.55.4.2-.65zm2.6 0h.7l.2.6.2-.6h.7l-.55.4.2.65L4.5 6.4l-.55.4.2-.65zm2.6 0h.7l.2.6.2-.6h.7l-.55.4.2.65L7.1 6.4l-.55.4.2-.65z"
        />
      </svg>
    );
  }
  if (market === "eu") {
    return (
      <svg viewBox="0 0 19 13" className={`${className} rounded-[2px] shadow-sm`} aria-hidden>
        <rect width="19" height="13" fill="#003399" rx="1" />
        <g fill="#FFCC00">
          {Array.from({ length: 12 }, (_, i) => {
            const a = ((i * 30 - 90) * Math.PI) / 180;
            const cx = 9.5 + Math.cos(a) * 3.6;
            const cy = 6.5 + Math.sin(a) * 3.2;
            return <circle key={i} cx={cx} cy={cy} r="0.55" />;
          })}
        </g>
      </svg>
    );
  }
  if (market === "africa") {
    return (
      <svg viewBox="0 0 19 13" className={`${className} rounded-[2px] shadow-sm`} aria-hidden>
        <rect width="19" height="13" fill="#007A3D" rx="1" />
        <rect y="4.3" width="19" height="4.4" fill="#FCD116" />
        <rect y="8.7" width="19" height="4.3" fill="#CE1126" />
        <circle cx="9.5" cy="6.5" r="2.1" fill="#000" />
      </svg>
    );
  }
  if (market === "oceania") {
    // Southern Cross cue (AU/NZ/Pacific)
    return (
      <svg viewBox="0 0 19 13" className={`${className} rounded-[2px] shadow-sm`} aria-hidden>
        <rect width="19" height="13" fill="#012169" rx="1" />
        <g fill="#fff">
          <circle cx="12.2" cy="3.2" r="0.7" />
          <circle cx="14.6" cy="5.1" r="0.55" />
          <circle cx="11.4" cy="6.8" r="0.65" />
          <circle cx="13.8" cy="8.6" r="0.5" />
          <circle cx="15.5" cy="7.2" r="0.4" />
        </g>
        <path fill="#E4002B" d="M0 0h8.2v13H0z" opacity="0.15" />
      </svg>
    );
  }
  // Asia — stylized navy / gold
  return (
    <svg viewBox="0 0 19 13" className={`${className} rounded-[2px] shadow-sm`} aria-hidden>
      <rect width="19" height="13" fill="#1B3A6B" rx="1" />
      <circle cx="9.5" cy="6.5" r="3.2" fill="#F5C518" />
      <circle cx="10.4" cy="5.8" r="2.5" fill="#1B3A6B" />
    </svg>
  );
}

export function MarketBadge({
  market,
  prominent = false,
}: {
  market: PackId;
  prominent?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md font-semibold uppercase tracking-[0.06em] ${
        prominent
          ? "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--accent-bright)] ring-1 ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
          : "bg-[var(--bg-elev)] px-1 py-0.5 text-[10px] text-[var(--card-meta)] ring-1 ring-[var(--line)]"
      }`}
      title={`${packLabel(market)} market pack`}
    >
      <MarketFlagIcon market={market} />
      <span>{packLabel(market)}</span>
    </span>
  );
}

