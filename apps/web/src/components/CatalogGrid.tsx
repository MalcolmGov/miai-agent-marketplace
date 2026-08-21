"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useT } from "@/lib/locale";
import { parseSmartCatalogQuery } from "@/lib/smart-catalog-query";
import { sectorAccent } from "@/lib/sectors";
import { stripExampleTenant, type FamilyCapabilities } from "@/lib/family-capabilities";
import { isWorkflowFamilyId, WORKFLOW_FAMILY_IDS } from "@/lib/workflows";
import { AgentIcon } from "./AgentIcon";
import { MarketplaceCTA, MarketplaceHero } from "./MarketplaceHero";
import {
  MarketBadge,
  MarketFlagIcon,
  PACK_ORDER,
  type PackId,
  isPackId,
  packLabel,
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
    (q ? 1 : 0);

  return (
    <div className="space-y-8">
      <MarketplaceHero
        familyCount={totalFamilies || familyCount || 100}
        agentCount={500}
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
              className="input !pl-11 !pr-[7.25rem] sm:!pr-[12.25rem]"
              placeholder={t("catalog.searchPlaceholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={t("catalog.searchPlaceholder")}
            />
            <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5 sm:gap-1">
              <button
                type="button"
                className={`inline-flex h-8 items-center gap-1 rounded-lg px-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] transition sm:px-2 sm:text-[11px] ${
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

          <div className="catalog-filter-scroll" role="group" aria-label={t("catalog.audience")}>
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
                      setPilotOnly(false);
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
              <button
                type="button"
                onClick={() => {
                  setSmartFilter(false);
                  setPilotOnly((v) => {
                    const next = !v;
                    if (next) {
                      setWorkflowsOnly(false);
                    }
                    return next;
                  });
                }}
                className={`chip ${pilotOnly ? "filter-active chip-live" : ""}`}
                title={t("catalog.goliveHint")}
              >
                {t("catalog.demo6")}
                <span className="cat-count">{pilotOnly ? familyCount : 100}</span>
              </button>

            <label className="sr-only" htmlFor="market-filter">
              {t("catalog.market")}
            </label>
            <select
              id="market-filter"
              className="input !w-auto !min-w-[6.5rem] !py-2 text-xs font-semibold uppercase tracking-wide"
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
              className="input !w-auto !min-w-[8rem] max-w-[220px] !py-2 text-xs font-semibold"
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
                setPilotOnly(false);
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
                        {activePack && packs.includes(activePack) ? (
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <MarketBadge market={activePack} prominent />
                          </div>
                        ) : null}
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
                setPilotOnly(false);
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-detail-title"
        className="panel relative max-h-[min(92vh,880px)] w-full max-w-2xl overflow-y-auto p-0 shadow-2xl rise"
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
            <p className="mt-4 text-sm text-[var(--muted)]">{t("catalog.capabilitiesLoading")}</p>
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
