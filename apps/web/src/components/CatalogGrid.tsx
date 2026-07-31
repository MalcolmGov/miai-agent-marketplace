"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

interface FamilyItem {
  id: string;
  name: string;
  tier: string;
  summary: string;
  channels: string[];
  marketplaceCategory: string;
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
];

const PACK_ORDER = ["us", "eu", "africa", "asia"] as const;

function packLabel(m: string) {
  if (m === "africa") return "Africa";
  if (m === "asia") return "Asia";
  return m.toUpperCase();
}

export function CatalogGrid() {
  const [items, setItems] = useState<FamilyItem[]>([]);
  const [familyCount, setFamilyCount] = useState(0);
  const [agentCount, setAgentCount] = useState(0);
  const [totalAgents, setTotalAgents] = useState(0);
  const [q, setQ] = useState("");
  const [market, setMarket] = useState("all");
  const [category, setCategory] = useState("all");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("view", "families");
    if (q) params.set("q", q);
    if (market !== "all") params.set("market", market);
    if (category !== "all") params.set("category", category);
    startTransition(() => {
      fetch(`/api/catalog?${params}`)
        .then((r) => r.json())
        .then((d) => {
          setItems(d.items ?? []);
          setFamilyCount(d.familyCount ?? d.count ?? 0);
          setAgentCount(d.agentCount ?? 0);
          setTotalAgents(d.totalAgents ?? 0);
        });
    });
  }, [q, market, category]);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.marketplaceCategory));
    return ["all", ...Array.from(set).sort()];
  }, [items]);

  const readyCount = items.filter((i) => i.catalogueReady).length;

  return (
    <div className="space-y-6">
      <div className="rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Agent Marketplace</h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
            Catalogue-ready agent families with US, EU, Africa, and Asia market packs. Rent by tier,
            configure model & knowledge, connect Actions, and go live on prepaid tokens.
          </p>
        </div>
        <div className="text-right text-sm text-[var(--muted)]">
          {pending ? (
            "Updating…"
          ) : (
            <>
              <div className="font-medium text-[var(--fg)]">
                {familyCount} families · {agentCount} agents
                {market === "all" && totalAgents !== agentCount ? "" : market !== "all" ? " in market" : ""}
              </div>
              <div className="mt-0.5">
                {totalAgents} agents catalogue-wide · {readyCount} families ready
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          className="input max-w-md"
          placeholder="Search agent families…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {MARKETS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMarket(m.id)}
              className={`chip ${market === m.id ? "chip-live" : ""}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.slice(0, 12).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`chip ${category === c ? "chip-live" : ""}`}
          >
            {c === "all" ? "All categories" : c}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, idx) => {
          const hrefMarket = market !== "all" && item.markets[market] ? market : null;
          const href =
            hrefMarket && item.markets[hrefMarket]
              ? `/agents/${item.markets[hrefMarket]}`
              : `/agents/${item.defaultAgentId}`;
          const available = PACK_ORDER.filter((m) => item.markets[m]);

          return (
            <Link
              key={item.id}
              href={href}
              className="panel group rise p-4 transition hover:border-[var(--accent-dim)]"
              style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <h2 className="text-base font-semibold group-hover:text-[var(--accent)]">
                  {item.name}
                </h2>
                <div className="flex flex-wrap justify-end gap-1">
                  {item.catalogueReady && <span className="chip chip-live">Catalogue ready</span>}
                  {item.pilot && <span className="chip chip-live">Pilot</span>}
                  {item.liveReady && <span className="chip chip-live">LIVE</span>}
                  <span className="chip">{item.tier}</span>
                </div>
              </div>
              <p className="line-clamp-3 text-sm text-[var(--muted)]">{item.summary}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {available.map((m) => (
                  <span
                    key={m}
                    className={`chip ${hrefMarket === m || (!hrefMarket && item.defaultAgentId === item.markets[m]) ? "chip-live" : ""}`}
                  >
                    {packLabel(m)}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-1">
                {item.channels.slice(0, 4).map((c) => (
                  <span key={c} className="chip">
                    {c}
                  </span>
                ))}
              </div>
              <div className="mt-4 text-sm text-[var(--accent)]">Rent / setup →</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
