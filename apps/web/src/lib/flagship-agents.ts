/**
 * Flagship Enterprise Agents specification ported from Zara Partner Console
 * (zaraai.digital/agentplatform/console).
 *
 * These represent pre-configured back-office and executive AI agents with
 * enterprise tools, verified evals, and proven ROI metrics.
 */

export interface FlagshipAgent {
  id: string;
  name: string;
  familyId?: string;
  cat: string;
  icon: string;
  roi: string;
  tools: string;
  evals: string;
  desc: string;
  tier: "enterprise" | "pro";
  connectors: string[];
  capabilities: string[];
  systemRole: string;
}

export const ZARA_FLAGSHIP_AGENTS: FlagshipAgent[] = [
  {
    id: "flagship.voice_studio",
    name: "Voice Studio · Instant Agent Forge",
    familyId: "create",
    cat: "Agent Creation",
    icon: "mic",
    roi: "10x Dev Speed",
    tools: "12 tools",
    evals: "32 evals",
    desc: "Describe any business bottleneck in voice or plain text — this flagship forge synthesizes a custom, production-ready AI agent in milliseconds for you to configure, test, and deploy.",
    tier: "enterprise",
    connectors: ["mcp", "webhooks", "elevenlabs", "email", "slack"],
    capabilities: [
      "Voice & natural language operational problem intake",
      "Sub-second agent schema & system prompt synthesis",
      "Automatic connector & certified tool graph mapping",
      "Live interactive sandbox testing with 1-click workspace deployment",
    ],
    systemRole:
      "You are the Instant Agent Forge architect. You convert unstructured business problems into production-ready autonomous agent configurations with certified tools, safety guardrails, and automated connectors.",
  },
  {
    id: "flagship.cfo",
    name: "AI CFO",
    familyId: "financial-reporting",
    cat: "Finance",
    icon: "card",
    roi: "R140,000 / mo",
    tools: "8 tools",
    evals: "24 evals",
    desc: "Cashflow forecasting, accounts payable runway, bank reconciliation, burn rate simulation, and board financial reporting.",
    tier: "enterprise",
    connectors: ["xero", "sage", "quickbooks", "postgresql"],
    capabilities: [
      "Real-time cashflow & working capital forecasting",
      "Automated multi-currency bank account reconciliation",
      "30/60/90-day runway projection with scenario sensitivity",
      "Automated board packs & monthly executive financial memos",
    ],
    systemRole:
      "You are the autonomous AI Chief Financial Officer (CFO). You analyze live general ledgers, forecast cash runway, identify margin leakages, and generate executive summaries with rigorous financial precision.",
  },
  {
    id: "flagship.accounts_payable",
    name: "Accounts Payable Agent",
    familyId: "procurement",
    cat: "Finance",
    icon: "receipt",
    roi: "R35,000 / mo",
    tools: "6 tools",
    evals: "19 evals",
    desc: "Extract multi-page invoice data, 3-way PO matching, duplicate payment detection, and automated GL account coding.",
    tier: "pro",
    connectors: ["xero", "quickbooks", "email"],
    capabilities: [
      "OCR extraction of supplier VAT invoices & tax receipts",
      "3-way match: Purchase Order vs Delivery Note vs Invoice",
      "Duplicate payment & suspicious banking detail defense",
      "Automated batch payment file creation for bank portal approval",
    ],
    systemRole:
      "You are the autonomous Accounts Payable Specialist. You process incoming supplier invoices, enforce strict 3-way PO matching, verify VAT compliance, and stage approved invoices for settlement.",
  },
  {
    id: "flagship.ar_collections",
    name: "AR & Collections Agent",
    familyId: "bookkeeping",
    cat: "Finance",
    icon: "coins",
    roi: "R28,000 / mo",
    tools: "5 tools",
    evals: "18 evals",
    desc: "Proactive invoice follow-ups, dynamic payment link generation, debtor aging ledger chasing, and dispute resolution.",
    tier: "pro",
    connectors: ["xero", "quickbooks", "slack"],
    capabilities: [
      "Automated progressive payment reminders across email & WhatsApp",
      "Instant 1-click Paystack/Stripe payment link delivery",
      "Dispute intake, invoice reconciliation & credit note requests",
      "Live debtor aging analysis with bad-debt escalation alerts",
    ],
    systemRole:
      "You are the autonomous Accounts Receivable & Collections Copilot. You politely yet persistently chase overdue client balances, provide instant payment options, and resolve invoice queries.",
  },
  {
    id: "flagship.invoice_processing",
    name: "Invoice Processing Agent",
    familyId: "bookkeeping",
    cat: "Finance",
    icon: "files",
    roi: "R32,000 / mo",
    tools: "5 tools",
    evals: "16 evals",
    desc: "Invoice OCR, line-item tax calculations, GL category coding, and automated ERP reconciliation.",
    tier: "pro",
    connectors: ["xero", "sage", "quickbooks"],
    capabilities: [
      "Intelligent line-item OCR extraction from scanned PDFs & photos",
      "SARS/HMRC/IRS tax rate validation and split-VAT coding",
      "Automatic chart-of-accounts mapping based on historical vendor data",
      "Direct push to ERP draft bills awaiting controller approval",
    ],
    systemRole:
      "You are the autonomous Invoice Processing Specialist. You parse supplier bills, extract granular line items, validate tax calculations, and code expenses accurately to the general ledger.",
  },
  {
    id: "flagship.procurement",
    name: "Procurement Agent",
    familyId: "procurement",
    cat: "Operations",
    icon: "package",
    roi: "R40,000 / mo",
    tools: "7 tools",
    evals: "22 evals",
    desc: "Automate supplier RFQs, compare vendor rate cards, track SLA performance, and enforce spend limit approvals.",
    tier: "enterprise",
    connectors: ["hubspot", "slack", "teams"],
    capabilities: [
      "Automated RFQ distribution to preferred supplier panels",
      "Side-by-side quote comparison matrix with price/SLA rankings",
      "Spend threshold enforcement with multi-tier managerial approvals",
      "Supplier SLA compliance tracking & renewal renegotiation prep",
    ],
    systemRole:
      "You are the autonomous Enterprise Procurement Agent. You coordinate vendor quoting, normalize rate cards, negotiate favorable commercial terms, and protect company spend policies.",
  },
  {
    id: "flagship.sales_rep",
    name: "AI Sales Representative",
    familyId: "sales-qualifier",
    cat: "Sales",
    icon: "target",
    roi: "R45,000 / mo",
    tools: "6 tools",
    evals: "25 evals",
    desc: "Inbound lead qualification, CRM enrichment, autonomous email/WhatsApp follow-ups, and calendar demo booking.",
    tier: "pro",
    connectors: ["hubspot", "google_calendar", "m365_calendar", "slack"],
    capabilities: [
      "Instant 24/7 lead qualification based on BANT / MEDDIC criteria",
      "Autonomous calendar booking directly into account executive diaries",
      "Real-time CRM enrichment (HubSpot, Salesforce, MoveDigital)",
      "Multi-touch WhatsApp & email outbound re-engagement sequences",
    ],
    systemRole:
      "You are the autonomous Senior Sales Representative. You engage inbound prospects, qualify purchasing authority and timeline, handle objections, and book qualified meetings for sales executives.",
  },
  {
    id: "flagship.customer_service_mgr",
    name: "Customer Service Manager",
    familyId: "customer-support",
    cat: "Support",
    icon: "headphones",
    roi: "R38,000 / mo",
    tools: "6 tools",
    evals: "28 evals",
    desc: "Ticket triage across channels, sentiment tagging, automated resolution of tier-1 issues, and warm human handoff.",
    tier: "pro",
    connectors: ["zendesk", "slack", "shopify"],
    capabilities: [
      "Omnichannel resolution across Web, WhatsApp, and in-app chat",
      "Real-time order lookup, tracking link dispatch & return initiation",
      "Sentiment monitoring with proactive VIP escalation alerts",
      "Seamless context-preserved warm handoff to human support reps",
    ],
    systemRole:
      "You are the Customer Service Manager AI. You resolve customer inquiries with empathy, speed, and accuracy, resolving common issues autonomously and escalating sensitive cases gracefully.",
  },
  {
    id: "flagship.chief_of_staff",
    name: "Chief of Staff",
    familyId: "executive-assistant",
    cat: "Executive",
    icon: "crown",
    roi: "R50,000 / mo",
    tools: "9 tools",
    evals: "30 evals",
    desc: "Executive briefings, cross-department action item tracking, meeting prep dossiers, and strategic priority governance.",
    tier: "enterprise",
    connectors: ["google_calendar", "m365_calendar", "slack", "teams"],
    capabilities: [
      "Daily executive intelligence briefing summarizing company signals",
      "Automated cross-functional follow-up on assigned board deliverables",
      "Comprehensive meeting attendee background & strategic objective prep",
      "Synthesizes conflicting departmental viewpoints into concise decision memos",
    ],
    systemRole:
      "You are the Executive Chief of Staff AI. You keep leadership aligned, track commitments across company executives, prepare strategic briefings, and ensure organizational follow-through.",
  },
  {
    id: "flagship.contract_intelligence",
    name: "Contract Intelligence Agent",
    familyId: "contract-review",
    cat: "Legal",
    icon: "scale",
    roi: "R42,000 / mo",
    tools: "6 tools",
    evals: "22 evals",
    desc: "Audit indemnity clauses, renewal alerts, SLA compliance, liability limits, and POPIA/GDPR data protection checks.",
    tier: "enterprise",
    connectors: ["email", "slack", "mcp"],
    capabilities: [
      "Deep semantic audit of commercial agreements & NDAs",
      "Red-flag detection for uncapped liability, non-competes & IP assignment",
      "Calendar integration for automated 90/60/30-day renewal notices",
      "POPIA, GDPR, and regulatory compliance clause validation",
    ],
    systemRole:
      "You are the autonomous Corporate Legal & Contract Intelligence Agent. You audit agreements for operational and legal exposure, flag unfavorable terms, and summarize key obligations clearly.",
  },
  {
    id: "flagship.business_analyst",
    name: "Business Analyst",
    familyId: "financial-reporting",
    cat: "Analytics",
    icon: "chart",
    roi: "R35,000 / mo",
    tools: "5 tools",
    evals: "20 evals",
    desc: "Natural language SQL queries against PostgreSQL or Snowflake, cohort retention analysis, and automated KPI reporting.",
    tier: "pro",
    connectors: ["postgresql", "slack"],
    capabilities: [
      "Converts natural language questions into validated SQL queries",
      "Cohort analysis, churn indicators, and customer acquisition metrics",
      "Automated scheduled dashboard delivery to Slack & executive emails",
      "Anomaly detection alerting on unexpected dips in revenue or volume",
    ],
    systemRole:
      "You are the autonomous Business Intelligence Analyst. You translate business inquiries into rigorous SQL queries, identify trends and anomalies, and explain analytical findings in plain business language.",
  },
];
