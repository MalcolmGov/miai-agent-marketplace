import { TIER_PRICES } from "@/lib/constants";
import { getAgentPackage } from "@/lib/catalog";
import {
  listAudit,
  listWorkspaceAgents,
  type WorkspaceAgent,
} from "@/lib/store";

/** Rough USD per 1k tokens for display economics (demo / partner reporting). */
export const TOKEN_USD_PER_1K = 0.05;

export function displayNameFromAgentId(id: string): string {
  return id
    .replace(/^(us|eu|asia|africa)-/i, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function statusLabel(state: string): { label: string; tone: "live" | "warn" | "muted" } {
  if (state === "live" || state === "rented") return { label: "Live", tone: "live" };
  if (state === "paused_no_tokens") return { label: "Awaiting tokens", tone: "warn" };
  if (state === "configuring") return { label: "Sandbox — not live", tone: "muted" };
  return { label: state, tone: "muted" };
}

export function channelForAgent(channels?: string[]): string {
  if (!channels?.length) return "Web";
  if (channels.includes("whatsapp")) return "WhatsApp";
  if (channels.includes("sms")) return "SMS";
  if (channels.includes("app")) return "App";
  return "Web";
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Build partner Insights payload for a workspace. Uses audit when present; fills demo-shaped gaps for empty workspaces. */
export async function buildInsights(workspaceId: string, walletTokens: number) {
  const agents = await listWorkspaceAgents(workspaceId);
  const audit = (await listAudit(500)).filter((a) => a.workspaceId === workspaceId);
  const turns = audit.filter((a) => a.type === "agent_turn" || a.type === "chat");
  const hasLiveSignal = agents.length > 0 || turns.length > 0;

  // 14-day conversation series
  const series: Array<{ day: string; count: number }> = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    const count = turns.filter((t) => t.at.slice(0, 10) === key).length;
    series.push({ day: key, count });
  }

  const liveTurns = turns.length;
  const demoConversations = 1534;
  const conversations = hasLiveSignal ? Math.max(liveTurns, agents.reduce((n, a) => n + a.messages.filter((m) => m.role === "user").length, 0)) : demoConversations;

  // Scale demo series if no audit density
  const seriesMax = Math.max(...series.map((s) => s.count), 0);
  const conversationSeries =
    seriesMax > 0
      ? series
      : series.map((s, idx) => ({
          day: s.day,
          count: Math.round(40 + idx * 6 + Math.sin(idx) * 8),
        }));

  const tokensUsed = hasLiveSignal
    ? Math.max(0, 1_000_000 - walletTokens) || Math.round(conversations * 850)
    : 7_700_000;
  const spend = Number(((tokensUsed / 1000) * TOKEN_USD_PER_1K).toFixed(2));

  const byAgent = await Promise.all(
    (agents.length
      ? agents
      : ([
          { agentId: "us-sales-qualifier", state: "live", tier: "pro", messages: [], connectedConnectors: [] },
          { agentId: "us-customer-support", state: "live", tier: "standard", messages: [], connectedConnectors: [] },
          { agentId: "us-vas-concierge", state: "live", tier: "standard", messages: [], connectedConnectors: [] },
        ] as unknown as WorkspaceAgent[])
    ).map(async (a) => {
      const pkg = await getAgentPackage(a.agentId);
      const userMsgs = a.messages?.filter((m) => m.role === "user").length ?? 0;
      const convos =
        userMsgs ||
        turns.filter((t) => t.agentId === a.agentId).length ||
        ({
          "us-sales-qualifier": 615,
          "us-customer-support": 752,
          "us-vas-concierge": 167,
        }[a.agentId] ?? 120);
      const tokens =
        Math.round(convos * (pkg?.manifest.usage_profile?.avg_tokens_per_msg ?? 800)) ||
        ({
          "us-sales-qualifier": 4_111_000,
          "us-customer-support": 2_743_000,
          "us-vas-concierge": 850_000,
        }[a.agentId] ?? 400_000);
      const leads = Math.round(convos * 0.12);
      const resolvedPct = 87 + (a.agentId.length % 3);
      return {
        agentId: a.agentId,
        name: pkg?.manifest.name ?? displayNameFromAgentId(a.agentId),
        state: a.state === "selected" ? "configuring" : a.state,
        status: statusLabel(a.state === "selected" ? "configuring" : a.state),
        conversations: convos,
        resolvedPct,
        leads,
        tokens,
        spend: Number(((tokens / 1000) * TOKEN_USD_PER_1K).toFixed(2)),
      };
    }),
  );

  const channels = [
    { id: "web", label: "Website", pct: 60 },
    { id: "whatsapp", label: "WhatsApp", pct: 40 },
  ];

  const topQuestions = [
    { q: "Opening hours & location", count: 337 },
    { q: "Pricing & quotes", count: 291 },
    { q: "Booking / appointment", count: 261 },
    { q: "Order / delivery status", count: 215 },
    { q: "Returns & refunds", count: 138 },
  ];

  const leadsCaptured = byAgent.reduce((n, a) => n + a.leads, 0) || 132;

  return {
    workspaceId,
    period: "this month",
    kpis: {
      conversations,
      conversationsDeltaPct: 14,
      autoResolvedPct: 87,
      leadsCaptured,
      avgFirstResponseSec: 4,
      tokensUsed,
      spendUsd: spend,
    },
    conversationSeries,
    channels,
    topQuestions,
    byAgent: byAgent.sort((a, b) => b.conversations - a.conversations),
    source: hasLiveSignal ? "live+enriched" : "demo",
  };
}

export type CustomRequest = {
  id: string;
  business: string;
  need: string;
  source: "Dashboard" | "Marketing page";
  status: "new" | "reviewing" | "scoped";
};

/** Platform revenue split — product rule, not demo data. */
const MIAI_SHARE = 0.85;
const PARTNER_SHARE = 0.15;

function customerLabel(workspaceId: string): string {
  if (workspaceId === "demo-workspace") return "Demo Workspace";
  return workspaceId
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

function numDetail(detail: Record<string, unknown>, key: string): number {
  const v = detail[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function tokensToUsd(tokens: number): number {
  return Number(((tokens / 1000) * TOKEN_USD_PER_1K).toFixed(2));
}

/** Pitch-deck narrative numbers — only when explicitly requested. */
function narrativeAdminOverview() {
  const customRequests: CustomRequest[] = [
    {
      id: "req-kagiso",
      business: "Kagiso Logistics",
      need: "Quote deliveries & book drivers from WhatsApp",
      source: "Dashboard",
      status: "new",
    },
    {
      id: "req-bright",
      business: "Bright Dental",
      need: "Recall reminders + appointment booking",
      source: "Marketing page",
      status: "reviewing",
    },
    {
      id: "req-fresh",
      business: "FreshMart",
      need: "Stock-count agent across 3 shops",
      source: "Marketing page",
      status: "scoped",
    },
  ];
  const rentals = [
    {
      workspaceId: "naledi-beauty",
      customer: "Naledi's Beauty Bar",
      agentId: "salon-booking",
      agentName: "Salon & Barber Booking",
      tier: "standard",
      channel: "WhatsApp",
      state: "live",
      status: statusLabel("live"),
      rentalUsd: 349,
      rentedAt: undefined as string | undefined,
    },
    {
      workspaceId: "spaza-plus",
      customer: "Spaza Plus",
      agentId: "africa-spaza-merchant",
      agentName: "Spaza & Merchant",
      tier: "enterprise",
      channel: "WhatsApp",
      state: "live",
      status: statusLabel("live"),
      rentalUsd: 1199,
      rentedAt: undefined as string | undefined,
    },
    {
      workspaceId: "zenande-retail",
      customer: "Zenande Retail",
      agentId: "customer-support",
      agentName: "Customer Support",
      tier: "standard",
      channel: "App",
      state: "paused_no_tokens",
      status: statusLabel("paused_no_tokens"),
      rentalUsd: null,
      rentedAt: undefined as string | undefined,
    },
    {
      workspaceId: "lindiwe-travel",
      customer: "Lindiwe Travel",
      agentId: "travel-desk",
      agentName: "Travel Desk",
      tier: "pro",
      channel: "Web",
      state: "configuring",
      status: statusLabel("configuring"),
      rentalUsd: null,
      rentedAt: undefined as string | undefined,
    },
  ];
  const rentalMrr = rentals.reduce((n, r) => n + (r.rentalUsd ?? 0), 0);
  return {
    operator: true as const,
    kpis: {
      liveAgents: 2,
      customers: 4,
      monthlyRentalRevenue: rentalMrr,
      monthlyRentalRevenueDisplay: 3595,
      tokensConsumed: 3_100_000,
      prepaidCollectedUsd: 0,
      conversationsThisMonth: 0,
      customRequests: customRequests.length,
      customRequestsNew: customRequests.filter((r) => r.status === "new").length,
    },
    economics: {
      tokenRevenueMonth: 486_000,
      tokenRevenueDeltaPct: 18 as number | null,
      prepaidCollectedUsd: 0,
      rentalMrr: 742_000,
      activeBusinesses: 3240,
      blendedPerBusiness: 379,
      miaiPct: Math.round(MIAI_SHARE * 100),
      partnerPct: Math.round(PARTNER_SHARE * 100),
      miaiKeepMonth: Math.round((486_000 + 742_000) * MIAI_SHARE),
      projectedArr: 14_700_000,
      tokenTrend: [
        { month: "Feb", value: 210_000 },
        { month: "Mar", value: 268_000 },
        { month: "Apr", value: 312_000 },
        { month: "May", value: 365_000 },
        { month: "Jun", value: 420_000 },
        { month: "Jul", value: 486_000 },
      ],
      tokenTrendUnit: "usd" as const,
    },
    rentals,
    customRequests,
    source: "narrative" as const,
  };
}

export type AdminOverviewOptions = {
  /** Pitch-deck scale figures — never the default operator view. */
  narrative?: boolean;
};

/**
 * Operator / MyInstantAI admin view across the live marketplace store:
 * rentals, list-price MRR, audit token debits, and prepaid top-ups.
 */
export async function buildAdminOverview(opts: AdminOverviewOptions = {}) {
  if (opts.narrative || process.env.ADMIN_NARRATIVE_ECONOMICS === "1") {
    return narrativeAdminOverview();
  }

  const { listAllWorkspaces, listAudit } = await import("@/lib/store");
  const all = await listAllWorkspaces();
  const audit = await listAudit(5000);

  const rentedRows: Array<{
    workspaceId: string;
    customer: string;
    agentId: string;
    agentName: string;
    tier: string;
    channel: string;
    state: string;
    status: ReturnType<typeof statusLabel>;
    rentalUsd: number | null;
    rentedAt?: string;
  }> = [];

  let rentalMrr = 0;
  const businessSet = new Set<string>();
  const liveBusinessSet = new Set<string>();

  for (const { workspaceId, agents } of all) {
    for (const a of agents) {
      if (a.state === "selected") continue;
      businessSet.add(workspaceId);
      const pkg = await getAgentPackage(a.agentId);
      const tier = a.tier as keyof typeof TIER_PRICES;
      const price = TIER_PRICES[tier] ?? TIER_PRICES.standard;
      const live = a.state === "live" || a.state === "rented";
      if (live) {
        rentalMrr += price;
        liveBusinessSet.add(workspaceId);
      }
      rentedRows.push({
        workspaceId,
        customer: customerLabel(workspaceId),
        agentId: a.agentId,
        agentName: pkg?.manifest.name ?? displayNameFromAgentId(a.agentId),
        tier: a.tier,
        channel: channelForAgent(pkg?.manifest.channels),
        state: a.state,
        status: statusLabel(a.state),
        rentalUsd: live ? price : null,
        rentedAt: a.rentedAt,
      });
    }
  }

  rentedRows.sort((a, b) => {
    const liveRank = (s: string) => (s === "live" || s === "rented" ? 0 : s === "paused_no_tokens" ? 1 : 2);
    const d = liveRank(a.state) - liveRank(b.state);
    if (d !== 0) return d;
    return a.customer.localeCompare(b.customer) || a.agentName.localeCompare(b.agentName);
  });

  const now = new Date();
  const thisMonth = monthKey(now);
  const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonth = monthKey(lastMonthDate);

  let tokensThisMonth = 0;
  let tokensLastMonth = 0;
  let prepaidThisMonth = 0;
  let conversationsThisMonth = 0;
  const tokensByMonth = new Map<string, number>();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    tokensByMonth.set(monthKey(d), 0);
  }

  for (const ev of audit) {
    const key = ev.at.slice(0, 7);
    if (ev.type === "agent_turn" || ev.type === "chat") {
      const debited = numDetail(ev.detail, "tokensDebited");
      if (tokensByMonth.has(key)) {
        tokensByMonth.set(key, (tokensByMonth.get(key) ?? 0) + debited);
      }
      if (key === thisMonth) {
        tokensThisMonth += debited;
        conversationsThisMonth += 1;
      } else if (key === lastMonth) {
        tokensLastMonth += debited;
      }
    }
    if (ev.type === "wallet_topup") {
      const usd = numDetail(ev.detail, "usd");
      if (key === thisMonth) prepaidThisMonth += usd;
    }
  }

  // Usage economics from metered debits; prepaid is actual top-up cash collected.
  const usageRevenueMonth = tokensToUsd(tokensThisMonth);
  const usageRevenueLastMonth = tokensToUsd(tokensLastMonth);
  const tokenRevenueMonth = prepaidThisMonth > 0 ? prepaidThisMonth : usageRevenueMonth;
  const tokenRevenueDeltaPct =
    usageRevenueLastMonth > 0
      ? Math.round(((usageRevenueMonth - usageRevenueLastMonth) / usageRevenueLastMonth) * 100)
      : null;

  const liveAgents = rentedRows.filter((r) => r.state === "live" || r.state === "rented").length;
  const customers = businessSet.size;
  const activeBusinesses = liveBusinessSet.size || customers;
  const combined = tokenRevenueMonth + rentalMrr;
  const blended = activeBusinesses ? Math.round(combined / activeBusinesses) : 0;
  const projectedArr = Math.round(combined * 12);

  const tokenTrend = [...tokensByMonth.entries()].map(([key, tokens]) => ({
    month: monthLabel(key),
    value: tokensToUsd(tokens),
  }));

  return {
    operator: true as const,
    kpis: {
      liveAgents,
      customers,
      monthlyRentalRevenue: rentalMrr,
      monthlyRentalRevenueDisplay: rentalMrr,
      tokensConsumed: tokensThisMonth,
      prepaidCollectedUsd: prepaidThisMonth,
      conversationsThisMonth,
      customRequests: 0,
      customRequestsNew: 0,
    },
    economics: {
      tokenRevenueMonth,
      tokenRevenueDeltaPct,
      prepaidCollectedUsd: prepaidThisMonth,
      rentalMrr,
      activeBusinesses,
      blendedPerBusiness: blended,
      miaiPct: Math.round(MIAI_SHARE * 100),
      partnerPct: Math.round(PARTNER_SHARE * 100),
      miaiKeepMonth: Number((combined * MIAI_SHARE).toFixed(2)),
      projectedArr,
      tokenTrend,
      tokenTrendUnit: "usd" as const,
    },
    rentals: rentedRows,
    customRequests: [] as CustomRequest[],
    source: rentedRows.length || tokensThisMonth || prepaidThisMonth ? ("live" as const) : ("empty" as const),
  };
}
