import type { ReactNode } from "react";

/**
 * Brand-styled connector icons — clean, original SVG glyphs in each service's colours so the
 * connector rows read as recognisable integrations rather than plain text. Simplified marks (not
 * copies of the trademarked logo files); swap in an official brand SVG per provider when the usage
 * rights are in hand.
 */

const ICONS: Record<string, ReactNode> = {
  email: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="#EA4335" />
      <path d="M4 8l8 5.5L20 8" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  google_calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" fill="#fff" stroke="#4285F4" strokeWidth="1.6" />
      <path d="M3 9h18" stroke="#4285F4" strokeWidth="1.6" />
      <rect x="3" y="4.5" width="18" height="4.5" rx="2.5" fill="#4285F4" />
      <circle cx="12" cy="15" r="2.1" fill="#4285F4" />
    </>
  ),
  google_tasks: (
    <>
      <circle cx="12" cy="12" r="9" fill="#1A73E8" />
      <path d="M8 12.4l2.6 2.6L16 9.6" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  google_contacts: (
    <>
      <circle cx="12" cy="9" r="3.8" fill="#4285F4" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" fill="#4285F4" />
    </>
  ),
  google_drive: (
    <path d="M4 7.5A2 2 0 016 5.5h3.2l2 2H18a2 2 0 012 2v7a2 2 0 01-2 2H6a2 2 0 01-2-2z" fill="#1A73E8" />
  ),
  youtube: (
    <>
      <rect x="2" y="5.5" width="20" height="13" rx="4" fill="#FF0000" />
      <path d="M10 9.2l5 2.8-5 2.8z" fill="#fff" />
    </>
  ),
  notion: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3.5" fill="#111111" />
      <path d="M8.5 16V8.4l7 7.2V8.4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  spotify: (
    <>
      <circle cx="12" cy="12" r="9.3" fill="#1DB954" />
      <path d="M7.4 10.2c3-.9 6.2-.6 8.8 1" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M8 12.9c2.5-.7 5.1-.4 7.2 1" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M8.4 15.3c2-.5 4.1-.3 5.7.9" stroke="#fff" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </>
  ),
};

/** A single connector's brand glyph. Falls back to a neutral dot for unknown ids. */
export function ConnectorIcon({ connector, size = 16 }: { connector: string; size?: number }) {
  const glyph = ICONS[connector];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      className="shrink-0"
      style={{ display: "inline-block", verticalAlign: "-2px" }}
    >
      {glyph ?? <circle cx="12" cy="12" r="5" fill="var(--muted)" />}
    </svg>
  );
}
