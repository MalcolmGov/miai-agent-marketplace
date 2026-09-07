"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { rentalStatusLabel } from "@/components/SetupGuide";
import { InsightsDashboard } from "@/components/dashboard/InsightsDashboard";
import { ConfigureAgentModal } from "@/components/agents/ConfigureAgentModal";

interface MissingConnector {
  connector: string;
  name: string;
  tools: string[];
}

interface RentalItem {
  agentId: string;
  name: string;
  summary: string;
  state: string;
  tier: string;
  market: string | null;
  connectedConnectors: string[];
  rentedAt: string | null;
  publicKey?: string;
  isCustom?: boolean;
  accentColor?: string;
  readiness?: { ready: boolean; missing: MissingConnector[] };
}

type TabMode = "all" | "active" | "inactive" | "insights";

const MARKET_LABELS: Record<string, { label: string; flag: string }> = {
  us: { label: "United States", flag: "🇺🇸" },
  eu: { label: "European Union", flag: "🇪🇺" },
  africa: { label: "Africa", flag: "🌍" },
  asia: { label: "Asia", flag: "🌏" },
  oceania: { label: "Oceania", flag: "🇦🇺" },
};

const CONNECTOR_DISPLAY: Record<string, string> = {
  google_calendar: "Google Calendar",
  email: "Email Dispatch",
  calendly: "Calendly",
  stripe: "Stripe Billing",
  telegram: "Telegram",
  slack: "Slack",
  whatsapp: "WhatsApp",
  paystack: "Paystack",
  hubspot: "HubSpot",
  salesforce: "Salesforce",
  zendesk: "Zendesk",
  jira: "Jira",
  shopify: "Shopify",
};

function isAgentActive(item: RentalItem): boolean {
  if (item.state === "configuring" || item.state === "draft" || item.state === "paused") {
    return false;
  }
  if (item.readiness && item.readiness.ready === false) {
    return false;
  }
  return item.state === "live" || item.state === "rented" || item.state === "ready";
}

function IconBot({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <rect x="4" y="6" width="16" height="12" rx="3" />
      <circle cx="9" cy="11.5" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="15" cy="11.5" r="1.25" fill="currentColor" stroke="none" />
      <path d="M12 2v4M8 15h8M2 12h2M20 12h2" strokeLinecap="round" />
    </svg>
  );
}

function IconChart({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <path d="M4 19h16M7 16V9M12 16V5M17 16v-4" strokeLinecap="round" />
    </svg>
  );
}

function IconSparkles({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <path
        d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconWrench({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPlug({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <path d="M9 3v4M15 3v4M7 7h10v5a5 5 0 0 1-5 5v4M10 21h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSearch({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-3.2-3.2" strokeLinecap="round" />
    </svg>
  );
}

function IconPlus({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function IconArrowRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconAlert({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <path
        d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
        strokeLinejoin="round"
      />
      <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
    </svg>
  );
}

function MyAgentsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");

  const [items, setItems] = useState<RentalItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabMode>(() =>
    initialTab === "insights" ? "insights" : initialTab === "active" ? "active" : initialTab === "inactive" ? "inactive" : "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [marketFilter, setMarketFilter] = useState<string>("all");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "insights") setActiveTab("insights");
    else if (tab === "active") setActiveTab("active");
    else if (tab === "inactive") setActiveTab("inactive");
    else if (tab === "all") setActiveTab("all");
  }, [searchParams]);

  const [isConfigureOpen, setIsConfigureOpen] = useState(false);

  const fetchRentals = () => {
    fetch("/api/rentals")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load rentals");
        setItems(data.items ?? []);
      })
      .catch((e: Error) => setError(e.message));
  };

  useEffect(() => {
    fetchRentals();
  }, []);

  function handleTabChange(next: TabMode) {
    setActiveTab(next);
    const url = next === "all" ? "/my-agents" : `/my-agents?tab=${next}`;
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", url);
    }
  }

  const { activeList, inactiveList, totalConnectors } = useMemo(() => {
    if (!items) return { activeList: [], inactiveList: [], totalConnectors: 0 };
    const active: RentalItem[] = [];
    const inactive: RentalItem[] = [];
    const connectorSet = new Set<string>();

    for (const item of items) {
      if (isAgentActive(item)) {
        active.push(item);
      } else {
        inactive.push(item);
      }
      for (const c of item.connectedConnectors ?? []) {
        connectorSet.add(c);
      }
    }

    return {
      activeList: active,
      inactiveList: inactive,
      totalConnectors: connectorSet.size,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    let list = items;
    if (activeTab === "active") list = activeList;
    if (activeTab === "inactive") list = inactiveList;

    if (marketFilter !== "all") {
      list = list.filter((item) => (item.market?.toLowerCase() ?? "") === marketFilter.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.agentId.toLowerCase().includes(q) ||
          item.connectedConnectors.some((c) => c.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [items, activeTab, activeList, inactiveList, marketFilter, searchQuery]);

  const displayedActive = useMemo(
    () => filteredItems.filter((i) => isAgentActive(i)),
    [filteredItems],
  );

  const displayedInactive = useMemo(
    () => filteredItems.filter((i) => !isAgentActive(i)),
    [filteredItems],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="display text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
              My Agents
            </h1>
            {items !== null ? (
              <span className="chip chip-live !py-0.5 !text-[10px] font-semibold">
                {items.length} {items.length === 1 ? "Agent" : "Agents"} Rented
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            Workspace autonomous workforce — manage configurations, monitor live channels, or resume draft setups.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setIsConfigureOpen(true)}
            className="btn btn-primary inline-flex items-center gap-1.5 text-xs shadow-[0_0_16px_color-mix(in_srgb,var(--accent)_30%,transparent)] cursor-pointer"
          >
            <IconPlus className="h-3.5 w-3.5" />
            <span>Configure New Agent</span>
          </button>
          <Link
            href="/#catalogue"
            className="btn btn-ghost inline-flex items-center gap-1.5 text-xs"
          >
            <span>Browse Catalogue</span>
          </Link>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-[var(--danger)]/40 bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] p-3 text-sm text-[var(--danger)]">
          <IconAlert className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* KPI Stats Overview */}
      {items !== null && items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="panel relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] p-4 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)]">
            <div className="card-specular-rim" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-dim)]">
                Active &amp; Ready
              </span>
              <span className="pulse-dot h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-white tabular-nums">
              {activeList.length}
            </p>
            <p className="mt-1 text-[11px] text-[var(--accent-bright)] font-medium">
              Serving live channels
            </p>
          </div>

          <div className="panel relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,#f59e0b_35%,var(--line))] p-4 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)]">
            <div className="card-specular-rim" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-dim)]">
                In Draft / Setup
              </span>
              <IconWrench className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-amber-200 tabular-nums">
              {inactiveList.length}
            </p>
            <p className="mt-1 text-[11px] text-amber-400/90 font-medium">
              Awaiting credentials
            </p>
          </div>

          <div className="panel relative overflow-hidden rounded-2xl border border-[var(--line)] p-4 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)]">
            <div className="card-specular-rim" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-dim)]">
                Total Fleet
              </span>
              <IconBot className="h-4 w-4 text-[var(--muted)]" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--text)] tabular-nums">
              {items.length}
            </p>
            <p className="mt-1 text-[11px] text-[var(--muted-dim)] font-medium">
              Rented agent units
            </p>
          </div>

          <div className="panel relative overflow-hidden rounded-2xl border border-[var(--line)] p-4 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)]">
            <div className="card-specular-rim" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-dim)]">
                Connected Tools
              </span>
              <IconPlug className="h-4 w-4 text-[var(--accent-bright)]" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--text)] tabular-nums">
              {totalConnectors}
            </p>
            <p className="mt-1 text-[11px] text-[var(--muted-dim)] font-medium">
              Actions &amp; payment rails
            </p>
          </div>
        </div>
      ) : null}

      {/* Filter and Segmentation Controls */}
      {items !== null && items.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-panel)_75%,transparent)] p-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Main Navigation Tabs */}
          <div className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-[color-mix(in_srgb,var(--bg-elev)_85%,transparent)] p-1 border border-[var(--line)]" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "all"}
              onClick={() => handleTabChange("all")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "all"
                  ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm"
                  : "text-[var(--muted)] hover:text-white"
              }`}
            >
              <span>All Agents</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === "all" ? "bg-black/20 text-inherit" : "bg-white/10 text-[var(--muted-dim)]"}`}>
                {items.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "active"}
              onClick={() => handleTabChange("active")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "active"
                  ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm"
                  : "text-[var(--muted)] hover:text-white"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${activeTab === "active" ? "bg-[var(--accent-ink)]" : "bg-[var(--accent)] shadow-[0_0_6px_var(--accent)]"}`} />
              <span>Active</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === "active" ? "bg-black/20 text-inherit" : "bg-white/10 text-[var(--muted-dim)]"}`}>
                {activeList.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "inactive"}
              onClick={() => handleTabChange("inactive")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "inactive"
                  ? "bg-amber-400 text-slate-950 shadow-sm"
                  : "text-[var(--muted)] hover:text-white"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${activeTab === "inactive" ? "bg-slate-950" : "bg-amber-400"}`} />
              <span>Inactive / Draft</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === "inactive" ? "bg-black/20 text-inherit" : "bg-white/10 text-[var(--muted-dim)]"}`}>
                {inactiveList.length}
              </span>
            </button>

            {/* Merged Insights & Analytics Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "insights"}
              onClick={() => handleTabChange("insights")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "insights"
                  ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm"
                  : "text-[var(--muted)] hover:text-white"
              }`}
            >
              <IconChart className="h-3.5 w-3.5" />
              <span>Insights &amp; Analytics</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${activeTab === "insights" ? "bg-black/20 text-inherit" : "bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] text-[var(--accent-bright)]"}`}>
                LIVE
              </span>
            </button>
          </div>

          {/* Search & Market Filter (visible when browsing agent lists) */}
          {activeTab !== "insights" ? (
            <div className="flex flex-1 items-center gap-2 sm:max-w-md">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-dim)]">
                  <IconSearch className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search agent name, ID, or tool..."
                  className="input !py-1.5 !pl-9 !text-xs"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-dim)] hover:text-white"
                  >
                    ✕
                  </button>
                ) : null}
              </div>

              <select
                value={marketFilter}
                onChange={(e) => setMarketFilter(e.target.value)}
                className="input !w-auto shrink-0 !py-1.5 !text-xs"
              >
                <option value="all">All Regions</option>
                <option value="us">🇺🇸 US</option>
                <option value="eu">🇪🇺 EU</option>
                <option value="africa">🌍 Africa</option>
                <option value="asia">🌏 Asia</option>
                <option value="oceania">🇦🇺 Oceania</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--muted-dim)]">
                Autonomous performance &amp; usage telemetry
              </span>
            </div>
          )}
        </div>
      ) : null}

      {/* Main Tab Content */}
      {activeTab === "insights" ? (
        /* Embedded Polished Insights Dashboard */
        <InsightsDashboard
          showHeader={false}
          onNavigateToFleet={() => handleTabChange("all")}
        />
      ) : items === null ? (
        /* Loading Skeleton */
        <div className="space-y-3" aria-busy="true" aria-label="Loading rented agents">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel flex items-center justify-between gap-4 rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="skeleton h-12 w-12 rounded-xl" />
                <div className="space-y-2">
                  <div className="skeleton h-4 w-44" />
                  <div className="skeleton h-3 w-80" />
                </div>
              </div>
              <div className="skeleton h-9 w-28 rounded-xl" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        /* Empty State — No Rented Agents */
        <div className="panel relative overflow-hidden rounded-3xl border border-[var(--line-strong)] bg-gradient-to-b from-[color-mix(in_srgb,var(--bg-panel)_90%,transparent)] to-[var(--bg-elev)] p-8 text-center sm:p-12">
          <div className="card-specular-rim" />
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--accent)_40%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent-bright)] shadow-[0_0_24px_color-mix(in_srgb,var(--accent)_25%,transparent)]">
            <IconBot className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-white sm:text-2xl">
            No Rented Agents Yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)] leading-relaxed">
            Your workspace has no active or draft agents. Explore our verified global catalogue of over 500 bespoke regional agents ready for deployment.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/#catalogue" className="btn btn-primary inline-flex items-center gap-2">
              <IconSparkles className="h-4 w-4" />
              <span>Browse 500+ Verified Agents</span>
            </Link>
            <Link href="/ask" className="btn btn-ghost inline-flex items-center gap-2">
              <span>Ask AI Consultant</span>
            </Link>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        /* Empty State — Filter Produced No Results */
        <div className="panel rounded-2xl border border-[var(--line)] p-8 text-center">
          <p className="text-sm font-medium text-white">No agents match your current filter</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Try adjusting your search keyword or switching between Active, Inactive, and All tabs.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setMarketFilter("all");
              setActiveTab("all");
            }}
            className="btn btn-ghost mt-4 inline-flex text-xs"
          >
            Reset Filters
          </button>
        </div>
      ) : activeTab === "all" ? (
        /* Split View: Grouped by Active vs Inactive */
        <div className="space-y-8">
          {/* Active Agents Section */}
          {displayedActive.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="pulse-dot h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
                  <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-white">
                    Active &amp; Ready ({displayedActive.length})
                  </h2>
                </div>
                <span className="text-xs text-[var(--muted-dim)]">
                  Live &amp; serving customer interactions
                </span>
              </div>
              <div className="grid gap-3.5">
                {displayedActive.map((item) => (
                  <AgentCard key={item.agentId} item={item} active={true} />
                ))}
              </div>
            </div>
          ) : null}

          {/* Inactive & Draft Agents Section */}
          {displayedInactive.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-amber-200">
                    Draft &amp; Setup In Progress ({displayedInactive.length})
                  </h2>
                </div>
                <span className="text-xs text-[var(--muted-dim)]">
                  Complete setup to activate live channels
                </span>
              </div>
              <div className="grid gap-3.5">
                {displayedInactive.map((item) => (
                  <AgentCard key={item.agentId} item={item} active={false} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        /* Single Tab View: Active OR Inactive Only */
        <div className="grid gap-3.5">
          {filteredItems.map((item) => (
            <AgentCard key={item.agentId} item={item} active={isAgentActive(item)} />
          ))}
        </div>
      )}

      <ConfigureAgentModal
        isOpen={isConfigureOpen}
        onClose={() => setIsConfigureOpen(false)}
        onCreated={() => {
          fetchRentals();
        }}
      />
    </div>
  );
}

function AgentCard({ item, active }: { item: RentalItem; active: boolean }) {
  const market = item.market?.toLowerCase() ?? "";
  const marketMeta = MARKET_LABELS[market] ?? {
    label: item.market?.toUpperCase() ?? "GLOBAL",
    flag: "🌐",
  };

  const needsSetup = Boolean(item.readiness && !item.readiness.ready);

  return (
    <div
      className={`panel panel-interactive group relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 ${
        active
          ? "border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] hover:border-[var(--accent)] hover:shadow-[0_0_24px_-4px_color-mix(in_srgb,var(--accent)_22%,transparent)]"
          : "border-[color-mix(in_srgb,#f59e0b_28%,var(--line))] hover:border-amber-400/60 hover:shadow-[0_0_24px_-4px_rgba(245,158,11,0.18)]"
      }`}
    >
      <div className="card-specular-rim" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: Avatar + Details */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          {/* Avatar Icon Badge */}
          <div className="relative shrink-0 pt-0.5">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-105 ${
                active
                  ? "border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-gradient-to-br from-[color-mix(in_srgb,var(--accent)_22%,var(--bg-elev))] to-[color-mix(in_srgb,var(--accent)_6%,var(--bg-panel))] text-[var(--accent-bright)] shadow-[0_0_16px_-2px_color-mix(in_srgb,var(--accent)_30%,transparent)]"
                  : "border-amber-500/30 bg-gradient-to-br from-amber-500/18 to-slate-900/60 text-amber-300 shadow-[0_0_12px_-2px_rgba(245,158,11,0.25)]"
              }`}
            >
              <IconBot className="h-6 w-6" />
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--bg-panel)] ${
                active
                  ? "bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]"
                  : "bg-amber-400 shadow-[0_0_6px_#f59e0b]"
              }`}
            />
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/agents/${item.agentId}`}
                className="text-base font-bold text-white tracking-tight hover:text-[var(--accent-bright)] transition-colors"
              >
                {item.name}
              </Link>

              {/* Status Chip */}
              {active ? (
                <span className="chip chip-live !py-0.5 !text-[10px] font-semibold">
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  ACTIVE
                </span>
              ) : (
                <span className="rounded-md bg-amber-500/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-500/30">
                  {rentalStatusLabel(item.state)}
                </span>
              )}

              {/* Tier Chip */}
              <span className="chip !py-0.5 !text-[10px] font-medium">
                {item.tier.toUpperCase()}
              </span>

              {/* Region Pill */}
              <span
                className="chip !py-0.5 !text-[10px] font-medium"
                title={marketMeta.label}
              >
                <span className="mr-0.5">{marketMeta.flag}</span>
                {item.market ? item.market.toUpperCase() : "GLOBAL"}
              </span>

              {needsSetup ? (
                <span className="rounded-md bg-amber-500/18 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/35">
                  Needs setup
                </span>
              ) : null}

              {item.isCustom ? (
                <span className="rounded-md bg-indigo-500/18 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300 border border-indigo-500/35">
                  Custom Agent
                </span>
              ) : null}
            </div>

            <p className="mt-1.5 text-xs text-[var(--card-body)] leading-relaxed line-clamp-2">
              {item.summary}
            </p>

            {/* Warning: Missing Connectors */}
            {needsSetup && item.readiness ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 text-xs text-amber-300">
                <IconAlert className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span className="font-semibold">Connect to go live:</span>
                <span className="text-amber-200/90 font-medium">
                  {item.readiness.missing.map((m) => m.name).join(", ")}
                </span>
              </div>
            ) : null}

            {/* Connected Tools Strip */}
            {item.connectedConnectors && item.connectedConnectors.length > 0 ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-dim)] mr-1">
                  Connected Tools:
                </span>
                {item.connectedConnectors.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--bg-elev)_90%,transparent)] border border-[var(--line)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]"
                  >
                    <IconPlug className="h-2.5 w-2.5 text-[var(--accent-bright)]" />
                    <span>{CONNECTOR_DISPLAY[c] ?? c}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex shrink-0 items-center gap-2 sm:self-center">
          <Link
            href={`/agents/${item.agentId}`}
            className={`btn inline-flex items-center gap-1.5 text-xs px-3.5 py-2 font-semibold transition-all ${
              active
                ? "btn-primary shadow-[0_0_12px_color-mix(in_srgb,var(--accent)_25%,transparent)]"
                : "!bg-amber-400 hover:!bg-amber-300 !text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
            }`}
          >
            <span>{active ? "Open Studio" : "Resume Setup"}</span>
            <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MyAgentsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl space-y-6" aria-busy="true">
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-72" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="panel h-24 rounded-2xl" />
            ))}
          </div>
        </div>
      }
    >
      <MyAgentsContent />
    </Suspense>
  );
}
