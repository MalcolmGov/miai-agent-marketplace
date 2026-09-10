"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useT } from "@/lib/locale";
import { parseSmartCatalogQuery } from "@/lib/smart-catalog-query";
import { sectorAccent } from "@/lib/sectors";
import { stripExampleTenant, type FamilyCapabilities } from "@/lib/family-capabilities";
import { isWorkflowFamilyId, WORKFLOW_FAMILY_IDS } from "@/lib/workflows";
import { AgentIcon } from "./AgentIcon";
import { CARD_BLURBS } from "@/lib/card-blurbs";
import { MarketplaceCTA, MarketplaceHero } from "./MarketplaceHero";
import {
  MarketBadge,
  PACK_ORDER,
  type PackId,
  isPackId,
} from "./CatalogMarketBadge";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: {
    results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
  }) => void) | null;
  start: () => void;
  stop: () => void;
};

function speechErrorMessage(code?: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone blocked — allow mic for this site in the browser, then try again.";
    case "no-speech":
      return "No speech heard — try again.";
    case "audio-capture":
      return "No microphone found.";
    case "network":
      return "Voice search needs network (browser speech service).";
    case "aborted":
      return "";
    default:
      return code ? `Voice search failed (${code}).` : "Voice search failed.";
  }
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface FamilyItem {
  id: string;
  name: string;
  tier: string;
  summary: string;
  channels: string[];
  marketplaceCategory: string;
  audience: "customer" | "internal";
  markets: Record<string, string>;
  packs: string[];
  hasZa: boolean;
  pilot: boolean;
  liveReady: boolean;
  catalogueReady: boolean;
  defaultAgentId: string;
  requiresConnectors?: string[];
}

/** Human labels for the gated connectors surfaced on the "Needs setup" badge. */
const CONNECTOR_LABELS: Record<string, string> = {
  google_calendar: "Google Calendar",
  m365_calendar: "Microsoft 365 Calendar",
  slack: "Slack",
  hubspot: "HubSpot",
  shopify: "Shopify",
  teams: "Microsoft Teams",
  zendesk: "Zendesk",
  xero: "Xero",
  quickbooks: "QuickBooks",
  calendly: "Calendly",
  email: "Email",
  mcp: "MCP server",
};
function connectorLabel(id: string): string {
  return CONNECTOR_LABELS[id] ?? id;
}

function familyPacks(item: FamilyItem): PackId[] {
  return PACK_ORDER.filter((p) => item.packs.includes(p) || Boolean(item.markets[p]));
}

const MARKETS = [
  { id: "all", labelKey: "catalog.allMarkets" as const },
  { id: "us", label: "US" },
  { id: "eu", label: "EU" },
  { id: "africa", label: "Africa" },
  { id: "asia", label: "Asia" },
  { id: "oceania", label: "Oceania" },
] as const;

const AUDIENCES = [
  { id: "all", labelKey: "catalog.all" as const },
  { id: "customer", labelKey: "catalog.customer" as const },
  { id: "internal", labelKey: "catalog.internal" as const },
] as const;

/** Soft category accent for card rails — teal family, not purple. */
function categoryAccent(category: string) {
  return sectorAccent(category);
}

/**
 * Pack summaries often stack market + family name repeats
 * ("Asia Executive Assistant — Executive Assistant — …"). Strip that noise for cards.
 */
function cleanCardSummary(summary: string, name: string): string {
  let s = summary.replace(/\s+/g, " ").trim();
  // Drop trailing multi-step marketing clause (shown as a chip already)
  s = s.replace(/\s*Multi-step workflows?:.*$/i, "").trim();
  // Drop the fictional example-tenant clause — "… for <Business> (<City>) —" — so cards read as a
  // generic role, not an agent built for one made-up company (packs are resold white-label).
  s = stripExampleTenant(s);
  // Remove leading market labels
  s = s.replace(/^(US|EU|Asia|Africa|ZA)\s*[—–-]\s*/i, "");
  s = s.replace(/^(US|EU|Asia|Africa)\s+/i, "");
  // Collapse "Name — Name — Name — body" → body
  const nameEsc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const repeat = new RegExp(
    `^(?:${nameEsc}\\s*[—–-]\\s*)+(?:${nameEsc}\\s*[—–-]\\s*)?`,
    "i",
  );
  s = s.replace(repeat, "");
  // If we still start with the card title, peel it once
  s = s.replace(new RegExp(`^${nameEsc}\\s*[—–-]\\s*`, "i"), "");
  s = s.replace(/^[\s—–-]+/, "").trim();
  // Capitalize first letter
  if (s.length) s = s.charAt(0).toUpperCase() + s.slice(1);
  return s || summary;
}

/** Sparkle mark for the Smart toggle. */
function IconSparkle() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M12 2l1.6 4.9L18.5 8.5 13.6 10 12 15l-1.6-5L5.5 8.5l4.9-1.6L12 2z" />
      <path d="M19 13l.7 2.1 2.1.7-2.1.7L19 19l-.7-2.5-2.1-.7 2.1-.7L19 13z" opacity="0.7" />
    </svg>
  );
}

/** Waveform mark for the Voice toggle. */
function IconWave() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden>
      <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </svg>
  );
}

function IconGridSq() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

type ChannelGlyph = "chat" | "globe" | "mail" | "mic" | "plug";
function channelGlyph(name: string): ChannelGlyph {
  const n = name.toLowerCase();
  if (/mail|email/.test(n)) return "mail";
  if (/voice|call|phone|ivr/.test(n)) return "mic";
  if (/web|site|widget|embed|portal/.test(n)) return "globe";
  if (/whats|telegram|messenger|insta|sms|chat|message|slack|dm/.test(n)) return "chat";
  return "plug";
}
const CHANNEL_TINTS = ["var(--accent)", "var(--biz)", "var(--warn)"] as const;

function ChannelGlyphSvg({ kind }: { kind: ChannelGlyph }) {
  const paths: Record<ChannelGlyph, React.ReactNode> = {
    chat: <path d="M4 5h16v10H9l-4 3v-3H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
    globe: (
      <>
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 12h16M12 4c2.2 2.4 2.2 13.6 0 16M12 4c-2.2 2.4-2.2 13.6 0 16" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </>
    ),
    mail: <path d="M4 6h16v12H4z M4 6l8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
    mic: <path d="M12 4a2.5 2.5 0 0 0-2.5 2.5v5a2.5 2.5 0 0 0 5 0v-5A2.5 2.5 0 0 0 12 4zM6 11a6 6 0 0 0 12 0M12 17v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
    plug: <path d="M9 3v5m6-5v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  };
  return (
    <svg viewBox="0 0 24 24" className="h-[13px] w-[13px]">
      {paths[kind]}
    </svg>
  );
}

/** Compact row of channel/tool badges + overflow count — the card's "works with" strip. */
function ChannelBadges({ channels }: { channels: string[] }) {
  const list = channels.filter(Boolean);
  if (list.length === 0) return null;
  const shown = list.slice(0, 3);
  const extra = list.length - shown.length;
  return (
    <div className="mt-2.5 flex items-center gap-1.5" aria-label="Channels">
      {shown.map((c, i) => (
        <span
          key={c}
          title={c}
          className="flex h-6 w-6 items-center justify-center rounded-md ring-1 ring-[var(--line)]"
          style={{
            color: CHANNEL_TINTS[i % CHANNEL_TINTS.length],
            background: `color-mix(in srgb, ${CHANNEL_TINTS[i % CHANNEL_TINTS.length]} 12%, var(--bg-panel))`,
          }}
        >
          <ChannelGlyphSvg kind={channelGlyph(c)} />
        </span>
      ))}
      {extra > 0 ? (
        <span className="text-[11px] font-semibold text-[var(--muted-dim)]">+{extra}</span>
      ) : null}
    </div>
  );
}

function BookmarkButton({ saved, onToggle }: { saved: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={saved ? "Saved" : "Save agent"}
      className={`biz-bookmark ${saved ? "biz-bookmark-on" : ""}`}
    >
      <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
        <path d="M6 4h12v16l-6-4-6 4z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** A count-badged filter pill that toggles a boolean facet (Workflows / Go-live). */
function ToggleFacet({
  label,
  active,
  count,
  title,
  onToggle,
}: {
  label: string;
  active: boolean;
  count: number;
  title: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={`facet ${active ? "facet-active" : ""}`}
      title={title}
    >
      {label}
      <span className="cat-count">{count}</span>
    </button>
  );
}

/** A labelled, icon-led dropdown used for the market / industry facets. */
function FacetSelect({
  id,
  label,
  icon,
  value,
  widthClass,
  onSelect,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  widthClass: string;
  onSelect: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <div className="biz-select">
        {icon}
        <select
          id={id}
          className={`input !w-auto ${widthClass} !py-2 !pl-9 text-xs font-semibold`}
          value={value}
          onChange={(e) => onSelect(e.target.value)}
        >
          {children}
        </select>
      </div>
    </>
  );
}

/**
 * Agent "Set up" must run business onboarding first. Until the workspace has
 * completed the business wizard, route the CTA through /get-started (which
 * forwards back to the agent via ?next once setup is done). Onboarded workspaces
 * go straight to the agent studio.
 */
function gatedSetupHref(agentHref: string, onboarded: boolean | null): string {
  if (onboarded === true) return agentHref;
  return `/get-started?next=${encodeURIComponent(agentHref)}`;
}

export function CatalogGrid({
  initialFamilies,
}: {
  /** SSR-seeded families for first paint / SEO (Phase 5 G1). */
  initialFamilies?: FamilyItem[];
} = {}) {
  const t = useT();
  // Capture SSR seed once — avoid re-creating array identity each render.
  const [seeded] = useState<FamilyItem[]>(() => initialFamilies ?? []);
  const [items, setItems] = useState<FamilyItem[]>(seeded);
  const [familyCount, setFamilyCount] = useState(seeded.length);
  const [totalFamilies, setTotalFamilies] = useState(seeded.length);
  const [allCategories, setAllCategories] = useState<string[]>(() => {
    const cats = Array.from(new Set(seeded.map((i) => i.marketplaceCategory).filter(Boolean))).sort();
    return ["all", ...cats];
  });
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const item of seeded) {
      counts[item.marketplaceCategory] = (counts[item.marketplaceCategory] ?? 0) + 1;
    }
    return counts;
  });
  const [q, setQ] = useState("");
  const [market, setMarket] = useState("all");
  const [category, setCategory] = useState("all");
  const [audience, setAudience] = useState("all");
  const [workflowsOnly, setWorkflowsOnly] = useState(false);
  const [pilotOnly, setPilotOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [smartFilter, setSmartFilter] = useState(true);
  const [smartApplied, setSmartApplied] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechHint, setSpeechHint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [detail, setDetail] = useState<FamilyItem | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [agentsOnboarded, setAgentsOnboarded] = useState<boolean | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("miai.savedAgents");
      if (raw) setSaved(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/onboarding")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        setAgentsOnboarded(
          Boolean(d && (d.profile?.wizardCompleted || d.me?.product === "agents")),
        );
      })
      .catch(() => {
        if (!cancelled) setAgentsOnboarded(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleSaved(id: string) {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem("miai.savedAgents", JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const smartParsed = useMemo(
    () => (smartFilter && q.trim() ? parseSmartCatalogQuery(q) : null),
    [smartFilter, q],
  );
  const searchQ = smartParsed ? smartParsed.q : q;

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("pilot") === "1" || params.get("pilot") === "true") {
      setPilotOnly(true);
    }
  }, []);

  useEffect(() => {
    if (!smartParsed) {
      setSmartApplied([]);
      return;
    }
    setMarket(smartParsed.market);
    setAudience(smartParsed.audience);
    setCategory(smartParsed.category);
    setWorkflowsOnly(smartParsed.workflowsOnly);
    setSmartApplied(smartParsed.applied);
  }, [smartParsed]);

  useEffect(() => {
    if (!detail) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDetail(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail]);

  useEffect(() => {
    // Refresh category facets; skip network when SSR already seeded unfiltered list.
    if (seeded.length > 0) return;
    fetch("/api/catalog?view=families")
      .then((r) => r.json())
      .then((d) => {
        const next = (d.items ?? []) as FamilyItem[];
        const cats = Array.from(
          new Set(next.map((i) => i.marketplaceCategory).filter(Boolean)),
        ).sort();
        setAllCategories(["all", ...cats]);
        setTotalFamilies(d.familyCount ?? next.length);
        const counts: Record<string, number> = {};
        for (const item of next) {
          counts[item.marketplaceCategory] = (counts[item.marketplaceCategory] ?? 0) + 1;
        }
        setCategoryCounts(counts);
      })
      .catch(() => undefined);
  }, [seeded.length]);

  useEffect(() => {
    const unfiltered =
      !searchQ &&
      market === "all" &&
      category === "all" &&
      audience === "all" &&
      !workflowsOnly &&
      !pilotOnly;
    if (unfiltered && seeded.length > 0) {
      setItems(seeded);
      setFamilyCount(seeded.length);
      const counts: Record<string, number> = {};
      for (const item of seeded) {
        counts[item.marketplaceCategory] = (counts[item.marketplaceCategory] ?? 0) + 1;
      }
      setCategoryCounts(counts);
      return;
    }
    const params = new URLSearchParams();
    params.set("view", "families");
    if (searchQ) params.set("q", searchQ);
    if (market !== "all") params.set("market", market);
    if (category !== "all") params.set("category", category);
    if (audience !== "all") params.set("audience", audience);
    if (workflowsOnly) params.set("workflow", "1");
    if (pilotOnly) params.set("pilot", "1");
    startTransition(() => {
      fetch(`/api/catalog?${params}`)
        .then((r) => r.json())
        .then((d) => {
          const next = (d.items ?? []) as FamilyItem[];
          setItems(next);
          setFamilyCount(d.familyCount ?? d.count ?? 0);
          if (d.categoryCounts) setCategoryCounts(d.categoryCounts as Record<string, number>);
        });
    });
  }, [searchQ, market, category, audience, workflowsOnly, pilotOnly, seeded]);

  function toggleVoiceSearch() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSpeechHint("Voice search needs Chrome or Edge.");
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setSpeechHint("Voice search needs HTTPS (or localhost).");
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    setSpeechHint(null);
    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = (event) => {
      setListening(false);
      const msg = speechErrorMessage(event.error);
      if (msg) setSpeechHint(msg);
    };
    recognition.onresult = (event) => {
      const parts: string[] = [];
      for (let i = 0; i < event.results.length; i++) {
        const piece = event.results[i]?.[0]?.transcript?.trim();
        if (piece) parts.push(piece);
      }
      const transcript = parts.join(" ").trim();
      if (transcript) {
        setQ(transcript);
        setSpeechHint(null);
      }
    };
    try {
      recognition.start();
    } catch {
      setListening(false);
      setSpeechHint("Could not start voice search — wait a moment and try again.");
    }
  }

  const categories = useMemo(() => allCategories, [allCategories]);
  const industryCategoryCount = Math.max(0, allCategories.length - 1);
  const activeFilterCount =
    (market !== "all" ? 1 : 0) +
    (category !== "all" ? 1 : 0) +
    (audience !== "all" ? 1 : 0) +
    (workflowsOnly ? 1 : 0) +
    (pilotOnly ? 1 : 0) +
    (savedOnly ? 1 : 0) +
    (q ? 1 : 0);

  const displayedItems = useMemo(() => {
    if (!savedOnly) return items;
    return items.filter((item) => saved.has(item.id));
  }, [items, savedOnly, saved]);

  return (
    <div className="biz-market space-y-8">
      <MarketplaceHero
        familyCount={totalFamilies || familyCount || 100}
        agentCount={500}
        categoryCount={industryCategoryCount}
        workflowCount={WORKFLOW_FAMILY_IDS.length}
      />

      <section id="catalogue" className="scroll-mt-24 space-y-4">
        {/* One control strip — search + primary facets */}
        <div className="biz-toolbar flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2 xl:min-w-[340px]">
            <div className="relative min-w-0 flex-1">
              <svg
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[var(--muted-dim)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                ref={searchInputRef}
                className="input !pl-11 !pr-16 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] transition-all duration-200 focus:border-[var(--accent-dim)] focus:shadow-[0_0_20px_-3px_color-mix(in_srgb,var(--accent)_25%,transparent)]"
                placeholder={t("catalog.searchPlaceholder")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setQ("");
                    searchInputRef.current?.blur();
                  }
                }}
                aria-label={t("catalog.searchPlaceholder")}
              />
              <kbd
                className="biz-kbd pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 border border-white/[0.12] bg-white/[0.05] text-[10px] text-[var(--muted)] shadow-sm"
                aria-hidden
              >
                &#8984;K
              </kbd>
            </div>
            <div className="seg" role="group" aria-label="Search mode">
              <button
                type="button"
                className={`seg-btn ${smartFilter ? "seg-btn-active" : ""}`}
                aria-pressed={smartFilter}
                title={t("catalog.smartTitle")}
                onClick={() => setSmartFilter((v) => !v)}
              >
                <IconSparkle />
                <span className="hidden sm:inline">{t("catalog.smart")}</span>
              </button>
              <button
                type="button"
                className={`seg-btn ${listening ? "seg-btn-active" : ""}`}
                aria-label={listening ? t("catalog.voiceStop") : t("catalog.voiceTitle")}
                aria-pressed={listening}
                disabled={!speechSupported}
                title={
                  speechSupported
                    ? listening
                      ? t("catalog.voiceStop")
                      : t("catalog.voiceTitle")
                    : t("catalog.voiceUnsupported")
                }
                onClick={toggleVoiceSearch}
              >
                <IconWave />
                <span className="hidden sm:inline">
                  {listening ? t("catalog.listening") : t("catalog.voice")}
                </span>
              </button>
            </div>
          </div>

          <div className="catalog-filter-scroll" role="group" aria-label={t("catalog.audience")}>
            {AUDIENCES.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setSmartFilter(false);
                  setAudience(a.id);
                }}
                aria-pressed={audience === a.id}
                className={`facet ${audience === a.id ? "facet-active" : ""}`}
              >
                {t(a.labelKey)}
              </button>
            ))}
            <ToggleFacet
              label={t("catalog.workflows")}
              active={workflowsOnly}
              count={workflowsOnly ? familyCount : WORKFLOW_FAMILY_IDS.length}
              title={t("catalog.workflowHint")}
              onToggle={() => {
                setSmartFilter(false);
                setWorkflowsOnly((v) => {
                  const next = !v;
                  // Show the full workflow set when enabling — don't keep a stacked audience filter.
                  if (next) {
                    setAudience("all");
                    setPilotOnly(false);
                  }
                  return next;
                });
              }}
            />
            <ToggleFacet
              label={t("catalog.demo6")}
              active={pilotOnly}
              count={pilotOnly ? familyCount : 100}
              title={t("catalog.goliveHint")}
              onToggle={() => {
                setSmartFilter(false);
                setPilotOnly((v) => {
                  const next = !v;
                  if (next) {
                    setWorkflowsOnly(false);
                  }
                  return next;
                });
              }}
            />
            {saved.size > 0 && (
              <ToggleFacet
                label={t("catalog.saved") || "Saved"}
                active={savedOnly}
                count={saved.size}
                title="Filter to saved agents"
                onToggle={() => {
                  setSmartFilter(false);
                  setSavedOnly((v) => !v);
                }}
              />
            )}

            <FacetSelect
              id="market-filter"
              label={t("catalog.market")}
              icon={<IconGlobe />}
              value={market}
              widthClass="!min-w-[8.5rem]"
              onSelect={(v) => {
                setSmartFilter(false);
                setMarket(v);
              }}
            >
              {MARKETS.map((m) => (
                <option key={m.id} value={m.id}>
                  {"labelKey" in m ? t(m.labelKey) : m.label}
                </option>
              ))}
            </FacetSelect>

            <FacetSelect
              id="category-filter"
              label={t("catalog.industry")}
              icon={<IconGridSq />}
              value={category}
              widthClass="!min-w-[9.5rem] max-w-[230px]"
              onSelect={(v) => {
                setSmartFilter(false);
                setCategory(v);
              }}
            >
              {categories.map((c) => {
                // "All" reflects the other active facets (sum of facet-aware per-industry counts);
                // falls back to the grand total when no counts are loaded yet.
                const allCount =
                  Object.values(categoryCounts).reduce((a, b) => a + b, 0) ||
                  totalFamilies ||
                  familyCount;
                const count = c === "all" ? allCount : categoryCounts[c] ?? 0;
                return (
                  <option key={c} value={c}>
                    {c === "all" ? `${t("catalog.allIndustries")} (${count})` : `${c} (${count})`}
                  </option>
                );
              })}
            </FacetSelect>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
          <p className="min-w-0">
            {workflowsOnly ? (
              <>
                <span className="font-semibold text-[var(--text)]">
                  {savedOnly ? displayedItems.length : familyCount}
                </span>
                {familyCount < WORKFLOW_FAMILY_IDS.length ? (
                  <> {t("catalog.workflowsOf", { total: WORKFLOW_FAMILY_IDS.length })}</>
                ) : (
                  <> {t("catalog.workflowsLabel")}</>
                )}
              </>
            ) : (
              <>
                <span className="font-semibold text-[var(--text)]">
                  {savedOnly ? displayedItems.length : familyCount}
                </span>{" "}
                {t("catalog.agents")}
              </>
            )}
            {smartFilter && smartApplied.length > 0 ? (
              <span className="text-[var(--muted-dim)]">
                {" "}
                · {t("catalog.smartApplied")}: {smartApplied.join(" · ")}
              </span>
            ) : null}
            {listening ? (
              <span className="text-[var(--accent-bright)]"> · {t("catalog.listeningStatus")}</span>
            ) : null}
            {speechHint ? <span className="text-[var(--warn)]"> · {speechHint}</span> : null}
            {pending ? ` · ${t("catalog.updating")}` : null}
          </p>
          {activeFilterCount > 0 ? (
            <button
              type="button"
              className="text-[var(--accent-bright)] hover:underline"
              onClick={() => {
                setQ("");
                setMarket("all");
                setCategory("all");
                setAudience("all");
                setWorkflowsOnly(false);
                setPilotOnly(false);
                setSavedOnly(false);
                setSmartApplied([]);
              }}
            >
              {t("catalog.clearFilters")}
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {displayedItems.map((item, idx) => {
            const hasWorkflow = isWorkflowFamilyId(item.id);
            const hrefMarket = market !== "all" && item.markets[market] ? market : null;
            const href =
              hrefMarket && item.markets[hrefMarket]
                ? `/agents/${item.markets[hrefMarket]}`
                : `/agents/${item.defaultAgentId}`;
            const packs = familyPacks(item);
            const activePack = isPackId(market) ? market : null;
            const blurb =
              CARD_BLURBS[item.id] ?? cleanCardSummary(item.summary, item.name);

            return (
              <article
                key={item.id}
                className="panel panel-interactive group rise card-specular-rim relative flex flex-col overflow-hidden p-0"
                style={{ animationDelay: `${Math.min(idx, 15) * 28}ms` }}
              >
                {/* Sector-tinted ambient hover bloom */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-px rounded-[var(--radius-panel)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in srgb, ${categoryAccent(item.marketplaceCategory)} 18%, transparent) 0%, transparent 70%)`,
                  }}
                />
                <BookmarkButton saved={saved.has(item.id)} onToggle={() => toggleSaved(item.id)} />
                <div className="relative z-[1] flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex items-start gap-3.5">
                    <AgentIcon familyId={item.id} category={item.marketplaceCategory} />
                    <div className="min-w-0 flex-1 pr-7">
                      <h3 className="display text-[1.05rem] font-semibold leading-snug tracking-tight text-[var(--text)] transition-colors duration-200 group-hover:text-[var(--accent-bright)]">
                        {item.name}
                      </h3>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium text-[var(--card-meta)]">
                        <span>{item.marketplaceCategory}</span>
                        {hasWorkflow ? (
                          <span className="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-bright)] shadow-[0_0_8px_-2px_color-mix(in_srgb,var(--accent)_35%,transparent)]">
                            {t("catalog.multiStep")}
                          </span>
                        ) : null}
                        {item.requiresConnectors?.length ? (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--warn)_30%,transparent)] bg-[color-mix(in_srgb,var(--warn)_14%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-[var(--warn)] shadow-[0_0_8px_-2px_color-mix(in_srgb,var(--warn)_35%,transparent)]"
                            title={`Connect ${item.requiresConnectors
                              .map(connectorLabel)
                              .join(", ")} to take live actions`}
                          >
                            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--warn)] shadow-[0_0_6px_var(--warn)]" aria-hidden />
                            <span>Needs setup</span>
                          </span>
                        ) : null}
                        {activePack && packs.includes(activePack) ? (
                          <MarketBadge market={activePack} prominent />
                        ) : null}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 text-[13.5px] leading-relaxed text-[var(--card-body)]">
                    {blurb}
                  </p>
                  {/* Channel badges are shown only when a specific market is selected; hidden in the default "All markets" view. */}
                  {market !== "all" ? <ChannelBadges channels={item.channels} /> : null}

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-[color-mix(in_srgb,var(--line)_70%,transparent)] pt-4">
                    <button
                      type="button"
                      className="text-xs font-semibold text-[var(--muted)] transition-colors hover:text-[var(--text)]"
                      onClick={() => setDetail(item)}
                    >
                      {t("catalog.learnMore")}
                    </button>
                    <Link
                      href={gatedSetupHref(href, agentsOnboarded)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-bright)] shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--accent)_25%,transparent)] transition-all duration-200 hover:border-[color-mix(in_srgb,var(--accent)_55%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] hover:shadow-[0_0_16px_-2px_color-mix(in_srgb,var(--accent)_45%,transparent)]"
                    >
                      <span>{t("catalog.rentSetup")}</span>
                      <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">&#8594;</span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {detail ? (
          <AgentDetailModal
            item={detail}
            market={market}
            onboarded={agentsOnboarded}
            onClose={() => setDetail(null)}
          />
        ) : null}

        {!pending && displayedItems.length === 0 ? (
          <div className="panel px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--bg-elev)] text-[var(--muted)]">
              <svg
                aria-hidden
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="display text-xl font-semibold">
              {savedOnly ? "No saved agents match" : t("catalog.emptyTitle")}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {savedOnly
                ? "Bookmark agents from their card or clear the saved filter."
                : t("catalog.emptyBody")}
            </p>
            <button
              type="button"
              className="btn btn-ghost mt-5"
              onClick={() => {
                setQ("");
                setMarket("all");
                setCategory("all");
                setAudience("all");
                setWorkflowsOnly(false);
                setPilotOnly(false);
                setSavedOnly(false);
              }}
            >
              {t("catalog.resetFilters")}
            </button>
          </div>
        ) : null}
      </section>

      <MarketplaceCTA />
    </div>
  );
}

function AgentDetailModal({
  item,
  market,
  onboarded,
  onClose,
}: {
  item: FamilyItem;
  market: string;
  onboarded: boolean | null;
  onClose: () => void;
}) {
  const t = useT();
  const hasWorkflow = isWorkflowFamilyId(item.id);
  const hrefMarket = market !== "all" && item.markets[market] ? market : null;
  const href =
    hrefMarket && item.markets[hrefMarket]
      ? `/agents/${item.markets[hrefMarket]}`
      : `/agents/${item.defaultAgentId}`;
  const summary = cleanCardSummary(item.summary, item.name);
  const packs = familyPacks(item);
  const activePack = isPackId(market) ? market : null;
  const [caps, setCaps] = useState<FamilyCapabilities | null>(null);
  const [capsError, setCapsError] = useState(false);
  const [capsLoading, setCapsLoading] = useState(true);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    modalRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setCaps(null);
    setCapsError(false);
    setCapsLoading(true);
    const q = activePack ? `?market=${encodeURIComponent(activePack)}` : "";
    fetch(`/api/catalog/family/${encodeURIComponent(item.id)}${q}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("capabilities fetch failed");
        return res.json() as Promise<{ capabilities: FamilyCapabilities }>;
      })
      .then((data) => {
        if (!cancelled) setCaps(data.capabilities);
      })
      .catch(() => {
        if (!cancelled) setCapsError(true);
      })
      .finally(() => {
        if (!cancelled) setCapsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item.id, activePack]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-detail-title"
        className="panel relative max-h-[min(92vh,880px)] w-full max-w-2xl overflow-y-auto p-0 shadow-2xl rise outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="cat-rail"
          style={{ background: categoryAccent(item.marketplaceCategory) }}
        />
        <div className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bg-panel)]/95 px-5 py-4 backdrop-blur sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3.5">
              <AgentIcon familyId={item.id} category={item.marketplaceCategory} />
              <div className="min-w-0 flex-1">
                <h2
                  id="agent-detail-title"
                  className="display text-xl font-semibold leading-snug tracking-tight text-[var(--text)]"
                >
                  {item.name}
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium text-[var(--card-meta)]">
                  <span>{item.marketplaceCategory}</span>
                  <span className="text-[var(--muted-dim)]">·</span>
                  <span className="capitalize">
                    {item.audience === "internal" ? t("catalog.internal") : t("catalog.customer")}
                  </span>
                  {hasWorkflow ? (
                    <span className="rounded-md bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--accent-bright)]">
                      {t("catalog.multiStep")}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {activePack && packs.includes(activePack) ? (
                <MarketBadge market={activePack} prominent />
              ) : null}
              <button
                type="button"
                className="btn btn-ghost px-2.5 py-1.5"
                onClick={onClose}
                aria-label={t("catalog.close")}
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-dim)]">
              {t("catalog.whatItDoes")}
            </h3>
            <p className="agent-card-desc text-[15px] leading-relaxed">
              {caps?.overview || summary}
            </p>
            {hasWorkflow ? (
              <p className="text-sm text-[var(--muted)]">{t("catalog.workflowHint")}</p>
            ) : null}
          </section>

          {capsLoading ? (
            <div className="mt-4 space-y-3" aria-busy="true" aria-label={t("catalog.capabilitiesLoading")}>
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-20 w-full" />
            </div>
          ) : null}
          {capsError && !caps ? (
            <p className="mt-4 text-sm text-[var(--muted)]">{t("catalog.capabilitiesError")}</p>
          ) : null}

          {caps ? (
            <div className="mt-5 space-y-5 border-t border-[var(--line)] pt-5">
              {caps.canDo.length > 0 ? (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-dim)]">
                    {t("catalog.canDo")}
                  </h3>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--text)]">
                    {caps.canDo.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {caps.willNot.length > 0 ? (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-dim)]">
                    {t("catalog.willNot")}
                  </h3>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--card-body)]">
                    {caps.willNot.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {item.requiresConnectors?.length ? (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-dim)]">
                    Connections needed
                  </h3>
                  <p className="mt-1 text-[13px] leading-snug text-[var(--card-body)]">
                    To take live actions (not just answer), connect these after setup — until then the
                    agent stays honest and won&apos;t claim those actions succeeded:
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.requiresConnectors.map((c) => (
                      <span
                        key={c}
                        className="rounded-md bg-[color-mix(in_srgb,var(--warn)_16%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-[var(--warn)]"
                      >
                        {connectorLabel(c)}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}

              {caps.tools.length > 0 ? (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-dim)]">
                    {t("catalog.tools")}
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {caps.tools.map((tool) => (
                      <li
                        key={tool.name}
                        className="rounded-lg bg-[color-mix(in_srgb,var(--bg-panel)_88%,transparent)] px-3 py-2 ring-1 ring-[var(--line)]"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--text)]">
                            {tool.label}
                          </span>
                          <span className="chip !px-2 !py-0.5 text-[10px]">
                            {tool.sideEffects === "write"
                              ? t("catalog.toolWrite")
                              : t("catalog.toolReadOnly")}
                          </span>
                        </div>
                        {tool.description ? (
                          <p className="mt-1 text-[13px] leading-snug text-[var(--card-body)]">
                            {tool.description}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {caps.exampleAsks.length > 0 ? (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-dim)]">
                    {t("catalog.exampleAsks")}
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {caps.exampleAsks.map((ask) => (
                      <li
                        key={ask}
                        className="rounded-md px-2.5 py-1.5 text-[13px] text-[var(--text)] ring-1 ring-[var(--line)]"
                      >
                        “{ask}”
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-dim)]">
                  {t("catalog.howItWorks")}
                </h3>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--text)]">
                  {caps.howItWorks.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </section>
            </div>
          ) : null}

          <dl className="mt-5 grid gap-3 border-t border-[var(--line)] pt-5 text-sm">
            {item.channels.length > 0 ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-dim)]">
                  {t("catalog.channels")}
                </dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {item.channels.map((ch) => (
                    <span key={ch} className="chip !px-2 !py-0.5 text-[11px] capitalize">
                      {ch}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
            {packs.length > 0 ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-dim)]">
                  {t("catalog.marketPacks")}
                </dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {packs.map((p) => (
                    <MarketBadge key={p} market={p} prominent={p === activePack} />
                  ))}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-dim)]">
                {t("catalog.tier")}
              </dt>
              <dd className="mt-1 capitalize text-[var(--text)]">{item.tier}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href={gatedSetupHref(href, onboarded)} className="btn btn-primary" onClick={onClose}>
              {t("catalog.rentSetup")}
            </Link>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t("catalog.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
