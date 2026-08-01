"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { isWorkflowFamilyId, WORKFLOW_FAMILY_IDS } from "@/lib/workflows";
import { AgentIcon } from "./AgentIcon";
import { MarketplaceCTA, MarketplaceHero } from "./MarketplaceHero";

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
  const [pending, startTransition] = useTransition();

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
    if (q) params.set("q", q);
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
  }, [q, market, category, audience, workflowsOnly]);

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
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-dim)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              className="input pl-10"
              placeholder="Search agents — booking, claims, stock…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search agent families"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Audience">
              {AUDIENCES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAudience(a.id)}
                  className={`chip ${audience === a.id ? "filter-active" : ""}`}
                >
                  {a.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setWorkflowsOnly((v) => !v)}
                className={`chip ${workflowsOnly ? "filter-active chip-live" : ""}`}
                title="Multi-step agents that plan, confirm, then act"
              >
                Workflows
                <span className="cat-count">{WORKFLOW_FAMILY_IDS.length}</span>
              </button>
            </div>

            <label className="sr-only" htmlFor="market-filter">
              Market
            </label>
            <select
              id="market-filter"
              className="input !w-auto !py-2 text-xs font-semibold uppercase tracking-wide"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
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
              onChange={(e) => setCategory(e.target.value)}
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
          <p>
            <span className="font-semibold text-[var(--text)]">{familyCount}</span> agents
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
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {items.map((item, idx) => {
            const hrefMarket = market !== "all" && item.markets[market] ? market : null;
            const href =
              hrefMarket && item.markets[hrefMarket]
                ? `/agents/${item.markets[hrefMarket]}`
                : `/agents/${item.defaultAgentId}`;
            const badge = statusBadge(item);
            const hasWorkflow = isWorkflowFamilyId(item.id);

            return (
              <Link
                key={item.id}
                href={href}
                className="panel panel-interactive group rise flex flex-col p-0"
                style={{ animationDelay: `${Math.min(idx, 15) * 28}ms` }}
              >
                <div
                  className="cat-rail"
                  style={{ background: categoryAccent(item.marketplaceCategory) }}
                />
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="mb-4 flex items-start gap-3.5">
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

                  <p className="agent-card-desc line-clamp-3 flex-1">
                    {cleanCardSummary(item.summary, item.name)}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-[var(--line)] pt-3.5 text-sm font-semibold text-[var(--accent-bright)]">
                    <span>Rent / setup</span>
                    <span
                      aria-hidden
                      className="transition-transform duration-200 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

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
