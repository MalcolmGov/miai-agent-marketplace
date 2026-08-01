"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { MONDAY_PILOT_FAMILY_IDS } from "@/lib/monday-pilot";
import { parseSmartCatalogQuery } from "@/lib/smart-catalog-query";
import { isWorkflowFamilyId, WORKFLOW_FAMILY_IDS } from "@/lib/workflows";
import { AgentIcon } from "./AgentIcon";
import { MarketplaceCTA, MarketplaceHero } from "./MarketplaceHero";

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

const PACK_ORDER = ["us", "eu", "africa", "asia"] as const;

function packLabel(m: string) {
  if (m === "africa") return "Africa";
  if (m === "asia") return "Asia";
  return m.toUpperCase();
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

const MARKETS = [
  { id: "all", label: "All markets" },
  { id: "us", label: "US" },
  { id: "eu", label: "EU" },
  { id: "africa", label: "Africa" },
  { id: "asia", label: "Asia" },
] as const;

const AUDIENCES = [
  { id: "all", label: "All" },
  { id: "customer", label: "Customer" },
  { id: "internal", label: "Internal" },
] as const;

/** Soft category accent for card rails — teal family, not purple. */
const CATEGORY_ACCENT: Record<string, string> = {
  "Customer & front office": "linear-gradient(90deg,#3dd6c6,#5ec8f0)",
  Education: "linear-gradient(90deg,#6aefe0,#3dd6c6)",
  "Financial services": "linear-gradient(90deg,#f0b429,#3dd6c6)",
  Property: "linear-gradient(90deg,#7eb6ff,#3dd6c6)",
  "Health & wellness": "linear-gradient(90deg,#5eead4,#34d399)",
  "Hospitality & travel": "linear-gradient(90deg,#fbbf24,#3dd6c6)",
  "Retail & e-commerce": "linear-gradient(90deg,#38bdf8,#3dd6c6)",
  "Professional services": "linear-gradient(90deg,#94a3b8,#3dd6c6)",
  "Internal & back office": "linear-gradient(90deg,#64748b,#3dd6c6)",
  "Logistics & field ops": "linear-gradient(90deg,#2dd4bf,#0ea5e9)",
};

function categoryAccent(category: string) {
  return CATEGORY_ACCENT[category] ?? "linear-gradient(90deg,#3dd6c6,#2bb8a8)";
}

function statusBadge(item: FamilyItem) {
  if (item.liveReady) return { label: "Live", tone: "live" as const };
  if (item.pilot) return { label: "Pilot", tone: "live" as const };
  if (item.catalogueReady) return { label: "Ready", tone: "ready" as const };
  return null;
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
  const searchParams = useSearchParams();
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
    if (searchParams.get("pilot") === "1") {
      setPilotOnly(true);
      setSmartFilter(false);
      setAudience("all");
      setWorkflowsOnly(false);
    }
  }, [searchParams]);

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
  }, [searchQ, market, category, audience, workflowsOnly, pilotOnly]);

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
              className="input !pl-11 !pr-[7.25rem]"
              placeholder="Search agents — booking, claims, stock…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search agent families"
            />
            <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
              <button
                type="button"
                className={`inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-semibold uppercase tracking-[0.06em] transition ${
                  smartFilter
                    ? "text-[var(--accent-bright)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                    : "text-[var(--muted-dim)] hover:text-[var(--text)]"
                }`}
                aria-pressed={smartFilter}
                title="Smart filter — understand market, industry, and workflow phrases"
                onClick={() => setSmartFilter((v) => !v)}
              >
                Smart
              </button>
              <button
                type="button"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${
                  listening
                    ? "text-[var(--accent-ink)] bg-[var(--accent)]"
                    : speechSupported
                      ? "text-[var(--muted)] hover:text-[var(--accent-bright)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
                      : "cursor-not-allowed text-[var(--muted-dim)] opacity-50"
                }`}
                aria-label={listening ? "Stop voice search" : "Voice search"}
                aria-pressed={listening}
                disabled={!speechSupported}
                title={
                  speechSupported
                    ? listening
                      ? "Listening… click to stop"
                      : "Voice search"
                    : "Voice search not supported in this browser"
                }
                onClick={toggleVoiceSearch}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  className={`h-4 w-4 ${listening ? "animate-pulse" : ""}`}
                  aria-hidden
                >
                  <path
                    d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"
                    strokeLinejoin="round"
                  />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Audience">
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
                  {a.label}
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
                title="Multi-step agents that plan, confirm, then act"
              >
                Workflows
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
                      setAudience("all");
                      setWorkflowsOnly(false);
                      setCategory("all");
                    }
                    return next;
                  });
                }}
                className={`chip ${pilotOnly ? "filter-active chip-live" : ""}`}
                title="Demo / UAT shortlist — six of 220 (license covers full catalogue)"
              >
                Demo 6
                <span className="cat-count">
                  {pilotOnly ? familyCount : MONDAY_PILOT_FAMILY_IDS.length}
                </span>
              </button>
            </div>

            <label className="sr-only" htmlFor="market-filter">
              Market
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
                  {m.label}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="category-filter">
              Industry
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
                    {c === "all" ? `All industries (${count})` : `${c} (${count})`}
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
                  <>
                    {" "}
                    of {WORKFLOW_FAMILY_IDS.length} workflows
                    {audience !== "all" ? ` · ${audience}` : null}
                    {category !== "all" ? " · industry filter" : null}
                  </>
                ) : (
                  <> workflows</>
                )}
              </>
            ) : (
              <>
                <span className="font-semibold text-[var(--text)]">{familyCount}</span> agents
              </>
            )}
            {smartFilter && smartApplied.length > 0 ? (
              <span className="text-[var(--muted-dim)]">
                {" "}
                · Smart: {smartApplied.join(" · ")}
              </span>
            ) : null}
            {listening ? <span className="text-[var(--accent-bright)]"> · Listening…</span> : null}
            {speechHint ? <span className="text-[var(--warn)]"> · {speechHint}</span> : null}
            {pending ? " · updating…" : null}
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
              Clear filters
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {items.map((item, idx) => {
            const badge = statusBadge(item);
            const hasWorkflow = isWorkflowFamilyId(item.id);
            const hrefMarket = market !== "all" && item.markets[market] ? market : null;
            const href =
              hrefMarket && item.markets[hrefMarket]
                ? `/agents/${item.markets[hrefMarket]}`
                : `/agents/${item.defaultAgentId}`;

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
                        {badge ? (
                          <span
                            className={`chip shrink-0 !px-2 !py-0.5 text-[10px] ${badge.tone === "live" ? "chip-live" : ""}`}
                          >
                            {badge.tone === "live" ? (
                              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                            ) : null}
                            {badge.label}
                          </span>
                        ) : (
                          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-dim)]">
                            {item.tier}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] font-medium text-[var(--card-meta)]">
                        <span>{item.marketplaceCategory}</span>
                        {hasWorkflow ? (
                          <span className="rounded-md bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--accent-bright)]">
                            Multi-step
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
                    <button
                      type="button"
                      className="text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--accent-bright)] hover:underline"
                      onClick={() => setDetail(item)}
                    >
                      Learn more
                    </button>
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-bright)] transition group-hover:gap-2"
                    >
                      Rent / setup
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
            <p className="display text-xl font-semibold">No agents match</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Clear search or filters to see the full catalogue.
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
              }}
            >
              Reset filters
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
  const badge = statusBadge(item);
  const hasWorkflow = isWorkflowFamilyId(item.id);
  const hrefMarket = market !== "all" && item.markets[market] ? market : null;
  const href =
    hrefMarket && item.markets[hrefMarket]
      ? `/agents/${item.markets[hrefMarket]}`
      : `/agents/${item.defaultAgentId}`;
  const summary = cleanCardSummary(item.summary, item.name);
  const packs = PACK_ORDER.filter((p) => item.packs.includes(p) || item.markets[p]);

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
                <button
                  type="button"
                  className="btn btn-ghost shrink-0 px-2 py-1"
                  onClick={onClose}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium text-[var(--card-meta)]">
                <span>{item.marketplaceCategory}</span>
                <span className="text-[var(--muted-dim)]">·</span>
                <span className="capitalize">{item.audience}</span>
                {badge ? (
                  <>
                    <span className="text-[var(--muted-dim)]">·</span>
                    <span
                      className={`chip !px-2 !py-0.5 text-[10px] ${badge.tone === "live" ? "chip-live" : ""}`}
                    >
                      {badge.tone === "live" ? (
                        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                      ) : null}
                      {badge.label}
                    </span>
                  </>
                ) : null}
                {hasWorkflow ? (
                  <span className="rounded-md bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--accent-bright)]">
                    Multi-step
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <p className="agent-card-desc text-[15px] leading-relaxed">{summary}</p>

          {hasWorkflow ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              Plans the next step, confirms with you, then acts — instead of a single reply.
            </p>
          ) : null}

          <dl className="mt-5 grid gap-3 border-t border-[var(--line)] pt-5 text-sm">
            {item.channels.length > 0 ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-dim)]">
                  Channels
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
                  Market packs
                </dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {packs.map((p) => (
                    <span key={p} className="chip !px-2 !py-0.5 text-[11px]">
                      {packLabel(p)}
                    </span>
                  ))}
                  {item.hasZa ? (
                    <span className="chip !px-2 !py-0.5 text-[11px]">ZA</span>
                  ) : null}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-dim)]">
                Tier
              </dt>
              <dd className="mt-1 capitalize text-[var(--text)]">{item.tier}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href={href} className="btn btn-primary" onClick={onClose}>
              Rent / setup
            </Link>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
