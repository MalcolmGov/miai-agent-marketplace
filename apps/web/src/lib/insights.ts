import { TIER_PRICES } from "@/lib/constants";
import { getAgentPackage } from "@/lib/catalog";
import { listAudit, listWorkspaceAgents } from "@/lib/store";
import { listCustomRequests, type CustomRequest } from "@/lib/custom-requests";
import { listTurnTranscripts, type TurnTranscript } from "@/lib/traceability";

/** Rough USD per 1k tokens for display economics (demo / partner reporting). */
export const TOKEN_USD_PER_1K = 0.05;

/** Assumed human ticket cost avoided when a turn is not a handoff (estimate only). */
export const ASSUMED_COST_PER_DEFLECTION_USD = 8;

const TURN_AUDIT_TYPES = new Set([
  "agent_turn",
  "chat",
  "embed_turn",
  "app_turn",
  "ask_turn",
  "studio_turn",
  "consumer_turn",
  "whatsapp_turn",
]);

function channelLabel(raw?: string): string {
  const c = (raw || "").toLowerCase();
  if (c === "studio" || c === "chat") return "Studio";
  if (c === "embed" || c === "web") return "Website";
  if (c === "app") return "App";
  if (c === "ask") return "Ask AI";
  if (c === "whatsapp") return "WhatsApp";
  return "Other";
}

function isTurnEvent(a: { type: string; detail?: Record<string, unknown> }): boolean {
  if (a.detail?.action === "clear_chat") return false;
  return TURN_AUDIT_TYPES.has(a.type);
}

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

/**
 * Partner Insights — live workspace metering only.
 * No demo KPI injection. Empty workspaces return zeros + empty tables.
 */
export async function buildInsights(workspaceId: string, _walletTokens: number) {
  void _walletTokens;
  const agents = await listWorkspaceAgents(workspaceId);
  const audit = (await listAudit(5000)).filter((a) => a.workspaceId === workspaceId);
  const turns = audit.filter(isTurnEvent);

  let transcripts: TurnTranscript[] = [];
  try {
    transcripts = await listTurnTranscripts({ workspaceId, limit: 2000 });
  } catch {
    transcripts = [];
  }

  const now = new Date();
  const thisMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonth = `${lastMonthDate.getUTCFullYear()}-${String(lastMonthDate.getUTCMonth() + 1).padStart(2, "0")}`;

  const turnsThisMonth = turns.filter((t) => t.at.slice(0, 7) === thisMonth);
  const turnsLastMonth = turns.filter((t) => t.at.slice(0, 7) === lastMonth);
  const transcriptsThisMonth = transcripts.filter((t) => t.at.slice(0, 7) === thisMonth);

  const series: Array<{ day: string; count: number }> = [];
  const tokenSeries: Array<{ day: string; tokens: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    const dayTurns = turns.filter((t) => t.at.slice(0, 10) === key);
    const dayTx = transcripts.filter((t) => t.at.slice(0, 10) === key);
    series.push({ day: key, count: Math.max(dayTurns.length, dayTx.length) });
    let dayTokens = 0;
    for (const t of dayTurns) {
      const v = t.detail?.tokensDebited;
      if (typeof v === "number" && Number.isFinite(v)) dayTokens += v;
    }
    if (dayTokens === 0) {
      for (const t of dayTx) dayTokens += t.tokensDebited || 0;
    }
    tokenSeries.push({ day: key, tokens: dayTokens });
  }

  const studioUserMsgs = agents.reduce(
    (n, a) => n + (a.messages?.filter((m) => m.role === "user").length ?? 0),
    0,
  );
  const conversations = Math.max(
    turnsThisMonth.length,
    transcriptsThisMonth.length,
    studioUserMsgs,
  );
  const conversationsDeltaPct =
    turnsLastMonth.length > 0
      ? Math.round(
          ((turnsThisMonth.length - turnsLastMonth.length) / turnsLastMonth.length) * 100,
        )
      : null;

  let tokensUsed = 0;
  for (const t of turnsThisMonth) {
    const v = t.detail?.tokensDebited;
    if (typeof v === "number" && Number.isFinite(v)) tokensUsed += v;
  }
  if (tokensUsed === 0) {
    for (const t of transcriptsThisMonth) tokensUsed += t.tokensDebited || 0;
  }
  const spend = Number(((tokensUsed / 1000) * TOKEN_USD_PER_1K).toFixed(2));

  const handoffs = turnsThisMonth.filter((t) =>
    /handoff/i.test(JSON.stringify(t.detail ?? {})),
  ).length;
  const autoResolvedPct =
    turnsThisMonth.length > 0
      ? Math.round(((turnsThisMonth.length - handoffs) / turnsThisMonth.length) * 100)
      : null;

  const deflections = Math.max(0, conversations - handoffs);
  const estSavingsUsd = Number((deflections * ASSUMED_COST_PER_DEFLECTION_USD).toFixed(2));

  const byAgent = await Promise.all(
    agents
      .filter((a) => a.state !== "selected")
      .map(async (a) => {
        const pkg = await getAgentPackage(a.agentId);
        const agentTurns = turnsThisMonth.filter((t) => t.agentId === a.agentId);
        const agentTx = transcriptsThisMonth.filter((t) => t.agentId === a.agentId);
        const userMsgs = a.messages?.filter((m) => m.role === "user").length ?? 0;
        const convos = Math.max(agentTurns.length, agentTx.length, userMsgs);
        let tokens = 0;
        for (const t of agentTurns) {
          const v = t.detail?.tokensDebited;
          if (typeof v === "number") tokens += v;
        }
        if (tokens === 0) {
          for (const t of agentTx) tokens += t.tokensDebited || 0;
        }
        const leads = agentTurns.filter((t) => {
          const s = JSON.stringify(t.detail ?? {});
          return /lead|qualify|handoff_to_human/i.test(s);
        }).length;
        const channelCounts = new Map<string, number>();
        for (const t of agentTurns) {
          const raw =
            t.channel ||
            (typeof t.detail?.channel === "string" ? t.detail.channel : undefined);
          const label = channelLabel(raw);
          channelCounts.set(label, (channelCounts.get(label) ?? 0) + 1);
        }
        for (const t of agentTx) {
          const label = channelLabel(t.channel);
          channelCounts.set(label, (channelCounts.get(label) ?? 0) + 1);
        }
        const topChannel =
          [...channelCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
          channelForAgent(pkg?.manifest.channels);
        return {
          agentId: a.agentId,
          name: pkg?.manifest.name ?? displayNameFromAgentId(a.agentId),
          state: a.state,
          status: statusLabel(a.state),
          conversations: convos,
          resolvedPct:
            agentTurns.length > 0
              ? Math.round(
                  ((agentTurns.length - Math.min(leads, agentTurns.length)) / agentTurns.length) *
                    100,
                )
              : null,
          leads,
          tokens,
          spend: Number(((tokens / 1000) * TOKEN_USD_PER_1K).toFixed(2)),
          channel: topChannel,
        };
      }),
  );

  // Channel mix from actual turn/transcript channel fields
  const channelCounts = new Map<string, number>();
  const channelSource =
    transcriptsThisMonth.length > 0
      ? transcriptsThisMonth.map((t) => channelLabel(t.channel))
      : turnsThisMonth.map((t) =>
          channelLabel(t.channel || (typeof t.detail?.channel === "string" ? t.detail.channel : "")),
        );
  for (const label of channelSource) {
    channelCounts.set(label, (channelCounts.get(label) ?? 0) + 1);
  }
  const channelTotal = [...channelCounts.values()].reduce((n, v) => n + v, 0);
  const channels =
    channelTotal > 0
      ? [...channelCounts.entries()]
          .map(([label, count]) => ({
            id: label.toLowerCase().replace(/\s+/g, "-"),
            label,
            pct: Math.round((count / channelTotal) * 100),
          }))
          .sort((a, b) => b.pct - a.pct)
      : [];

  const leadsCaptured = byAgent.reduce((n, a) => n + a.leads, 0);

  return {
    workspaceId,
    period: "this month",
    kpis: {
      conversations,
      conversationsDeltaPct,
      autoResolvedPct,
      leadsCaptured,
      avgFirstResponseSec: null as number | null,
      tokensUsed,
      spendUsd: spend,
      estSavingsUsd,
      assumedCostPerDeflectionUsd: ASSUMED_COST_PER_DEFLECTION_USD,
    },
    conversationSeries: series,
    tokenSeries,
    channels,
    topQuestions: [] as Array<{ q: string; count: number }>,
    byAgent: byAgent.sort((a, b) => b.conversations - a.conversations),
    source: agents.length || turns.length || transcripts.length ? ("live" as const) : ("empty" as const),
  };
}

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
  const now = new Date().toISOString();
  const customRequests: CustomRequest[] = [
    {
      id: "req-kagiso",
      business: "Kagiso Logistics",
      need: "Quote deliveries & book drivers from WhatsApp",
      source: "Dashboard",
      status: "new",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "req-bright",
      business: "Bright Dental",
      need: "Recall reminders + appointment booking",
      source: "Marketing page",
      status: "reviewing",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "req-fresh",
      business: "FreshMart",
      need: "Stock-count agent across 3 shops",
      source: "Marketing page",
      status: "scoped",
      createdAt: now,
      updatedAt: now,
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
    // Use the shared turn predicate so the operator KPIs count EVERY channel (app/ask/consumer/
    // whatsapp/studio), not just agent_turn+chat+embed_turn — the old subset silently reported those
    // conversations and their tokens/revenue as zero. isTurnEvent already excludes clear_chat.
    if (isTurnEvent(ev)) {
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

  const customRequests = await listCustomRequests();
  const openRequests = customRequests.filter((r) =>
    r.status === "new" || r.status === "reviewing" || r.status === "scoped",
  );

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
      customRequests: openRequests.length,
      customRequestsNew: customRequests.filter((r) => r.status === "new").length,
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
    customRequests: openRequests,
    source: rentedRows.length || tokensThisMonth || prepaidThisMonth || openRequests.length
      ? ("live" as const)
      : ("empty" as const),
  };
}
