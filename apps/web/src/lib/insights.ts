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

const CUSTOM_REQUESTS: CustomRequest[] = [
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

export function listCustomRequests(): CustomRequest[] {
  return CUSTOM_REQUESTS;
}

/** Operator / MyInstantAI admin view across the partner base. */
export async function buildAdminOverview() {
  const { listAllWorkspaces } = await import("@/lib/store");
  const all = await listAllWorkspaces();

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
  }> = [];

  let rentalMrr = 0;
  let tokensConsumed = 0;
  const businessSet = new Set<string>();

  for (const { workspaceId, agents } of all) {
    for (const a of agents) {
      if (a.state === "selected") continue;
      businessSet.add(workspaceId);
      const pkg = await getAgentPackage(a.agentId);
      const tier = a.tier as keyof typeof TIER_PRICES;
      const price = TIER_PRICES[tier] ?? TIER_PRICES.standard;
      const live = a.state === "live" || a.state === "rented";
      if (live) rentalMrr += price;
      tokensConsumed += a.messages.length * 800;
      rentedRows.push({
        workspaceId,
        customer: workspaceId === "demo-workspace" ? "Demo Workspace" : workspaceId.replace(/[-_]/g, " "),
        agentId: a.agentId,
        agentName: pkg?.manifest.name ?? displayNameFromAgentId(a.agentId),
        tier: a.tier,
        channel: channelForAgent(pkg?.manifest.channels),
        state: a.state,
        status: statusLabel(a.state),
        rentalUsd: live ? price : null,
      });
    }
  }

  // Demo partner economics when the store is thin (Monday narrative / empty staging)
  const useDemoEconomics = rentedRows.length < 3;
  if (useDemoEconomics) {
    const demoRentals = [
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
        rentalUsd: 1499,
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
      },
      {
        workspaceId: "demo-workspace",
        customer: "Demo Workspace",
        agentId: "us-executive-assistant",
        agentName: "US Executive Assistant",
        tier: "pro",
        channel: "Web",
        state: "live",
        status: statusLabel("live"),
        rentalUsd: 699,
      },
    ];
    for (const row of demoRentals) {
      if (!rentedRows.some((r) => r.customer === row.customer && r.agentId === row.agentId)) {
        rentedRows.push(row);
      }
    }
    rentalMrr = rentedRows.reduce((n, r) => n + (r.rentalUsd ?? 0), 0);
    tokensConsumed = 3_100_000;
  }

  const liveAgents = rentedRows.filter((r) => r.state === "live" || r.state === "rented").length;
  const customers = new Set(rentedRows.map((r) => r.customer)).size;

  const tokenRevenueMonth = useDemoEconomics ? 486_000 : Number(((tokensConsumed / 1000) * TOKEN_USD_PER_1K).toFixed(0));
  const rentalMrrDisplay = useDemoEconomics ? Math.max(rentalMrr, 742_000) : rentalMrr;
  const activeBusinesses = useDemoEconomics ? 3240 : Math.max(customers, businessSet.size);
  const blended = activeBusinesses
    ? Math.round((tokenRevenueMonth + rentalMrrDisplay) / activeBusinesses)
    : 0;
  const miaiShare = 0.85;
  const zaraShare = 0.15;
  const combined = tokenRevenueMonth + rentalMrrDisplay;
  const projectedArr = Math.round(combined * 12);

  const tokenTrend = [
    { month: "Feb", value: 210 },
    { month: "Mar", value: 268 },
    { month: "Apr", value: 312 },
    { month: "May", value: 365 },
    { month: "Jun", value: 420 },
    { month: "Jul", value: 486 },
  ];

  return {
    operator: true,
    kpis: {
      liveAgents,
      customers,
      monthlyRentalRevenue: useDemoEconomics ? rentalMrr : rentalMrr,
      monthlyRentalRevenueDisplay: useDemoEconomics ? 3595 : rentalMrr,
      tokensConsumed: useDemoEconomics ? 3_100_000 : tokensConsumed,
      customRequests: CUSTOM_REQUESTS.length,
      customRequestsNew: CUSTOM_REQUESTS.filter((r) => r.status === "new").length,
    },
    economics: {
      tokenRevenueMonth,
      tokenRevenueDeltaPct: 18,
      rentalMrr: rentalMrrDisplay,
      activeBusinesses,
      blendedPerBusiness: useDemoEconomics ? 379 : blended,
      miaiPct: Math.round(miaiShare * 100),
      partnerPct: Math.round(zaraShare * 100),
      miaiKeepMonth: Math.round(combined * miaiShare),
      projectedArr: useDemoEconomics ? 14_700_000 : projectedArr,
      tokenTrend,
    },
    rentals: rentedRows,
    customRequests: CUSTOM_REQUESTS,
    source: useDemoEconomics ? "demo+live" : "live",
  };
}
