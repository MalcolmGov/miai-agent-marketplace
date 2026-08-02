"use client";

import { useTheme } from "@/lib/theme";

/** Colored visual icons for catalogue cards — keyed by family id, with category fallback. */

type IconTone = { bg: string; fg: string; ring: string };

const TONES_DARK: Record<string, IconTone> = {
  teal: {
    bg: "linear-gradient(145deg,#1a4a45 0%,#0d2a28 100%)",
    fg: "#6aefe0",
    ring: "rgba(61,214,198,0.45)",
  },
  mint: {
    bg: "linear-gradient(145deg,#164a3a 0%,#0c261e 100%)",
    fg: "#5eead4",
    ring: "rgba(52,211,153,0.45)",
  },
  sky: {
    bg: "linear-gradient(145deg,#163a52 0%,#0c1e2c 100%)",
    fg: "#7dd3fc",
    ring: "rgba(56,189,248,0.45)",
  },
  amber: {
    bg: "linear-gradient(145deg,#4a3514 0%,#261a0a 100%)",
    fg: "#fbbf24",
    ring: "rgba(251,191,36,0.45)",
  },
  coral: {
    bg: "linear-gradient(145deg,#4a2418 0%,#26120c 100%)",
    fg: "#fb923c",
    ring: "rgba(251,146,60,0.45)",
  },
  slate: {
    bg: "linear-gradient(145deg,#2a3340 0%,#151a22 100%)",
    fg: "#94a3b8",
    ring: "rgba(148,163,184,0.4)",
  },
  rose: {
    bg: "linear-gradient(145deg,#4a1e2e 0%,#261018 100%)",
    fg: "#f9a8d4",
    ring: "rgba(244,114,182,0.4)",
  },
  indigo: {
    bg: "linear-gradient(145deg,#2a2a4a 0%,#161628 100%)",
    fg: "#a5b4fc",
    ring: "rgba(129,140,248,0.4)",
  },
};

const TONES_LIGHT: Record<string, IconTone> = {
  teal: {
    bg: "linear-gradient(145deg,#d8f5f1 0%,#eafaf7 100%)",
    fg: "#0d7a70",
    ring: "rgba(20,150,138,0.35)",
  },
  mint: {
    bg: "linear-gradient(145deg,#d5f5e8 0%,#eafaf3 100%)",
    fg: "#0f766e",
    ring: "rgba(16,185,129,0.35)",
  },
  sky: {
    bg: "linear-gradient(145deg,#d9ecf8 0%,#eef6fc 100%)",
    fg: "#0369a1",
    ring: "rgba(14,165,233,0.35)",
  },
  amber: {
    bg: "linear-gradient(145deg,#fef0d4 0%,#fff8eb 100%)",
    fg: "#b45309",
    ring: "rgba(217,119,6,0.35)",
  },
  coral: {
    bg: "linear-gradient(145deg,#ffe4d6 0%,#fff1e8 100%)",
    fg: "#c2410c",
    ring: "rgba(234,88,12,0.35)",
  },
  slate: {
    bg: "linear-gradient(145deg,#e4e9f0 0%,#f1f4f8 100%)",
    fg: "#475569",
    ring: "rgba(100,116,139,0.35)",
  },
  rose: {
    bg: "linear-gradient(145deg,#fce4ee 0%,#fdf2f7 100%)",
    fg: "#be185d",
    ring: "rgba(236,72,153,0.3)",
  },
  indigo: {
    bg: "linear-gradient(145deg,#e0e4f8 0%,#eef0fb 100%)",
    fg: "#4338ca",
    ring: "rgba(99,102,241,0.3)",
  },
};

type IconKind =
  | "tooth"
  | "briefcase"
  | "home"
  | "hotel"
  | "calendar"
  | "headset"
  | "wrench"
  | "truck"
  | "utensils"
  | "heart"
  | "building"
  | "graduation"
  | "chart"
  | "shield"
  | "spark"
  | "paw"
  | "scissors"
  | "cart"
  | "phone"
  | "users"
  | "default";

type ToneName = keyof typeof TONES_DARK;

const FAMILY_ICONS: Record<string, { kind: IconKind; tone: ToneName }> = {
  "dental-front-desk": { kind: "tooth", tone: "mint" },
  "dental-practice": { kind: "tooth", tone: "mint" },
  "clinic-front-desk": { kind: "heart", tone: "rose" },
  pharmacy: { kind: "heart", tone: "rose" },
  veterinary: { kind: "paw", tone: "amber" },
  "gym-membership": { kind: "heart", tone: "coral" },
  "executive-assistant": { kind: "briefcase", tone: "slate" },
  "it-helpdesk": { kind: "headset", tone: "sky" },
  "hr-helpdesk": { kind: "users", tone: "indigo" },
  "onboarding-buddy": { kind: "users", tone: "indigo" },
  "payroll-queries": { kind: "chart", tone: "slate" },
  "home-services": { kind: "home", tone: "sky" },
  "trades-receptionist": { kind: "wrench", tone: "amber" },
  "field-service": { kind: "wrench", tone: "amber" },
  "fleet-driver": { kind: "truck", tone: "sky" },
  "delivery-tracking": { kind: "truck", tone: "sky" },
  "order-tracking": { kind: "truck", tone: "teal" },
  "hotel-guest": { kind: "hotel", tone: "amber" },
  "hotel-concierge": { kind: "hotel", tone: "amber" },
  "travel-desk": { kind: "hotel", tone: "coral" },
  "events-venue": { kind: "calendar", tone: "coral" },
  "salon-booking": { kind: "scissors", tone: "rose" },
  "restaurant-takeaway": { kind: "utensils", tone: "coral" },
  "sales-qualifier": { kind: "chart", tone: "teal" },
  "customer-support": { kind: "headset", tone: "teal" },
  "front-desk": { kind: "building", tone: "slate" },
  admissions: { kind: "graduation", tone: "indigo" },
  "course-advisor": { kind: "graduation", tone: "indigo" },
  "student-helpdesk": { kind: "graduation", tone: "sky" },
  "insurance-claims": { kind: "shield", tone: "slate" },
  "insurance-broker": { kind: "shield", tone: "slate" },
  "policy-compliance": { kind: "shield", tone: "indigo" },
  "loan-prequalifier": { kind: "chart", tone: "amber" },
  "bank-branch": { kind: "building", tone: "slate" },
  "accounting-practice": { kind: "chart", tone: "slate" },
  bookkeeping: { kind: "chart", tone: "slate" },
  "utility-billing": { kind: "building", tone: "sky" },
  "payment-disputes": { kind: "shield", tone: "coral" },
  "mobile-money": { kind: "phone", tone: "mint" },
  remittance: { kind: "phone", tone: "mint" },
  "property-enquiries": { kind: "home", tone: "amber" },
  "rental-enquiries": { kind: "home", tone: "amber" },
  "building-management": { kind: "building", tone: "slate" },
  "product-finder": { kind: "cart", tone: "teal" },
  "returns-exchanges": { kind: "cart", tone: "coral" },
  "stock-availability": { kind: "cart", tone: "sky" },
  "loyalty-rewards": { kind: "spark", tone: "amber" },
  "spaza-merchant": { kind: "cart", tone: "mint" },
  "grant-stock-planner": { kind: "chart", tone: "mint" },
  "marketing-assistant": { kind: "spark", tone: "rose" },
  "agency-studio": { kind: "spark", tone: "indigo" },
  procurement: { kind: "cart", tone: "slate" },
  "law-firm-intake": { kind: "briefcase", tone: "indigo" },
  "vas-concierge": { kind: "spark", tone: "teal" },
  "tour-activity": { kind: "calendar", tone: "coral" },
};

const CATEGORY_FALLBACK: Record<string, { kind: IconKind; tone: ToneName }> = {
  "Health & wellness": { kind: "heart", tone: "mint" },
  "HR & internal ops": { kind: "briefcase", tone: "slate" },
  "Internal & back office": { kind: "briefcase", tone: "slate" },
  "Logistics & field ops": { kind: "truck", tone: "sky" },
  "Hospitality & travel": { kind: "hotel", tone: "amber" },
  "Financial services": { kind: "chart", tone: "amber" },
  "Retail & e-commerce": { kind: "cart", tone: "teal" },
  Education: { kind: "graduation", tone: "indigo" },
  Property: { kind: "home", tone: "coral" },
  "Professional services": { kind: "briefcase", tone: "slate" },
  "Customer & front office": { kind: "headset", tone: "teal" },
  Telecommunications: { kind: "headset", tone: "sky" },
  "Government & public sector": { kind: "briefcase", tone: "slate" },
  "Manufacturing & industrial": { kind: "truck", tone: "amber" },
  "AI & developer tools": { kind: "spark", tone: "indigo" },
  "Data & analytics": { kind: "chart", tone: "sky" },
};

function Glyph({ kind }: { kind: IconKind }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    className: "h-5 w-5",
    "aria-hidden": true as const,
  };

  switch (kind) {
    case "tooth":
      return (
        <svg {...common}>
          <path
            d="M12 3c-2.2 0-4 1.6-4 4.2 0 1.4-.3 2.6-.9 3.7C6.2 12.5 6 14 6 15.5 6 18 7.5 20 9.2 20c1.1 0 1.6-.8 2-.8s.9.8 2 .8c1.7 0 3.2-2 3.2-4.5 0-1.5-.2-3-.9-4.6-.6-1.1-.9-2.3-.9-3.7C14.6 4.6 12.8 3 12 3Z"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...common}>
          <rect x="4" y="8" width="16" height="12" rx="2" />
          <path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 13h16" strokeLinecap="round" />
        </svg>
      );
    case "home":
      return (
        <svg {...common}>
          <path d="m4 11 8-7 8 7v9a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9Z" strokeLinejoin="round" />
        </svg>
      );
    case "hotel":
      return (
        <svg {...common}>
          <path d="M4 20V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14M4 20h16M10 8h2M10 12h2M16 10h2v6h-2" strokeLinecap="round" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
        </svg>
      );
    case "headset":
      return (
        <svg {...common}>
          <path d="M4 13v-1a8 8 0 0 1 16 0v1" strokeLinecap="round" />
          <path d="M4 13v3a2 2 0 0 0 2 2h1v-5H6a2 2 0 0 0-2 2ZM20 13v3a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2Z" />
        </svg>
      );
    case "wrench":
      return (
        <svg {...common}>
          <path
            d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-3.2 3.2-2.8-2.8 3-3.1Z"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "truck":
      return (
        <svg {...common}>
          <path d="M3 7h11v10H3V7Zm11 3h4l3 3v4h-7V10Z" strokeLinejoin="round" />
          <circle cx="7.5" cy="18.5" r="1.5" />
          <circle cx="17.5" cy="18.5" r="1.5" />
        </svg>
      );
    case "utensils":
      return (
        <svg {...common}>
          <path d="M8 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M10 12v9M16 3v9h2a2 2 0 0 0 2-2V3M17 12v9" strokeLinecap="round" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common}>
          <path
            d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "building":
      return (
        <svg {...common}>
          <path d="M4 20h16M6 20V6l6-3 6 3v14M9 10h.01M12 10h.01M15 10h.01M9 14h.01M12 14h.01M15 14h.01" strokeLinecap="round" />
        </svg>
      );
    case "graduation":
      return (
        <svg {...common}>
          <path d="m3 9 9-4 9 4-9 4-9-4Z" strokeLinejoin="round" />
          <path d="M7 11.5v4.2c0 .8 2.2 2.3 5 2.3s5-1.5 5-2.3v-4.2M21 9v6" strokeLinecap="round" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 19h16M7 16V9M12 16V5M17 16v-5" strokeLinecap="round" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 5 6v6c0 5 3.5 8 7 9 3.5-1 7-4 7-9V6l-7-3Z" strokeLinejoin="round" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path
            d="M12 3l1.4 4.4L18 9l-4.6 1.6L12 15l-1.4-4.4L6 9l4.6-1.6L12 3Z"
            strokeLinejoin="round"
          />
          <path d="M18 14l.7 2.2L21 17l-2.3.8L18 20l-.7-2.2L15 17l2.3-.8L18 14Z" strokeLinejoin="round" />
        </svg>
      );
    case "paw":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="1.8" />
          <circle cx="16" cy="8" r="1.8" />
          <circle cx="6" cy="12.5" r="1.6" />
          <circle cx="18" cy="12.5" r="1.6" />
          <path d="M9 16.5c0-1.5 1.3-2.5 3-2.5s3 1 3 2.5-1.5 3.5-3 3.5-3-2-3-3.5Z" />
        </svg>
      );
    case "scissors":
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="2.5" />
          <circle cx="7" cy="17" r="2.5" />
          <path d="M9.5 8.5 20 18M9.5 15.5 20 6" strokeLinecap="round" />
        </svg>
      );
    case "cart":
      return (
        <svg {...common}>
          <path d="M4 5h2l2.2 10h9.6l2-7H8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="11" cy="19" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="17" cy="19" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      );
    case "phone":
      return (
        <svg {...common}>
          <rect x="8" y="3" width="8" height="18" rx="2" />
          <path d="M11 18h2" strokeLinecap="round" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19c0-2.8 2.5-5 5.5-5s5.5 2.2 5.5 5" strokeLinecap="round" />
          <circle cx="17" cy="9" r="2.2" />
          <path d="M20.5 19c0-2-1.5-3.5-3.5-4" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" />
          <path d="M12 9v3l2 1.5" strokeLinecap="round" />
        </svg>
      );
  }
}

function resolveIcon(familyId: string, category: string) {
  if (FAMILY_ICONS[familyId]) return FAMILY_ICONS[familyId];
  for (const [key, val] of Object.entries(FAMILY_ICONS)) {
    if (familyId.includes(key) || key.includes(familyId)) return val;
  }
  return CATEGORY_FALLBACK[category] ?? { kind: "default" as IconKind, tone: "teal" as const };
}

export function AgentIcon({
  familyId,
  category,
  className = "",
}: {
  familyId: string;
  category: string;
  className?: string;
}) {
  const { theme } = useTheme();
  const { kind, tone } = resolveIcon(familyId, category);
  const tones = theme === "light" ? TONES_LIGHT : TONES_DARK;
  const t = tones[tone];

  return (
    <span
      aria-hidden
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${className}`}
      style={{
        background: t.bg,
        color: t.fg,
        boxShadow: `inset 0 0 0 1px ${t.ring}`,
      }}
    >
      <Glyph kind={kind} />
    </span>
  );
}
