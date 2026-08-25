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
  | "leaf"
  | "code"
  | "database"
  | "lock"
  | "bolt"
  | "signal"
  | "factory"
  | "scale"
  | "landmark"
  | "megaphone"
  | "receipt"
  | "key"
  | "box"
  | "creditcard"
  | "pill"
  | "flask"
  | "trophy"
  | "chat"
  | "book"
  | "compass"
  | "dumbbell"
  | "sun"
  | "default";

type ToneName = keyof typeof TONES_DARK;

const FAMILY_ICONS: Record<string, { kind: IconKind; tone: ToneName }> = {
  "accounting-practice": { kind: "receipt", tone: "amber" },
  "admissions": { kind: "graduation", tone: "indigo" },
  "agency-studio": { kind: "megaphone", tone: "rose" },
  "agri-advisory": { kind: "leaf", tone: "mint" },
  "ai-coding-assistant": { kind: "code", tone: "indigo" },
  "airtime-bundles": { kind: "signal", tone: "sky" },
  "bank-branch": { kind: "landmark", tone: "sky" },
  "bi-analyst": { kind: "database", tone: "sky" },
  "bookkeeping": { kind: "receipt", tone: "coral" },
  "building-management": { kind: "key", tone: "coral" },
  "case-management": { kind: "scale", tone: "indigo" },
  "citizen-services": { kind: "landmark", tone: "teal" },
  "clinic-front-desk": { kind: "heart", tone: "rose" },
  "contract-review": { kind: "scale", tone: "sky" },
  "course-advisor": { kind: "graduation", tone: "sky" },
  "credit-cards": { kind: "creditcard", tone: "teal" },
  "customer-support": { kind: "headset", tone: "teal" },
  "cybersecurity-desk": { kind: "lock", tone: "coral" },
  "data-quality": { kind: "database", tone: "teal" },
  "delivery-tracking": { kind: "box", tone: "sky" },
  "dental-front-desk": { kind: "tooth", tone: "mint" },
  "dental-practice": { kind: "tooth", tone: "teal" },
  "device-upgrades": { kind: "signal", tone: "teal" },
  "devops-assistant": { kind: "code", tone: "sky" },
  "documentation-assistant": { kind: "code", tone: "indigo" },
  "energy-operations": { kind: "bolt", tone: "amber" },
  "enterprise-connectivity": { kind: "signal", tone: "sky" },
  "events-venue": { kind: "calendar", tone: "coral" },
  "executive-assistant": { kind: "briefcase", tone: "slate" },
  "executive-dashboards": { kind: "database", tone: "sky" },
  "factory-operations": { kind: "factory", tone: "slate" },
  "farm-operations": { kind: "leaf", tone: "teal" },
  "fibre-support": { kind: "signal", tone: "teal" },
  "field-service": { kind: "box", tone: "teal" },
  "financial-reporting": { kind: "receipt", tone: "amber" },
  "fleet-driver": { kind: "truck", tone: "sky" },
  "fraud-investigations": { kind: "shield", tone: "slate" },
  "front-desk": { kind: "building", tone: "slate" },
  "grant-stock-planner": { kind: "box", tone: "sky" },
  "gym-membership": { kind: "trophy", tone: "amber" },
  "home-services": { kind: "truck", tone: "teal" },
  "hotel-concierge": { kind: "hotel", tone: "amber" },
  "hotel-guest": { kind: "hotel", tone: "coral" },
  "hr-helpdesk": { kind: "users", tone: "indigo" },
  "insurance-broker": { kind: "shield", tone: "indigo" },
  "insurance-claims": { kind: "shield", tone: "slate" },
  "interview-scheduling": { kind: "users", tone: "sky" },
  "investment-advisor": { kind: "chart", tone: "sky" },
  "it-helpdesk": { kind: "headset", tone: "sky" },
  "law-firm-intake": { kind: "scale", tone: "indigo" },
  "learning-development": { kind: "users", tone: "indigo" },
  "legal-research": { kind: "scale", tone: "sky" },
  "licensing": { kind: "landmark", tone: "sky" },
  "loan-prequalifier": { kind: "receipt", tone: "coral" },
  "loyalty-rewards": { kind: "trophy", tone: "coral" },
  "maintenance-desk": { kind: "wrench", tone: "amber" },
  "marketing-assistant": { kind: "megaphone", tone: "coral" },
  "media-content-desk": { kind: "megaphone", tone: "rose" },
  "mobile-money": { kind: "creditcard", tone: "sky" },
  "mortgage-advisor": { kind: "receipt", tone: "amber" },
  "municipality-desk": { kind: "landmark", tone: "teal" },
  "network-faults": { kind: "signal", tone: "sky" },
  "onboarding-buddy": { kind: "users", tone: "sky" },
  "order-tracking": { kind: "box", tone: "teal" },
  "passport-visa": { kind: "landmark", tone: "sky" },
  "payment-disputes": { kind: "creditcard", tone: "teal" },
  "payroll-queries": { kind: "users", tone: "indigo" },
  "performance-reviews": { kind: "users", tone: "sky" },
  "pharmacy": { kind: "pill", tone: "rose" },
  "policy-compliance": { kind: "shield", tone: "indigo" },
  "procurement": { kind: "box", tone: "sky" },
  "product-finder": { kind: "cart", tone: "teal" },
  "production-planning": { kind: "factory", tone: "indigo" },
  "prompt-engineering": { kind: "code", tone: "sky" },
  "property-enquiries": { kind: "key", tone: "amber" },
  "qa-testing": { kind: "flask", tone: "mint" },
  "quality-assurance": { kind: "flask", tone: "teal" },
  "recruitment": { kind: "users", tone: "indigo" },
  "remittance": { kind: "creditcard", tone: "sky" },
  "rental-enquiries": { kind: "key", tone: "coral" },
  "restaurant-takeaway": { kind: "utensils", tone: "coral" },
  "returns-exchanges": { kind: "cart", tone: "sky" },
  "sales-forecasting": { kind: "database", tone: "teal" },
  "sales-qualifier": { kind: "briefcase", tone: "indigo" },
  "salon-booking": { kind: "scissors", tone: "rose" },
  "security-incident": { kind: "lock", tone: "amber" },
  "sim-registration": { kind: "signal", tone: "teal" },
  "social-services": { kind: "briefcase", tone: "slate" },
  "spaza-merchant": { kind: "cart", tone: "teal" },
  "stock-availability": { kind: "cart", tone: "sky" },
  "student-helpdesk": { kind: "graduation", tone: "indigo" },
  "tax-office": { kind: "receipt", tone: "coral" },
  "tour-activity": { kind: "hotel", tone: "amber" },
  "trades-receptionist": { kind: "truck", tone: "sky" },
  "travel-desk": { kind: "hotel", tone: "coral" },
  "utility-billing": { kind: "receipt", tone: "amber" },
  "vas-concierge": { kind: "hotel", tone: "amber" },
  "veterinary": { kind: "paw", tone: "amber" },
  "warehouse-operations": { kind: "box", tone: "teal" },
  "wealth-management": { kind: "chart", tone: "teal" },
  // Consumer (personal) line — data/catalog-consumer ids.
  "study-coach": { kind: "book", tone: "indigo" },
  "english-coach": { kind: "chat", tone: "sky" },
  "exam-prep-coach": { kind: "graduation", tone: "amber" },
  "private-confidant": { kind: "heart", tone: "rose" },
  "matchday-companion": { kind: "trophy", tone: "teal" },
  "learning-advisor": { kind: "compass", tone: "sky" },
  "health-navigator": { kind: "heart", tone: "mint" },
  "money-coach": { kind: "chart", tone: "teal" },
  "faith-companion": { kind: "sun", tone: "amber" },
  "paperwork-navigator": { kind: "receipt", tone: "slate" },
  "job-hunt-coach": { kind: "briefcase", tone: "indigo" },
  "everyday-companion": { kind: "chat", tone: "teal" },
  "topup-concierge": { kind: "creditcard", tone: "sky" },
  "story-studio": { kind: "book", tone: "rose" },
  "trip-planner": { kind: "compass", tone: "amber" },
  "fitness-meal-coach": { kind: "dumbbell", tone: "coral" },
  "star-guide": { kind: "sun", tone: "indigo" },
};

const CATEGORY_FALLBACK: Record<string, { kind: IconKind; tone: ToneName }> = {
  "Health & wellness": { kind: "heart", tone: "mint" },
  "HR & internal ops": { kind: "users", tone: "indigo" },
  "Internal & back office": { kind: "briefcase", tone: "slate" },
  "Logistics & field ops": { kind: "box", tone: "sky" },
  "Hospitality & travel": { kind: "hotel", tone: "amber" },
  "Financial services": { kind: "receipt", tone: "amber" },
  "Retail & e-commerce": { kind: "cart", tone: "teal" },
  Education: { kind: "graduation", tone: "indigo" },
  Property: { kind: "key", tone: "coral" },
  "Professional services": { kind: "scale", tone: "indigo" },
  "Customer & front office": { kind: "headset", tone: "teal" },
  Telecommunications: { kind: "signal", tone: "sky" },
  "Government & public sector": { kind: "landmark", tone: "sky" },
  "Manufacturing & industrial": { kind: "factory", tone: "slate" },
  "AI & developer tools": { kind: "code", tone: "indigo" },
  "Data & analytics": { kind: "database", tone: "sky" },
  Cybersecurity: { kind: "lock", tone: "coral" },
  "Energy & utilities": { kind: "bolt", tone: "amber" },
  Agriculture: { kind: "leaf", tone: "mint" },
  "Media & entertainment": { kind: "megaphone", tone: "rose" },
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
    case "leaf":
      return (
        <svg {...common}>
          <path d="M4 20c0-9 6-15 16-16 1 10-5 16-16 16Z" strokeLinejoin="round" /><path d="M8.5 15.5c2.4-3 5-4.6 8-5.6" strokeLinecap="round" />
        </svg>
      );
    case "code":
      return (
        <svg {...common}>
          <path d="M8.5 8 4 12l4.5 4M15.5 8 20 12l-4.5 4M13.5 5l-3 14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "database":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" strokeLinecap="round" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common}>
          <rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" strokeLinecap="round" /><circle cx="12" cy="15" r="1.35" fill="currentColor" stroke="none" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...common}>
          <path d="M13 2 5 13h5l-1 9 8-12h-5l1-8Z" strokeLinejoin="round" />
        </svg>
      );
    case "signal":
      return (
        <svg {...common}>
          <path d="M4.5 12.5a10.5 10.5 0 0 1 15 0M7.5 15.5a6 6 0 0 1 9 0" strokeLinecap="round" /><circle cx="12" cy="18.6" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      );
    case "factory":
      return (
        <svg {...common}>
          <path d="M3 20V10l5 3.5V10l5 3.5V7l6 4v9H3Z" strokeLinejoin="round" /><path d="M7.5 20v-3.4M12 20v-3.4M16.5 20v-3.4" strokeLinecap="round" />
        </svg>
      );
    case "scale":
      return (
        <svg {...common}>
          <path d="M12 5.5v14.5M7.5 20h9M4 8.5h16" strokeLinecap="round" /><path d="M4 8.5 1.8 13.5h4.4L4 8.5ZM20 8.5l-2.2 5h4.4L20 8.5Z" strokeLinejoin="round" /><path d="M1.8 13.5a2.2 2.2 0 0 0 4.4 0M17.8 13.5a2.2 2.2 0 0 0 4.4 0" strokeLinecap="round" /><circle cx="12" cy="5.2" r="1.15" fill="currentColor" stroke="none" />
        </svg>
      );
    case "landmark":
      return (
        <svg {...common}>
          <path d="m3 10 9-5 9 5" strokeLinejoin="round" /><path d="M4 10h16M4 20h16M6.5 10v10M11 10v10M15.5 10v10M19.5 10v10" strokeLinecap="round" />
        </svg>
      );
    case "megaphone":
      return (
        <svg {...common}>
          <path d="M4 10v4l11 5V5L4 10Z" strokeLinejoin="round" /><path d="M15.5 8.5a4 4 0 0 1 0 7M6 14.2l1 4.8h3l-1-4.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "receipt":
      return (
        <svg {...common}>
          <path d="M6 3h12v18l-2.2-1.4-2 1.4-2-1.4-2 1.4L7.2 20 6 21V3Z" strokeLinejoin="round" /><path d="M9 8h6M9 12h6M9 16h4" strokeLinecap="round" />
        </svg>
      );
    case "key":
      return (
        <svg {...common}>
          <circle cx="8.2" cy="8.2" r="3.7" /><path d="m10.8 10.8 8.4 8.4M18.7 19.3l1.6-1.6M16.2 16.8l1.6-1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <path d="M12 3 20 7v10l-8 4-8-4V7l8-4Z" strokeLinejoin="round" /><path d="M4 7l8 4 8-4M12 11v10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "creditcard":
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M6.5 14h4" strokeLinecap="round" />
        </svg>
      );
    case "pill":
      return (
        <svg {...common}>
          <g transform="rotate(45 12 12)"><rect x="3" y="9" width="18" height="6" rx="3" /><path d="M12 9v6" strokeLinecap="round" /></g>
        </svg>
      );
    case "flask":
      return (
        <svg {...common}>
          <path d="M9 3v6.2L4.6 17a1.6 1.6 0 0 0 1.4 2.4h12a1.6 1.6 0 0 0 1.4-2.4L15 9.2V3" strokeLinejoin="round" /><path d="M8 3h8M7.2 14.5h9.6" strokeLinecap="round" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...common}>
          <path d="M8 4h8v3.5a4 4 0 0 1-8 0V4Z" strokeLinejoin="round" /><path d="M8 5.5H5.2v1.3a3 3 0 0 0 3 3M16 5.5h2.8v1.3a3 3 0 0 1-3 3M11 12.4v2.6M13 12.4v2.6M8.6 20h6.8L14.4 16H9.6L8.6 20Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M6.5 4h11A2.5 2.5 0 0 1 20 6.5v6a2.5 2.5 0 0 1-2.5 2.5H10l-4 3v-3H6.5A2.5 2.5 0 0 1 4 12.5v-6A2.5 2.5 0 0 1 6.5 4Z" strokeLinejoin="round" />
          <path d="M8 8.5h8M8 11.5h5" strokeLinecap="round" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M12 6.5C10.5 5 8 4.5 4 5v12c4-.5 6.5 0 8 1.5 1.5-1.5 4-2 8-1.5V5c-4-.5-6.5 0-8 1.5Z" strokeLinejoin="round" />
          <path d="M12 6.5v12" strokeLinecap="round" />
        </svg>
      );
    case "compass":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m15.5 8.5-2.2 5.2L8 15.5l2.2-5.2 5.3-1.8Z" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "dumbbell":
      return (
        <svg {...common}>
          <path d="M4 9v6M7 7.5v9M17 7.5v9M20 9v6M7 12h10" strokeLinecap="round" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7" strokeLinecap="round" />
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
