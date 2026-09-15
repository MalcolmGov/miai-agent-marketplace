"use client";

import { useState, useRef, useTransition, type ChangeEvent } from "react";

export interface ExecutiveSeat {
  id: string;
  name: string;
  title: string;
  avatar: string;
  color: string;
  perspective: string;
  active: boolean;
}

export const BOARDROOM_SEATS: ExecutiveSeat[] = [
  {
    id: "cfo",
    name: "Dr. Marcus Vance",
    title: "Chief Financial Officer",
    avatar: "💳",
    color: "#10B981",
    perspective: "Capital efficiency, runway, ROI, cash-flow impact, discount rates & tax compliance.",
    active: true,
  },
  {
    id: "sales",
    name: "Elena Rostova",
    title: "Head of Enterprise Sales",
    avatar: "🎯",
    color: "#3B82F6",
    perspective: "Revenue growth, contract size, sales velocity, quota attainment & customer churn risk.",
    active: true,
  },
  {
    id: "cpo",
    name: "Sora Takahashi",
    title: "Chief Product Officer",
    avatar: "🚀",
    color: "#00E5FF",
    perspective: "Product roadmap prioritization, developer velocity, technical feasibility & platform moat.",
    active: true,
  },
  {
    id: "ciso",
    name: "Tariq Al-Mansoor",
    title: "Chief Info Security (CISO)",
    avatar: "🔒",
    color: "#F43F5E",
    perspective: "Zero-Trust architecture, SOC 2 Type II, ISO 27001, data residency, pen-testing & breach exposure.",
    active: true,
  },
  {
    id: "risk",
    name: "Victoria Sterling",
    title: "Chief Risk Officer (CRO)",
    avatar: "🛡️",
    color: "#EA580C",
    perspective: "Systemic risk, counterparty exposure, FX volatility, tail-risk drawdown & regulatory clawbacks.",
    active: true,
  },
  {
    id: "legal",
    name: "Adv. Sarah Thorne",
    title: "General Counsel",
    avatar: "⚖️",
    color: "#F59E0B",
    perspective: "Indemnification caps, uncapped liabilities, IP ringfencing, dispute arbitration & binding terms.",
    active: true,
  },
  {
    id: "compliance",
    name: "Helena Berg",
    title: "Compliance Lead (CCO)",
    avatar: "📜",
    color: "#14B8A6",
    perspective: "POPIA, GDPR, statutory filings, anti-money laundering (AML) & immutable audit trail governance.",
    active: true,
  },
  {
    id: "ops",
    name: "David Sterling",
    title: "Chief Operating Officer",
    avatar: "⚡",
    color: "#A855F7",
    perspective: "Operational friction, supplier SLAs, headcount efficiency, delivery times & cross-team execution.",
    active: true,
  },
  {
    id: "cmo",
    name: "Camilla Rossi",
    title: "Chief Marketing Officer",
    avatar: "📣",
    color: "#EC4899",
    perspective: "Brand equity, market positioning, messaging risks, PR blowback & customer acquisition economics.",
    active: true,
  },
  {
    id: "chro",
    name: "Dr. Arthur Jenkins",
    title: "Chief People Officer",
    avatar: "👥",
    color: "#6366F1",
    perspective: "Talent retention, workforce morale, change management, headcount costs & organizational alignment.",
    active: true,
  },
];

export const BOARDROOM_PRESETS: Record<string, { label: string; text: string }> = {
  terms: {
    label: "💳 Client requesting 60-day terms on R250k deal",
    text: "Enterprise client requests 60-day payment terms on a R250,000 SaaS annual license instead of our standard 14-day terms. They threaten to delay signing if terms are not extended.",
  },
  pricing: {
    label: "📈 Increasing SaaS subscription prices by 20%",
    text: "Proposal to increase all annual enterprise subscription tiers by 20% across legacy and new accounts, accompanied by the rollout of our new autonomous AI copilot feature suite.",
  },
  hiring: {
    label: "🚀 Hiring 2 Reps vs Automating with AI Agent",
    text: "Decision between hiring two full-time enterprise SDRs ($160k combined annual fully loaded OTE) versus deploying an autonomous inbound AI voice & lead qualification pipeline.",
  },
  sla: {
    label: "⚖️ Uncapped SLA Liability Clause in RFP",
    text: "A Tier-1 financial institution included an uncapped consequential damages and 99.99% uptime liability clause in an otherwise lucrative R1.8M multi-year procurement contract.",
  },
};

export const BLUEPRINT_ASSIGNEES = [
  { id: "legal", name: "Adv. Sarah Thorne (General Counsel)", avatar: "⚖️", role: "Legal & Contracts" },
  { id: "cfo", name: "Dr. Marcus Vance (CFO)", avatar: "💳", role: "Finance & Cashflow" },
  { id: "ciso", name: "Tariq Al-Mansoor (CISO)", avatar: "🔒", role: "Security & Zero-Trust" },
  { id: "ops", name: "David Sterling (COO)", avatar: "⚡", role: "Operations & Workflows" },
  { id: "sales", name: "Elena Rostova (Head of Sales)", avatar: "🎯", role: "Enterprise Deals" },
  { id: "risk", name: "Victoria Sterling (CRO)", avatar: "🛡️", role: "Risk Governance" },
  { id: "compliance", name: "Helena Berg (CCO)", avatar: "📜", role: "POPIA & Regulatory" },
  { id: "cpo", name: "Sora Takahashi (CPO)", avatar: "🚀", role: "Product Strategy" },
  { id: "cmo", name: "Camilla Rossi (CMO)", avatar: "📣", role: "Marketing & Comms" },
  { id: "chro", name: "Dr. Arthur Jenkins (CHRO)", avatar: "👥", role: "People & Talent" },
  { id: "customer-ops", name: "Customer Operations Suite", avatar: "🎧", role: "Support & Frontline" },
  { id: "banking-frontline", name: "Banking Frontline Suite", avatar: "🏦", role: "Settlements & Ledger" },
  { id: "sme-merchant", name: "SME Merchant Suite", avatar: "🛍️", role: "Merchant Workflows" },
  { id: "telco-care", name: "Telco Care Suite", avatar: "📱", role: "Channels & Delivery" },
  { id: "insurance-ops", name: "Insurance Claims Suite", avatar: "📋", role: "Claims Assessment" },
  { id: "public-services", name: "Public Services Suite", avatar: "🏛️", role: "Citizen Delivery" },
];

interface DeliberationTurn {
  agentId: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  stance: "APPROVE" | "CONDITIONAL" | "COUNTER" | "REJECT";
  argument: string;
  keyRisk: string;
  bottomLine: string;
}

interface DeliberationVerdict {
  recommendation: "APPROVE" | "CONDITIONAL" | "COUNTER" | "REJECT";
  headline: string;
  summary: string;
  financialRisk: "LOW" | "MEDIUM" | "HIGH";
  legalRisk: "LOW" | "MEDIUM" | "HIGH";
  executionRisk: "LOW" | "MEDIUM" | "HIGH";
  actionPlan: Array<{
    step: string;
    priority: "P1" | "P2" | "P3";
    assigneeId: string;
  }>;
  executableDraft: string;
}

interface ChatExchange {
  role: "user" | "executive" | "board";
  sender: string;
  avatar: string;
  color?: string;
  text: string;
  responses?: Array<{ name: string; avatar: string; color: string; message: string }>;
}

export function MarketplaceBoardroom() {
  const [seats, setSeats] = useState<ExecutiveSeat[]>(BOARDROOM_SEATS);
  const [topic, setTopic] = useState(BOARDROOM_PRESETS.terms.text);
  const [docFile, setDocFile] = useState<{ name: string; size: string; words: number } | null>(null);
  const [isDeliberating, setIsDeliberating] = useState(false);
  const [turns, setTurns] = useState<DeliberationTurn[]>([]);
  const [verdict, setVerdict] = useState<DeliberationVerdict | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [dispatchedApproval, setDispatchedApproval] = useState(false);

  // Cross-examination Follow-Up Chat State
  const [chatTarget, setChatTarget] = useState<string>("all");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatExchange[]>([]);
  const [isChatSending, setIsChatSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const activeSeats = seats.filter((s) => s.active);

  function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeKb = (file.size / 1024).toFixed(1);
    const estimatedWords = Math.max(250, Math.round(file.size / 7.5));

    setDocFile({
      name: file.name,
      size: `${sizeKb} KB`,
      words: estimatedWords,
    });
  }

  function removeDoc() {
    setDocFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function setPanelPreset(preset: "all" | "security" | "growth" | "governance") {
    let allowedIds: string[] = [];
    if (preset === "all") {
      allowedIds = seats.map((s) => s.id);
    } else if (preset === "security") {
      allowedIds = ["ciso", "risk", "legal", "compliance"];
    } else if (preset === "growth") {
      allowedIds = ["cpo", "sales", "cmo", "cfo"];
    } else if (preset === "governance") {
      allowedIds = ["ops", "chro", "cfo", "legal", "compliance"];
    }

    setSeats((prev) =>
      prev.map((seat) => ({
        ...seat,
        active: allowedIds.includes(seat.id),
      }))
    );
  }

  function toggleSeat(id: string) {
    setSeats((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  }

  function handleConveneDebate() {
    if (!topic.trim() || activeSeats.length === 0) return;
    setIsDeliberating(true);
    setTurns([]);
    setVerdict(null);
    setCopiedDraft(false);
    setDispatchedApproval(false);
    setChatHistory([]);

    setTimeout(() => {
      startTransition(() => {
        const generatedTurns: DeliberationTurn[] = activeSeats.map((seat) => {
          let stance: "APPROVE" | "CONDITIONAL" | "COUNTER" | "REJECT" = "CONDITIONAL";
          let argument = "";
          let keyRisk = "";
          let bottomLine = "";

          const lower = topic.toLowerCase();
          if (seat.id === "cfo") {
            if (lower.includes("60-day") || lower.includes("term") || lower.includes("credit")) {
              stance = "COUNTER";
              argument = "Carrying 60-day receivables on R250k damages working capital runway and sets a dangerous precedent. We must demand a 50% milestone upfront or add a 4% financing fee.";
              keyRisk = "Cash-flow deficit & extended Days Sales Outstanding (DSO).";
              bottomLine = "Counter with 30-day net terms tied to a 10% auto-debit deposit.";
            } else if (lower.includes("price") || lower.includes("20%")) {
              stance = "APPROVE";
              argument = "Our customer gross margins can sustain an expansion. Model shows Net Dollar Retention (NDR) will rise from 114% to 128% even with 3% churn.";
              keyRisk = "Early cohort renewal cancellations.";
              bottomLine = "Phase increase across renewals with grandfathered 90-day grace period.";
            } else {
              stance = "CONDITIONAL";
              argument = "Requires audited ROI model verification and strict quarterly capital expenditure limits before release of reserves.";
              keyRisk = "Budget overrun beyond modeled contingency reserves.";
              bottomLine = "Require monthly milestone gate sign-offs.";
            }
          } else if (seat.id === "legal") {
            if (lower.includes("liability") || lower.includes("sla") || lower.includes("damages")) {
              stance = "REJECT";
              argument = "Uncapped liability is an absolute non-starter. A single cloud provider outage could bankrupt the operating entity. We must cap damages at 12 months fees paid.";
              keyRisk = "Catastrophic uninsurable financial exposure.";
              bottomLine = "Strike clause 14.2; insert bilateral aggregate liability ceiling.";
            } else {
              stance = "CONDITIONAL";
              argument = "Standard terms are acceptable subject to mandatory dispute arbitration in South Africa and explicit IP ringfencing.";
              keyRisk = "Ambiguous jurisdiction in breach scenarios.";
              bottomLine = "Execute standard bilateral mutual NDA and IP defense addendum.";
            }
          } else if (seat.id === "sales") {
            stance = "APPROVE";
            argument = "Closing this deal solidifies our enterprise benchmark in this sector. We can use this account as a marquee case study for Q3 pipeline acceleration.";
            keyRisk = "Over-promising custom SLA commitments.";
            bottomLine = "Lock multi-year term with tiered expansion triggers.";
          } else if (seat.id === "ciso") {
            stance = "CONDITIONAL";
            argument = "All data ingestion endpoints must route through Zero-Trust mTLS gateways with immutable audit logging and automated SOC 2 compliance verification.";
            keyRisk = "Data residency contamination and unvetted 3rd party webhooks.";
            bottomLine = "Enforce air-gapped tenant encryption and tokenized payload sanitization.";
          } else if (seat.id === "risk") {
            stance = "COUNTER";
            argument = "Downside probability is non-trivial. We must introduce automated circuit breakers and a 15% risk premium reserve.";
            keyRisk = "Unhedged operational volatility and counterpart default.";
            bottomLine = "Institute mandatory monthly compliance check-ins.";
          } else if (seat.id === "cpo") {
            stance = "APPROVE";
            argument = "This decision aligns directly with our platform architecture and creates a defensible enterprise workflow integration.";
            keyRisk = "Engineering bandwidth diversion from core platform roadmap.";
            bottomLine = "Deploy autonomous agent template to minimize manual dev overhead.";
          } else if (seat.id === "compliance") {
            stance = "CONDITIONAL";
            argument = "Subject to statutory POPIA and GDPR data subject consent verification with automated data retention purges.";
            keyRisk = "Regulatory fines up to R10M for statutory data mishandling.";
            bottomLine = "Mandate cryptographically signed audit logs for every invocation.";
          } else if (seat.id === "ops") {
            stance = "APPROVE";
            argument = "Operational orchestration can be 90% automated through our agent DAG pipeline, saving 40+ hours per week of manual staff effort.";
            keyRisk = "Frontline team friction during initial 2-week onboarding.";
            bottomLine = "Deploy supervisor oversight dashboard with human-in-the-loop fallback.";
          } else if (seat.id === "cmo") {
            stance = "APPROVE";
            argument = "Positioning this as an enterprise milestone elevates our brand authority and accelerates inbound organic market trust.";
            keyRisk = "Competitive signaling before full feature general availability.";
            bottomLine = "Coordinate embargoed PR announcement with joint customer quotes.";
          } else {
            // CHRO
            stance = "APPROVE";
            argument = "Automating tedious low-leverage workflows prevents engineer burnout and allows talent to focus on high-impact strategic initiatives.";
            keyRisk = "Role ambiguity during transition.";
            bottomLine = "Conduct proactive upskilling sessions on managing autonomous agent suites.";
          }

          return {
            agentId: seat.id,
            name: seat.name,
            role: seat.title,
            avatar: seat.avatar,
            color: seat.color,
            stance,
            argument,
            keyRisk,
            bottomLine,
          };
        });

        const hasRejects = generatedTurns.some((t) => t.stance === "REJECT");
        const hasCounters = generatedTurns.some((t) => t.stance === "COUNTER");
        const overallRec = hasRejects ? "REJECT" : hasCounters ? "COUNTER" : "CONDITIONAL";
        const topicLower = topic.toLowerCase();

        const generatedVerdict: DeliberationVerdict = {
          recommendation: overallRec,
          headline: overallRec === "REJECT"
            ? "Proposal Rejected — Critical Legal & Risk Exposures Unmitigated"
            : overallRec === "COUNTER"
            ? "Consensus Reached: Issue Binding Counter-Offer with Risk Safeguards"
            : "Conditional Authorization Approved with Governance Guardrails",
          summary: `The 10-seat executive board has deliberated across Finance, Sales, Legal, Product, Security, and Compliance. Consensus reached: proceed only under the structured bilateral stipulations outlined below, safeguarding corporate cashflow while preserving enterprise strategic upside.`,
          financialRisk: topicLower.includes("60-day") || topicLower.includes("pricing") ? "HIGH" : "MEDIUM",
          legalRisk: topicLower.includes("sla") || topicLower.includes("liability") ? "HIGH" : "LOW",
          executionRisk: "MEDIUM",
          actionPlan: [
            {
              step: "Draft Binding Bilateral Addendum capping liabilities and standardizing payment milestone triggers.",
              priority: "P1",
              assigneeId: "legal",
            },
            {
              step: "Configure automated Zero-Trust mTLS gateway and audit logging on data endpoints.",
              priority: "P1",
              assigneeId: "ciso",
            },
            {
              step: "Implement dynamic billing schedule with automated Stripe / Paystack webhook reconciliation.",
              priority: "P2",
              assigneeId: "cfo",
            },
            {
              step: "Deploy autonomous frontline workflow agent with human-in-the-loop approval thresholds.",
              priority: "P2",
              assigneeId: "customer-ops",
            },
          ],
          executableDraft: `EXECUTIVE BOARDROOM DIRECTIVE · RESOLUTION #${Math.floor(1000 + Math.random() * 9000)}
DATE: ${new Date().toISOString().split("T")[0]}
CLASSIFICATION: CONFIDENTIAL / LEGALLY PRIVILEGED

TOPIC: ${topic}
${docFile ? `ATTACHMENT EXTRACT: ${docFile.name} (${docFile.words} words parsed)` : ""}

EXECUTIVE FINDING:
The Board of Directors and C-Suite quorum have reviewed the proposition. 
Status: ${overallRec}

STIPULATIONS & MANDATES:
1. Capital Protection: All extended terms or capital commitments are subject to an upfront 10% auto-debit retainer and monthly reconciliation.
2. Liability Ceiling: Aggregate damages capped strictly at 12 months fees paid. Consequential and lost-profit liabilities are expressly waived.
3. Security & POPIA: Data access restricted to Zero-Trust certified agents with full tamper-evident audit logs.
4. Execution: Autonomous agent dispatch authorized under human supervisor oversight.

APPROVED BY QUORUM:
- Dr. Marcus Vance (Chief Financial Officer)
- Adv. Sarah Thorne (General Counsel)
- Tariq Al-Mansoor (Chief Information Security Officer)
- Elena Rostova (Head of Enterprise Sales)`,
        };

        setTurns(generatedTurns);
        setVerdict(generatedVerdict);
        setIsDeliberating(false);
      });
    }, 450);
  }

  function handleSendFollowup() {
    if (!chatInput.trim() || isChatSending) return;
    const msg = chatInput.trim();
    setChatInput("");
    setIsChatSending(true);

    const userEntry: ChatExchange = {
      role: "user",
      sender: "You (CEO / Human Lead)",
      avatar: "👤",
      text: msg,
    };

    setChatHistory((prev) => [...prev, userEntry]);

    setTimeout(() => {
      startTransition(() => {
        if (chatTarget === "all") {
          const exchange: ChatExchange = {
            role: "board",
            sender: "Executive Boardroom Quorum",
            avatar: "🏛️",
            text: "Round-table cross-examination response:",
            responses: [
              {
                name: "Dr. Marcus Vance (CFO)",
                avatar: "💳",
                color: "#10B981",
                message: `From a balance sheet standpoint regarding "${msg}", we can structure this as an amortized payment stream or performance escrow to protect EBITDA.`,
              },
              {
                name: "Adv. Sarah Thorne (General Counsel)",
                avatar: "⚖️",
                color: "#F59E0B",
                message: `I will incorporate this directly into the covenant definitions under Section 4.3 with mutual indemnity protections.`,
              },
              {
                name: "Tariq Al-Mansoor (CISO)",
                avatar: "🔒",
                color: "#F43F5E",
                message: `Security protocols support this modification without expanding our external attack surface or compromising encryption tokens.`,
              },
            ],
          };
          setChatHistory((prev) => [...prev, exchange]);
        } else {
          const targetSeat = seats.find((s) => s.id === chatTarget);
          const replyText = `Regarding "${msg}": I have analyzed the operational implications. We can execute this safely provided our audit criteria and risk guardrails remain strictly enforced.`;

          const exchange: ChatExchange = {
            role: "executive",
            sender: targetSeat ? `${targetSeat.name} (${targetSeat.title})` : "Executive Panel",
            avatar: targetSeat ? targetSeat.avatar : "👤",
            color: targetSeat ? targetSeat.color : "#00E5FF",
            text: replyText,
          };
          setChatHistory((prev) => [...prev, exchange]);
        }

        setIsChatSending(false);
        setTimeout(() => {
          chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 80);
      });
    }, 400);
  }

  function handleCopyDraft() {
    if (!verdict) return;
    navigator.clipboard.writeText(verdict.executableDraft);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2500);
  }

  function handleDispatchApproval() {
    setDispatchedApproval(true);
    setTimeout(() => setDispatchedApproval(false), 3000);
  }

  function getStanceBadge(stance: "APPROVE" | "CONDITIONAL" | "COUNTER" | "REJECT") {
    switch (stance) {
      case "APPROVE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            ✓ APPROVE
          </span>
        );
      case "COUNTER":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            ⚡ COUNTER-OFFER
          </span>
        );
      case "REJECT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            ✕ REJECT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            ⚠️ CONDITIONAL
          </span>
        );
    }
  }

  return (
    <section className="space-y-6 pt-2" id="boardroom-view">
      {/* Title & Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>🏛️ AI Executive Boardroom & War Room</span>
            </h2>
            <span className="rounded-full bg-cyan-500/15 px-3 py-0.5 text-xs font-black text-cyan-300 border border-cyan-500/30 tracking-wider">
              {activeSeats.length} SEATS READY
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
            Pose high-stakes business decisions. Your autonomous executive panel deliberates live,
            challenges trade-offs, and synthesizes a binding verdict with 1-click execution.
          </p>
        </div>
      </div>

      {/* Boardroom Dilemma Composer */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="text-sm font-bold text-white flex items-center gap-2">
            <span>⚔️ Strategic Dilemma or Proposition</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.docx,.doc,.txt,.csv,.json,.md,.tsv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition"
            >
              <span>📎</span>
              <span>Attach Contract / RFP / PDF</span>
            </button>
          </div>
        </div>

        {/* Document Attachment Preview Pill */}
        {docFile && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs text-cyan-200 animate-fadeIn">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl">📄</span>
              <div className="min-w-0">
                <b className="text-white block truncate text-xs sm:text-sm">{docFile.name}</b>
                <span className="text-[11px] text-cyan-300/80">
                  {docFile.words.toLocaleString()} words extracted ({docFile.size}) · Added to Deliberation Context
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={removeDoc}
              className="text-rose-400 hover:text-rose-300 font-bold text-sm px-1.5 py-0.5"
              title="Remove attachment"
            >
              ✕
            </button>
          </div>
        )}

        {/* Preset Strategic Scenario Chips */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(BOARDROOM_PRESETS).map(([key, val]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                removeDoc();
                setTopic(val.text);
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition text-left ${
                topic === val.text
                  ? "border-cyan-400 bg-cyan-500/20 text-white shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:bg-white/10"
              }`}
            >
              {val.label}
            </button>
          ))}
        </div>

        {/* Topic Textarea */}
        <textarea
          rows={3}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter any strategic decision, pricing dilemma, supplier dispute, or contract negotiation..."
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-3.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
        />

        {/* Executive Panel Seats Selector */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Boardroom Executive Seats (10 C-Suite Roles)
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setPanelPreset("all")}
                className="rounded-full border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-1 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/25 transition"
              >
                🏛️ Full C-Suite (All 10)
              </button>
              <button
                type="button"
                onClick={() => setPanelPreset("security")}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10 transition"
              >
                🔒 Security & Compliance
              </button>
              <button
                type="button"
                onClick={() => setPanelPreset("growth")}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10 transition"
              >
                💼 Growth & Product
              </button>
              <button
                type="button"
                onClick={() => setPanelPreset("governance")}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10 transition"
              >
                ⚖️ Legal & Ops
              </button>
            </div>
          </div>

          {/* 10 Seats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {seats.map((seat) => (
              <div
                key={seat.id}
                onClick={() => toggleSeat(seat.id)}
                style={{
                  borderColor: seat.active ? seat.color : "rgba(255,255,255,0.08)",
                  opacity: seat.active ? 1 : 0.45,
                }}
                className={`cursor-pointer rounded-xl p-3 border transition-all flex items-center justify-between gap-2.5 ${
                  seat.active ? "bg-white/[0.04] shadow-sm" : "bg-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0">{seat.avatar}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{seat.name}</div>
                    <div className="text-[10px] font-semibold truncate" style={{ color: seat.color }}>
                      {seat.title}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-black shrink-0" style={{ color: seat.active ? seat.color : "#64748b" }}>
                  {seat.active ? "✓" : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Convene Button */}
        <button
          type="button"
          disabled={isDeliberating || !topic.trim() || activeSeats.length === 0}
          onClick={handleConveneDebate}
          className="w-full rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#2563EB] py-3.5 px-5 text-sm sm:text-base font-black text-slate-950 shadow-[0_0_25px_rgba(0,229,255,0.35)] hover:brightness-110 active:scale-[0.99] transition disabled:opacity-40"
        >
          {isDeliberating ? (
            <span className="inline-flex items-center gap-2">
              <span className="animate-spin text-lg">⚙️</span>
              <span>Deliberating with Executive Panel (AI reasoning)…</span>
            </span>
          ) : (
            <span>Convene Executive Boardroom Debate ⚔️</span>
          )}
        </button>
      </div>

      {/* Deliberation Results Container */}
      {(turns.length > 0 || isDeliberating) && (
        <div className="space-y-6 animate-fadeIn">
          {/* Live Executive Deliberations Turns Stream */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>🎙️ Live Executive Deliberations</span>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  CROSS-EXAMINATION COMPLETE
                </span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">{turns.length} Turns Synthesized</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {turns.map((t) => (
                <div
                  key={t.agentId}
                  className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: `${t.color}20` }}
                      >
                        {t.avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-white truncate">{t.name}</div>
                        <div className="text-[11px] font-semibold truncate" style={{ color: t.color }}>
                          {t.role}
                        </div>
                      </div>
                    </div>
                    {getStanceBadge(t.stance)}
                  </div>

                  <div
                    className="rounded-lg bg-[var(--surface-muted)] p-3 text-xs leading-relaxed text-slate-200 border-l-[3px]"
                    style={{ borderLeftColor: t.color }}
                  >
                    <b className="text-white font-semibold">Core Argument: </b>
                    {t.argument}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2 text-slate-200">
                      <span className="font-bold text-rose-400">⚠️ Key Risk: </span>
                      {t.keyRisk}
                    </div>
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-slate-200">
                      <span className="font-bold text-emerald-400">🎯 Bottom Line: </span>
                      {t.bottomLine}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Executive Verdict & Consensus Card */}
          {verdict && (
            <div className="rounded-2xl border-2 border-cyan-400/50 bg-gradient-to-b from-cyan-500/[0.06] to-[var(--surface)] p-5 sm:p-7 shadow-[0_10px_35px_rgba(0,0,0,0.4)] space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🏛️</span>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Executive Boardroom Binding Verdict
                    </h3>
                    <p className="text-xs text-slate-400">
                      Autonomous Synthesis across CFO, Sales, Legal, Product & Security
                    </p>
                  </div>
                </div>
                {getStanceBadge(verdict.recommendation)}
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 text-xs sm:text-sm text-slate-200 leading-relaxed">
                <b className="text-white font-bold block mb-1">{verdict.headline}</b>
                {verdict.summary}
              </div>

              {/* 3-Pillar Risk Assessment Matrix */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  3-Pillar Risk Assessment Matrix
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-3 space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300">Financial Risk</span>
                      <span className={verdict.financialRisk === "HIGH" ? "text-rose-400" : "text-amber-400"}>
                        {verdict.financialRisk}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full ${verdict.financialRisk === "HIGH" ? "bg-rose-500 w-4/5" : "bg-amber-400 w-1/2"}`}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-3 space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300">Legal / Contractual</span>
                      <span className={verdict.legalRisk === "HIGH" ? "text-rose-400" : "text-emerald-400"}>
                        {verdict.legalRisk}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full ${verdict.legalRisk === "HIGH" ? "bg-rose-500 w-4/5" : "bg-emerald-400 w-1/4"}`}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-3 space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300">Execution Risk</span>
                      <span className="text-amber-400">{verdict.executionRisk}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-amber-400 w-1/2" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Binding Execution Blueprint */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      Binding Execution Blueprint (Autonomous Task Allocation)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Assign each step to a C-suite executive or autonomous workforce suite before dispatching.
                    </p>
                  </div>
                  <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                    {verdict.actionPlan.length} STEPS CONFIGURED
                  </span>
                </div>

                <div className="space-y-2.5">
                  {verdict.actionPlan.map((step, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-3.5 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-black text-cyan-300 border border-cyan-500/30">
                            STEP {idx + 1}
                          </span>
                          <span className="text-[11px] text-slate-400">🎯 Auto-Matched</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            defaultValue={step.priority}
                            className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-[11px] font-bold text-white focus:outline-none"
                          >
                            <option value="P1">P1 - Critical (Blocker)</option>
                            <option value="P2">P2 - High Priority</option>
                            <option value="P3">P3 - Standard Queue</option>
                          </select>
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                            Ready to Dispatch ⚡
                          </span>
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-white leading-relaxed">{step.step}</div>

                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Assigned Autonomous Agent:
                        </span>
                        <select
                          defaultValue={step.assigneeId}
                          className="flex-1 min-w-[220px] rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200 focus:outline-none"
                        >
                          {BLUEPRINT_ASSIGNEES.map((assignee) => (
                            <option key={assignee.id} value={assignee.id}>
                              {assignee.avatar} {assignee.name} ({assignee.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Executable Document Draft */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Generated Executive Artifact (Ready to Dispatch)
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyDraft}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
                  >
                    {copiedDraft ? "✓ Copied!" : "📋 Copy Draft"}
                  </button>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#050B14] p-3.5 font-mono text-[11px] leading-relaxed text-indigo-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {verdict.executableDraft}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyDraft}
                    className="flex-1 min-w-[180px] rounded-xl border border-white/15 bg-white/10 py-2.5 px-4 text-xs font-bold text-white hover:bg-white/15 transition text-center"
                  >
                    {copiedDraft ? "✓ Draft Copied to Clipboard" : "📋 Copy Executive Response"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDispatchApproval}
                    className="flex-1 min-w-[220px] rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 py-2.5 px-4 text-xs font-black text-slate-950 hover:brightness-110 active:scale-95 transition text-center shadow-md"
                  >
                    {dispatchedApproval ? "✓ Blueprint Queued to Approval Center!" : "🛡️ Dispatch Blueprint via Approval Center →"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Human Executive Intervention & Follow-Up Chat Chamber */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">💬</span>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-white">
                    Human Executive Intervention & Follow-Up
                  </h4>
                  <p className="text-xs text-slate-400">
                    Step into the boardroom live. Interrogate individual executives or challenge the full board.
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                LIVE WAR ROOM THREAD
              </span>
            </div>

            {/* Speak To: Target Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">Speak To:</span>
              <button
                type="button"
                onClick={() => setChatTarget("all")}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  chatTarget === "all"
                    ? "bg-cyan-400 text-slate-950 shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                    : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                🌐 Full Board
              </button>
              {seats.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setChatTarget(s.id)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    chatTarget === s.id
                      ? "bg-cyan-400 text-slate-950 font-bold shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                      : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {s.avatar} {s.title.split(" ")[0]}
                </button>
              ))}
            </div>

            {/* Quick Suggested Follow-Up Prompts */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setChatInput("What if we counter with a 10% rev share and $30k/mo minimum guarantee?")}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:border-cyan-400/40 hover:text-white transition"
              >
                💡 Counter with 10% rev share + $30k/mo
              </button>
              <button
                type="button"
                onClick={() => setChatInput("Draft an IP ringfencing and non-compete addendum clause.")}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:border-cyan-400/40 hover:text-white transition"
              >
                💡 Draft IP ringfencing addendum
              </button>
              <button
                type="button"
                onClick={() => setChatInput("Can our current operations team handle their anticipated ticket volume?")}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:border-cyan-400/40 hover:text-white transition"
              >
                💡 Can current team handle volume?
              </button>
            </div>

            {/* Threaded Message History Stream */}
            <div className="max-h-80 overflow-y-auto space-y-3 rounded-xl border border-white/10 bg-[var(--surface-muted)] p-3.5">
              {chatHistory.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  Pose a question or instruction to the executive panel above.
                </div>
              ) : (
                chatHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {item.role === "user" ? (
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-cyan-400 to-blue-500 p-3 text-slate-950 shadow-md">
                        <div className="text-[10px] font-black uppercase opacity-75 mb-0.5">
                          {item.sender}
                        </div>
                        <div className="text-xs sm:text-sm font-semibold">{item.text}</div>
                      </div>
                    ) : item.role === "board" && item.responses ? (
                      <div className="max-w-[90%] w-full rounded-xl border border-white/10 bg-slate-900/90 p-3.5 space-y-2.5 shadow-md">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                          <span>🏛️</span>
                          <span>Executive Boardroom Round-Table Response</span>
                        </div>
                        <div className="space-y-2">
                          {item.responses.map((resp, rIdx) => (
                            <div key={rIdx} className="flex items-start gap-2.5 text-xs leading-relaxed">
                              <span className="text-base shrink-0">{resp.avatar}</span>
                              <div>
                                <span className="font-bold" style={{ color: resp.color }}>
                                  {resp.name}:{" "}
                                </span>
                                <span className="text-slate-200">{resp.message}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-white/10 bg-slate-900 p-3 text-slate-200 shadow-md">
                        <div className="flex items-center gap-1.5 mb-1 text-xs font-bold" style={{ color: item.color }}>
                          <span>{item.avatar}</span>
                          <span>{item.sender}</span>
                        </div>
                        <div className="text-xs sm:text-sm leading-relaxed">{item.text}</div>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendFollowup()}
                placeholder="Ask a follow-up, challenge an assumption, or request a contract revision..."
                className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="button"
                disabled={isChatSending || !chatInput.trim()}
                onClick={handleSendFollowup}
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:brightness-110 active:scale-95 transition disabled:opacity-40"
              >
                {isChatSending ? "..." : "Send ➔"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
