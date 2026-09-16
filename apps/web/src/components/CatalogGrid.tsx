"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/lib/locale";
import { parseSmartCatalogQuery } from "@/lib/smart-catalog-query";
import { sectorAccent } from "@/lib/sectors";
import { stripExampleTenant, type FamilyCapabilities } from "@/lib/family-capabilities";
import { isWorkflowFamilyId, WORKFLOW_FAMILY_IDS } from "@/lib/workflows";
import { AgentIcon } from "./AgentIcon";
import { CARD_BLURBS } from "@/lib/card-blurbs";
import { MarketplaceCTA, MarketplaceHero } from "./MarketplaceHero";
import { FlagshipShowcase } from "./FlagshipShowcase";
import { MarketplaceBoardroom } from "./MarketplaceBoardroom";
import { AgentSuitesSection } from "./AgentSuitesSection";
import { EnterpriseConnectors } from "./EnterpriseConnectors";
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
  /** Optional count badge — omit for a calmer toolbar (the result count updates below anyway). */
  count?: number;
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
      {typeof count === "number" ? <span className="cat-count">{count}</span> : null}
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
type MarketplaceView = "all" | "voice-studio" | "boardroom" | "suites" | "connectors" | "catalogue";

  const [marketplaceView, setMarketplaceView] = useState<MarketplaceView>("all");
  // Family grid batch size — “Show more” grows it; filters reset it (see effect below).
  const [visibleCount, setVisibleCount] = useState(24);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechHint, setSpeechHint] = useState<string | null>(null);
  // Explicit loading flag. (useTransition's `isPending` did NOT track the fetch — the transition
  // callback returned before the un-awaited promise settled — so the "Updating…" affordance was dead.)
  const [pending, setPending] = useState(false);
  const [detail, setDetail] = useState<FamilyItem | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
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
    const urlQ = params.get("q");
    if (urlQ) {
      setQ(urlQ);
      requestAnimationFrame(() => {
        document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" });
      });
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
      setPending(false);
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
    // Guard against out-of-order responses: only the latest filter's fetch may write state. Without
    // this, a slow earlier request (e.g. "sal") can resolve after a newer one ("salon") and leave the
    // grid showing results for a filter the user already moved past.
    let cancelled = false;
    const controller = new AbortController();
    setPending(true);
    fetch(`/api/catalog?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const next = (d.items ?? []) as FamilyItem[];
        setItems(next);
        setFamilyCount(d.familyCount ?? d.count ?? 0);
        if (d.categoryCounts) setCategoryCounts(d.categoryCounts as Record<string, number>);
        setPending(false);
      })
      .catch(() => {
        // Swallow the AbortError from a superseded request; only clear loading if we're still current.
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
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

  // Progressive disclosure: the family grid starts with one screenful — “Show more” fetches the
  // next batch. Reset whenever the result set changes so every filter starts compact.
  // (103 families rendered at once made the page ~7,500px tall.)
  useEffect(() => {
    setVisibleCount(24);
  }, [q, market, category, audience, workflowsOnly, pilotOnly, savedOnly]);

  return (
    <div className="biz-market space-y-8">
      <MarketplaceHero
        familyCount={totalFamilies || familyCount || 102}
        agentCount={525}
        categoryCount={industryCategoryCount}
        workflowCount={WORKFLOW_FAMILY_IDS.length}
        onSearch={(term) => {
          setQ(term);
          setMarketplaceView("catalogue");
          requestAnimationFrame(() => {
            document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" });
          });
        }}
        onSelectFeature={(feat) => {
          setMarketplaceView(feat);
        }}
      />

      {/* Premier Marketplace Experience Navigator Bar */}
      <div className="sticky top-2 z-30 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0c1420]/95 p-2 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 w-full">
          <button
            type="button"
            onClick={() => setMarketplaceView("all")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
              marketplaceView === "all"
                ? "bg-white/15 text-white border border-white/20 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>✨ Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setMarketplaceView("voice-studio")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
              marketplaceView === "voice-studio"
                ? "bg-[#00D2FF] text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.4)]"
                : "text-slate-400 hover:text-[#00D2FF] hover:bg-[#00D2FF]/10"
            }`}
          >
            <span>⚡ Voice Studio & Flagships</span>
          </button>

          <button
            type="button"
            onClick={() => setMarketplaceView("boardroom")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
              marketplaceView === "boardroom"
                ? "bg-purple-500 text-slate-950 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                : "text-slate-400 hover:text-purple-300 hover:bg-purple-500/10"
            }`}
          >
            <span>🏛️ AI Executive Boardroom</span>
          </button>

          <button
            type="button"
            onClick={() => setMarketplaceView("suites")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
              marketplaceView === "suites"
                ? "bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
            }`}
          >
            <span>📦 Enterprise Suites</span>
          </button>

          <button
            type="button"
            onClick={() => setMarketplaceView("connectors")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
              marketplaceView === "connectors"
                ? "bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                : "text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10"
            }`}
          >
            <span>🔌 Certified Connectors</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMarketplaceView("catalogue");
              requestAnimationFrame(() => {
                document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" });
              });
            }}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
              marketplaceView === "catalogue"
                ? "bg-[var(--accent)] text-slate-950 shadow-[0_0_15px_rgba(46,196,182,0.4)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>🌐 Global Regional Catalog</span>
          </button>

          <Link
            href="/my-agents"
            className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.15)] ml-auto"
          >
            <span>🤖 My Agents</span>
          </Link>
        </div>
      </div>

      {/* The default “Overview” view is the curated path: hero → connectors strip → catalogue.
          Flagships / Boardroom / Suites live behind their own nav tabs and hero cards so the
          marketplace page stays scannable (~8k px shorter — they used to stack in view “all”). */}

      {/* 1. Flagship & Voice Studio */}
      {marketplaceView === "voice-studio" && !q && category === "all" && !savedOnly && !pilotOnly && !workflowsOnly && (
        <FlagshipShowcase />
      )}

      {/* 2. AI Executive Boardroom */}
      {marketplaceView === "boardroom" && !q && category === "all" && !savedOnly && !pilotOnly && !workflowsOnly && (
        <MarketplaceBoardroom />
      )}

      {/* 3. Enterprise Agent Suites */}
      {marketplaceView === "suites" && !q && category === "all" && !savedOnly && !pilotOnly && !workflowsOnly && (
        <AgentSuitesSection />
      )}

      {/* 4. Enterprise Connectors Directory */}
      {(marketplaceView === "all" || marketplaceView === "connectors") && !q && category === "all" && !savedOnly && !pilotOnly && !workflowsOnly && (
        <EnterpriseConnectors />
      )}

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
            {/* One segmented control for the audience facet — three loose pills read as noise. */}
            <div className="seg shrink-0" role="group" aria-label={t("catalog.audience")}>
              {AUDIENCES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setSmartFilter(false);
                    setAudience(a.id);
                  }}
                  aria-pressed={audience === a.id}
                  className={`seg-btn ${audience === a.id ? "seg-btn-active" : ""}`}
                >
                  {t(a.labelKey)}
                </button>
              ))}
            </div>
            <ToggleFacet
              label={t("catalog.workflows")}
              active={workflowsOnly}
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
                // "All" reflects the other active facets (sum of facet-aware per-industry counts).
                // With a filter active, a zero sum is a REAL result (e.g. a search matching nothing),
                // so show 0 — the grand-total fallback is only for the initial unfiltered pre-load
                // window before any facet counts have arrived.
                const summed = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
                const allCount =
                  activeFilterCount > 0 ? summed : summed || totalFamilies || familyCount;
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

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {displayedItems.slice(0, visibleCount).map((item, idx) => {
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
                className="glow-border-card group relative flex flex-col justify-between overflow-hidden rounded-2xl p-3 sm:p-5 transition-all duration-300 hover:-translate-y-1 active:scale-[0.98]"
                style={{ animationDelay: `${Math.min(idx, 15) * 25}ms` }}
              >
                {/* Luminous top rim flare */}
                <div
                  className="pointer-events-none absolute top-0 inset-x-0 h-[1.5px] opacity-75 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, rgba(61,214,198,0.85) 30%, ${categoryAccent(item.marketplaceCategory)} 70%, transparent 100%)`,
                  }}
                  aria-hidden
                />

                {/* Top Bento Header: Icon on Left, Category Pill + Bookmark on Right */}
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="relative shrink-0">
                      <AgentIcon
                        familyId={item.id}
                        category={item.marketplaceCategory}
                        className="!h-8 !w-8 sm:!h-10 sm:!w-10 !rounded-lg sm:!rounded-xl"
                      />
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                      {/* Category: a quiet dot + label — the bordered pill was pure chrome. */}
                      <span
                        className="inline-flex min-w-0 items-center gap-1.5 text-[9px] sm:text-[10.5px] font-medium tracking-wide text-slate-400/90"
                        title={item.marketplaceCategory}
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: categoryAccent(item.marketplaceCategory) }}
                          aria-hidden
                        />
                        <span className="truncate max-w-[75px] sm:max-w-none">{item.marketplaceCategory}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSaved(item.id)}
                        aria-pressed={saved.has(item.id)}
                        aria-label={saved.has(item.id) ? "Saved" : "Save agent"}
                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center transition-colors duration-200 ${
                          saved.has(item.id)
                            ? "text-[var(--accent-bright)]"
                            : "text-slate-500 hover:text-white"
                        }`}
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill={saved.has(item.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                          <path d="M6 4h12v16l-6-4-6 4z" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Title & Micro-Badges */}
                  <div className="mt-2 sm:mt-3">
                    <h3 className="text-[12.5px] sm:text-[15px] font-bold leading-snug tracking-tight text-white transition-colors duration-200 group-hover:text-[var(--accent-bright)] line-clamp-2">
                      {item.name}
                    </h3>

                    <div className="mt-1 sm:mt-1.5 flex flex-wrap items-center gap-1">
                      {hasWorkflow ? (
                        <span className="inline-flex items-center gap-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-cyan-300">
                          ✦ {t("catalog.multiStep")}
                        </span>
                      ) : null}
                      {item.requiresConnectors?.length ? (
                        <span
                          className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-amber-300"
                          title={`Requires ${item.requiresConnectors.map(connectorLabel).join(", ")} setup`}
                        >
                          <span>Needs connector</span>
                        </span>
                      ) : null}
                      {activePack && packs.includes(activePack) ? (
                        <MarketBadge market={activePack} prominent />
                      ) : null}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="mt-1.5 sm:mt-2 text-[10.5px] sm:text-[12.5px] leading-tight sm:leading-relaxed text-slate-300/85 line-clamp-2">
                    {blurb}
                  </p>
                </div>

                {/* Footer Action Bar: Details Modal + Glowing Setup CTA */}
                <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-white/[0.08] flex items-center justify-between gap-1">
                  <button
                    type="button"
                    className="text-[10.5px] sm:text-[12px] font-medium text-slate-400 hover:text-white transition-colors"
                    onClick={() => setDetail(item)}
                  >
                    Details ↗
                  </button>

                  <Link
                    href={href}
                    className="inline-flex items-center gap-1 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#3dd6c6] to-[#20b2aa] hover:from-[#4ee5d5] hover:to-[#2bc4bb] px-2.5 sm:px-4 py-1 sm:py-1.5 text-[10.5px] sm:text-[12px] font-bold text-slate-950 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                  >
                    <span>Setup</span>
                    <span aria-hidden className="text-[10px] font-bold transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {!pending && displayedItems.length > visibleCount ? (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setVisibleCount((v) => v + 24)}
              className="btn btn-ghost text-xs"
            >
              Show more agents ({Math.min(visibleCount, displayedItems.length)} of {displayedItems.length}) ↓
            </button>
          </div>
        ) : null}

        {detail ? (
          <AgentDetailModal
            item={detail}
            market={market}
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
  onClose,
}: {
  item: FamilyItem;
  market: string;
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
            <Link href={href} className="btn btn-primary" onClick={onClose}>
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
