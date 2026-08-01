"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { isWorkflowFamilyId, WORKFLOW_FAMILY_IDS } from "@/lib/workflows";
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
  { id: "all", label: "All audiences" },
  { id: "customer", label: "Customer-facing" },
  { id: "internal", label: "Internal" },
] as const;

const PACK_ORDER = ["us", "eu", "africa", "asia"] as const;

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

function packLabel(m: string) {
  if (m === "africa") return "Africa";
  if (m === "asia") return "Asia";
  return m.toUpperCase();
}

function statusBadge(item: FamilyItem) {
  if (item.liveReady) return { label: "Live", tone: "live" as const };
  if (item.pilot) return { label: "Pilot", tone: "live" as const };
  if (item.catalogueReady) return { label: "Catalogue ready", tone: "ready" as const };
  return null;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
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

  return (
    <div className="space-y-10">
      <MarketplaceHero
        familyCount={totalFamilies || familyCount || 55}
        categoryCount={industryCategoryCount}
        workflowCount={WORKFLOW_FAMILY_IDS.length}
      />

      {/* Catalogue controls */}
      <section id="catalogue" className="scroll-mt-24 space-y-5">
        <div className="flex items-start gap-2.5 text-sm text-[var(--muted)]">
          <span className="pulse-dot mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
          <p>
            Every agent here is live on the production runtime — rent one and it answers today.{" "}
            <span className="text-[var(--text)]">
              Workflow agents propose a plan, wait for your confirm, then run tools.
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative max-w-xl flex-1">
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
              placeholder="Search agents — try 'booking', 'claims', 'stock'…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search agent families"
            />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Market pack">
            {MARKETS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMarket(m.id)}
                className={`chip ${market === m.id ? "filter-active" : ""}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Audience">
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
            title="Multi-step agents: goal → plan → confirm → execute"
          >
            Workflows
            <span className="cat-count">{WORKFLOW_FAMILY_IDS.length}</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
          {categories.map((c) => {
            const count = c === "all" ? totalFamilies || familyCount : categoryCounts[c] ?? 0;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`chip ${category === c ? "filter-active" : ""}`}
              >
                {c === "all" ? "All agents" : c}
                <span className="cat-count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, idx) => {
            const hrefMarket = market !== "all" && item.markets[market] ? market : null;
            const href =
              hrefMarket && item.markets[hrefMarket]
                ? `/agents/${item.markets[hrefMarket]}`
                : `/agents/${item.defaultAgentId}`;
            const available = PACK_ORDER.filter((m) => item.markets[m]);
            const badge = statusBadge(item);
            const hasWorkflow = isWorkflowFamilyId(item.id);

            return (
              <Link
                key={item.id}
                href={href}
                className="panel panel-interactive group rise flex flex-col p-0"
                style={{ animationDelay: `${Math.min(idx, 15) * 28}ms` }}
              >
                <div className="cat-rail" style={{ background: categoryAccent(item.marketplaceCategory) }} />
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-4 flex items-start gap-3">
                    <span
                      aria-hidden
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_8%,var(--bg-elev))] text-sm font-semibold text-[var(--accent-bright)]"
                    >
                      {initials(item.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="display text-[0.98rem] font-semibold leading-snug tracking-tight text-[var(--text)] transition group-hover:text-[var(--accent-bright)]">
                          {item.name}
                        </h3>
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-dim)]">
                          {item.tier}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">
                        {item.marketplaceCategory}
                      </p>
                    </div>
                  </div>

                  <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-[var(--muted)]">
                    {item.summary}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    {hasWorkflow ? (
                      <span
                        className="chip chip-live"
                        title="Goal → plan → confirm → execute → verify"
                      >
                        Workflow
                      </span>
                    ) : null}
                    <span
                      className={`chip ${
                        item.audience === "internal" ? "chip-internal" : "chip-live"
                      }`}
                      title={
                        item.audience === "internal"
                          ? "Built for employees / internal ops"
                          : "Built for end customers / guests / clients"
                      }
                    >
                      {item.audience === "internal" ? "Internal" : "Customer-facing"}
                    </span>
                    {badge ? (
                      <span className={`chip ${badge.tone === "live" ? "chip-live" : ""}`}>
                        {badge.tone === "live" ? (
                          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                        ) : null}
                        {badge.label}
                      </span>
                    ) : null}
                    {item.channels.slice(0, 3).map((c) => (
                      <span key={c} className="chip normal-case tracking-normal">
                        {c}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 border-t border-[var(--line)] pt-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-dim)]">
                      Market packs
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {PACK_ORDER.map((m) => {
                        const on = available.includes(m);
                        const selected =
                          on &&
                          (hrefMarket === m ||
                            (!hrefMarket && item.defaultAgentId === item.markets[m]));
                        return (
                          <span
                            key={m}
                            className={`inline-flex min-w-[3.25rem] items-center justify-center rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                              on
                                ? selected
                                  ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent-bright)] ring-1 ring-[color-mix(in_srgb,var(--accent)_45%,transparent)]"
                                  : "bg-[var(--bg-elev)] text-[var(--text)] ring-1 ring-[var(--line-strong)]"
                                : "text-[var(--muted-dim)] ring-1 ring-[var(--line)] opacity-40"
                            }`}
                          >
                            {packLabel(m)}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between text-sm font-semibold text-[var(--accent-bright)]">
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
            <p className="display text-xl font-semibold">No families match</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Clear search or switch market / category to see the full catalogue.
            </p>
            <button
              type="button"
              className="btn btn-ghost mt-5"
              onClick={() => {
                setQ("");
                setMarket("all");
                setCategory("all");
                setAudience("all");
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
