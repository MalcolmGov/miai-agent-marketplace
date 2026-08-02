"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { TIER_PRICES } from "@/lib/constants";
import { useT } from "@/lib/locale";
import { parseSmartCatalogQuery } from "@/lib/smart-catalog-query";
import { sectorAccent } from "@/lib/sectors";
import { isWorkflowFamilyId, WORKFLOW_FAMILY_IDS } from "@/lib/workflows";
import { AgentIcon } from "./AgentIcon";
import { MarketplaceCTA, MarketplaceHero } from "./MarketplaceHero";

function rentPriceUsd(tier: string): number {
  const key = tier.toLowerCase() as keyof typeof TIER_PRICES;
  return TIER_PRICES[key] ?? TIER_PRICES.standard;
}

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

const PACK_ORDER = ["us", "eu", "africa", "asia", "oceania"] as const;
type PackId = (typeof PACK_ORDER)[number];

function packLabel(m: string) {
  if (m === "africa") return "Africa";
  if (m === "asia") return "Asia";
  if (m === "oceania") return "Oceania";
  return m.toUpperCase();
}

function isPackId(m: string): m is PackId {
  return (PACK_ORDER as readonly string[]).includes(m);
}

/** Compact SVG market flags — readable at chip size without emoji inconsistency. */
function MarketFlagIcon({ market, className = "h-3 w-[18px]" }: { market: PackId; className?: string }) {
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

function MarketBadge({
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
  // Generic "Label — Label — rest"
  s = s.replace(/^(?:[\w &/]+?\s*[—–-]\s*){2,}(?=[A-Za-z])/u, "");
  // If we still start with the card title, peel it once
  s = s.replace(new RegExp(`^${nameEsc}\\s*[—–-]\\s*`, "i"), "");
  s = s.replace(/^[\s—–-]+/, "").trim();
  // Capitalize first letter
  if (s.length) s = s.charAt(0).toUpperCase() + s.slice(1);
  return s || summary;
}

export function CatalogGrid() {
  const t = useT();
  const [items, setItems] = useState<FamilyItem[]>([]);
  const [familyCount, setFamilyCount] = useState(0);
  const [totalFamilies, setTotalFamilies] = useState(0);
  const [allCategories, setAllCategories] = useState<string[]>(["all"]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [market, setMarket] = useState("all");
  const [category, setCategory] = useState("all");
  const [audience, setAudience] = useState("all");
  const [workflowsOnly, setWorkflowsOnly] = useState(false);
  const [smartFilter, setSmartFilter] = useState(true);
  const [smartApplied, setSmartApplied] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechHint, setSpeechHint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [detail, setDetail] = useState<FamilyItem | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const smartParsed = useMemo(
    () => (smartFilter && q.trim() ? parseSmartCatalogQuery(q) : null),
    [smartFilter, q],
  );
  const searchQ = smartParsed ? smartParsed.q : q;

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionCtor()));
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
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("view", "families");
    if (searchQ) params.set("q", searchQ);
    if (market !== "all") params.set("market", market);
    if (category !== "all") params.set("category", category);
    if (audience !== "all") params.set("audience", audience);
    if (workflowsOnly) params.set("workflow", "1");
    startTransition(() => {
      fetch(`/api/catalog?${params}`)
        .then((r) => r.json())
        .then((d) => {
          const next = (d.items ?? []) as FamilyItem[];
          setItems(next);
          setFamilyCount(d.familyCount ?? d.count ?? 0);
        });
    });
  }, [searchQ, market, category, audience, workflowsOnly]);

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
    (q ? 1 : 0);

  return (
    <div className="space-y-8">
      <MarketplaceHero
        familyCount={totalFamilies || familyCount || 55}
        categoryCount={industryCategoryCount}
        workflowCount={WORKFLOW_FAMILY_IDS.length}
      />

      <section id="catalogue" className="scroll-mt-24 space-y-4">
        {/* One control strip — search + primary facets */}
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
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
              className="input !pl-11 !pr-[10.5rem] sm:!pr-[12.25rem]"
              placeholder={t("catalog.searchPlaceholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={t("catalog.searchPlaceholder")}
            />
            <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
              <button
                type="button"
                className={`inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold uppercase tracking-[0.06em] transition ${
                  smartFilter
                    ? "text-[var(--accent-bright)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
                    : "text-[var(--muted-dim)] hover:text-[var(--text)]"
                }`}
                aria-pressed={smartFilter}
                title={t("catalog.smartTitle")}
                onClick={() => setSmartFilter((v) => !v)}
              >
                {t("catalog.smart")}
              </button>
              <button
                type="button"
                className={`group relative inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 sm:px-3 text-[11px] font-semibold uppercase tracking-[0.07em] transition duration-200 ${
                  listening
                    ? "text-[var(--accent-ink)] bg-[var(--accent-bright)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_35%,transparent),0_8px_20px_-8px_color-mix(in_srgb,var(--accent)_70%,transparent)]"
                    : speechSupported
                      ? "text-[var(--accent-ink)] bg-gradient-to-b from-[var(--accent-bright)] to-[var(--accent)] shadow-[0_6px_16px_-8px_color-mix(in_srgb,var(--accent)_80%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--accent-bright)_55%,transparent)] hover:brightness-110 hover:shadow-[0_8px_22px_-8px_color-mix(in_srgb,var(--accent)_90%,transparent)] active:scale-[0.98]"
                      : "cursor-not-allowed text-[var(--muted-dim)] bg-[var(--bg-panel)] opacity-50 ring-1 ring-[var(--line)]"
                }`}
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
                {listening ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-lg animate-ping bg-[color-mix(in_srgb,var(--accent)_28%,transparent)] opacity-60"
                  />
                ) : null}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`relative h-[15px] w-[15px] ${listening ? "animate-pulse" : ""}`}
                  aria-hidden
                >
                  <path
                    d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"
                    strokeLinejoin="round"
                  />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
                </svg>
                <span className="relative hidden sm:inline">
                  {listening ? t("catalog.listening") : t("catalog.voice")}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("catalog.audience")}>
              {AUDIENCES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setSmartFilter(false);
                    setAudience(a.id);
                  }}
                  className={`chip ${audience === a.id ? "filter-active" : ""}`}
                >
                  {t(a.labelKey)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSmartFilter(false);
                  setWorkflowsOnly((v) => {
                    const next = !v;
                    // Show the full workflow set when enabling — don't keep a stacked audience filter.
                    if (next) {
                      setAudience("all");
                    }
                    return next;
                  });
                }}
                className={`chip ${workflowsOnly ? "filter-active chip-live" : ""}`}
                title={t("catalog.workflowHint")}
              >
                {t("catalog.workflows")}
                <span className="cat-count">
                  {workflowsOnly ? familyCount : WORKFLOW_FAMILY_IDS.length}
                </span>
              </button>
            </div>

            <label className="sr-only" htmlFor="market-filter">
              {t("catalog.market")}
            </label>
            <select
              id="market-filter"
              className="input !w-auto !py-2 text-xs font-semibold uppercase tracking-wide"
              value={market}
              onChange={(e) => {
                setSmartFilter(false);
                setMarket(e.target.value);
              }}
            >
              {MARKETS.map((m) => (
                <option key={m.id} value={m.id}>
                  {"labelKey" in m ? t(m.labelKey) : m.label}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="category-filter">
              {t("catalog.industry")}
            </label>
            <select
              id="category-filter"
              className="input !w-auto max-w-[220px] !py-2 text-xs font-semibold"
              value={category}
              onChange={(e) => {
                setSmartFilter(false);
                setCategory(e.target.value);
              }}
            >
              {categories.map((c) => {
                const count = c === "all" ? totalFamilies || familyCount : categoryCounts[c] ?? 0;
                return (
                  <option key={c} value={c}>
                    {c === "all" ? `${t("catalog.allIndustries")} (${count})` : `${c} (${count})`}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
          <p className="min-w-0">
            {workflowsOnly ? (
              <>
                <span className="font-semibold text-[var(--text)]">{familyCount}</span>
                {familyCount < WORKFLOW_FAMILY_IDS.length ? (
                  <> {t("catalog.workflowsOf", { total: WORKFLOW_FAMILY_IDS.length })}</>
                ) : (
                  <> {t("catalog.workflowsLabel")}</>
                )}
              </>
            ) : (
              <>
                <span className="font-semibold text-[var(--text)]">{familyCount}</span>{" "}
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
                setSmartApplied([]);
              }}
            >
              {t("catalog.clearFilters")}
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {items.map((item, idx) => {
            const hasWorkflow = isWorkflowFamilyId(item.id);
            const hrefMarket = market !== "all" && item.markets[market] ? market : null;
            const href =
              hrefMarket && item.markets[hrefMarket]
                ? `/agents/${item.markets[hrefMarket]}`
                : `/agents/${item.defaultAgentId}`;
            const packs = familyPacks(item);
            const activePack = isPackId(market) ? market : null;
            const showPacks = activePack
              ? packs.includes(activePack)
                ? [activePack]
                : []
              : packs;

            return (
              <article
                key={item.id}
                className="panel panel-interactive group rise flex flex-col p-0"
                style={{ animationDelay: `${Math.min(idx, 15) * 28}ms` }}
              >
                <div
                  className="cat-rail"
                  style={{ background: categoryAccent(item.marketplaceCategory) }}
                />
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex items-start gap-3.5">
                    <AgentIcon familyId={item.id} category={item.marketplaceCategory} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="display text-[1.05rem] font-semibold leading-snug tracking-tight text-[var(--text)] transition group-hover:text-[var(--accent-bright)]">
                          {item.name}
                        </h3>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span
                            className="inline-flex items-baseline gap-0.5 rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-2.5 py-1 text-[12px] font-semibold tabular-nums text-[var(--accent-bright)] ring-1 ring-[color-mix(in_srgb,var(--accent)_32%,transparent)]"
                            title={`${item.tier} plan`}
                          >
                            <span className="text-[10px] font-bold opacity-80">$</span>
                            {rentPriceUsd(item.tier)}
                            <span className="ml-0.5 text-[10px] font-medium opacity-75">/mo</span>
                          </span>
                          {activePack && packs.includes(activePack) ? (
                            <MarketBadge market={activePack} prominent />
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium text-[var(--card-meta)]">
                        <span>{item.marketplaceCategory}</span>
                        {hasWorkflow ? (
                          <span className="rounded-md bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--accent-bright)]">
                            {t("catalog.multiStep")}
                          </span>
                        ) : null}
                      </p>
                      {!activePack && showPacks.length > 0 ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1" aria-label={t("catalog.marketPacks")}>
                          {showPacks.map((p) => (
                            <span
                              key={p}
                              className="inline-flex items-center rounded-[4px] ring-1 ring-[var(--line)]"
                              title={`${packLabel(p)} pack`}
                            >
                              <MarketFlagIcon market={p} className="h-2.5 w-[15px]" />
                              <span className="sr-only">{packLabel(p)}</span>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
                    <button
                      type="button"
                      className="text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--accent-bright)] hover:underline"
                      onClick={() => setDetail(item)}
                    >
                      {t("catalog.learnMore")}
                    </button>
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-bright)] transition group-hover:gap-2"
                    >
                      {t("catalog.rentSetup")}
                      <span aria-hidden>→</span>
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
            onClose={() => setDetail(null)}
          />
        ) : null}

        {!pending && items.length === 0 ? (
          <div className="panel px-6 py-12 text-center">
            <p className="display text-xl font-semibold">{t("catalog.emptyTitle")}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{t("catalog.emptyBody")}</p>
            <button
              type="button"
              className="btn btn-ghost mt-5"
              onClick={() => {
                setQ("");
                setMarket("all");
                setCategory("all");
                setAudience("all");
                setWorkflowsOnly(false);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-detail-title"
        className="panel relative w-full max-w-lg overflow-hidden p-0 shadow-2xl rise"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="cat-rail"
          style={{ background: categoryAccent(item.marketplaceCategory) }}
        />
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3.5">
            <AgentIcon familyId={item.id} category={item.marketplaceCategory} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h2
                  id="agent-detail-title"
                  className="display text-xl font-semibold leading-snug tracking-tight text-[var(--text)]"
                >
                  {item.name}
                </h2>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className="inline-flex items-baseline gap-0.5 rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-2.5 py-1 text-[13px] font-semibold tabular-nums text-[var(--accent-bright)] ring-1 ring-[color-mix(in_srgb,var(--accent)_32%,transparent)]"
                    title={`${item.tier} plan`}
                  >
                    <span className="text-[10px] font-bold opacity-80">$</span>
                    {rentPriceUsd(item.tier)}
                    <span className="ml-0.5 text-[10px] font-medium opacity-75">/mo</span>
                  </span>
                  {activePack && packs.includes(activePack) ? (
                    <MarketBadge market={activePack} prominent />
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-ghost px-2 py-1"
                    onClick={onClose}
                    aria-label={t("catalog.close")}
                  >
                    ✕
                  </button>
                </div>
              </div>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium text-[var(--card-meta)]">
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

          <p className="agent-card-desc text-[15px] leading-relaxed">{summary}</p>

          {hasWorkflow ? (
            <p className="mt-3 text-sm text-[var(--muted)]">{t("catalog.workflowHint")}</p>
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
                  {item.hasZa ? (
                    <span className="chip !px-2 !py-0.5 text-[11px]">ZA</span>
                  ) : null}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-dim)]">
                {t("catalog.tier")}
              </dt>
              <dd className="mt-1 capitalize text-[var(--text)]">
                {item.tier} · ${rentPriceUsd(item.tier)}/mo
              </dd>
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
