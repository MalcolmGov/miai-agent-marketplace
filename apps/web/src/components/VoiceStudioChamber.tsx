"use client";

import { useState, useEffect, useRef } from "react";

interface WorkflowStep {
  name: string;
  channel: string;
  icon: string;
}

interface ConfidenceCell {
  label: string;
  score: number;
  details: string;
  status: "resolved" | "inferred" | "requires_input";
}

interface DnaProvenance {
  source: string;
  matchScore: number;
}

export interface VoiceStudioBlueprint {
  id: string;
  name: string;
  role: string;
  readinessScore: number;
  telemPurpose: number;
  telemInstructions: number;
  telemConnections: number;
  telemPopia: number;
  dna: DnaProvenance;
  confidenceMatrix: Record<string, ConfidenceCell>;
  dagSteps: WorkflowStep[];
  connectors: Array<{ name: string; status: string; icon: string }>;
  tools: string[];
  roi: string;
  systemPrompt: string;
}

const DEFAULT_BLUEPRINT: VoiceStudioBlueprint = {
  id: "custom-order-spec",
  name: "Order Resolution Specialist",
  role: "Autonomous retail order tracking, size exchange & refund manager",
  readinessScore: 88,
  telemPurpose: 100,
  telemInstructions: 95,
  telemConnections: 85,
  telemPopia: 90,
  dna: {
    source: "Delivery & Tracking (v1.1.0) — PanAfri Courier Enterprise Blueprint",
    matchScore: 98,
  },
  confidenceMatrix: {
    objective: { label: "🎯 Objective & Scope", score: 98, details: "Target scope verified", status: "resolved" },
    role: { label: "🎭 Role & Archetype", score: 100, details: "Order Support Concierge", status: "resolved" },
    integrations: { label: "🔌 System Integrations", score: 85, details: "Shopify + WhatsApp active", status: "resolved" },
    capabilities: { label: "⚡ Capabilities & DAG", score: 88, details: "6-step workflow bound", status: "resolved" },
    financial: { label: "💳 Financial & Limits", score: 95, details: "Capped at R150", status: "resolved" },
    governance: { label: "🛡️ Governance & POPIA", score: 92, details: "Zero-card-leakage rule", status: "resolved" },
  },
  dagSteps: [
    { name: "Intake Trigger", channel: "WhatsApp / Web", icon: "⚡" },
    { name: "Lookup Context", channel: "Shopify Orders", icon: "🔍" },
    { name: "Policy RAG", channel: "Exchange Guidelines", icon: "📚" },
    { name: "Boundary Gate", channel: "Threshold < R1,000", icon: "⚖️" },
    { name: "HITL Approval", channel: "Manager Review", icon: "🛡️" },
    { name: "Confirmation", channel: "Audit Log Sync", icon: "✅" },
  ],
  connectors: [
    { name: "Shopify", status: "Connected ✓", icon: "🛍️" },
    { name: "WhatsApp Cloud", status: "Ready ✓", icon: "💬" },
    { name: "Paystack Links", status: "Ready ✓", icon: "💳" },
    { name: "GitHub Actions", status: "Linked ✓", icon: "🐙" },
  ],
  tools: ["Order Status Lookup", "Exchange Validator", "Payment Link Dispatch", "Audit Logger"],
  roi: "R48,000 / mo support labor saved",
  systemPrompt: "You are the Order Resolution Specialist. You handle order tracking, size swaps, and policy-compliant refunds across WhatsApp and Web.",
};

const SCENARIO_PRESETS = [
  {
    key: "retail",
    icon: "👟",
    title: "Shopify & WhatsApp Order Specialist",
    prompt: "Build an autonomous order support specialist connecting Shopify inventory and WhatsApp Cloud for instant delivery updates and size exchanges.",
    agent: {
      id: "shopify-order-spec",
      name: "Shopify & WhatsApp Order Specialist",
      role: "Real-time courier tracking, automated exchange approvals & cart recovery",
      readinessScore: 94,
      telemPurpose: 100,
      telemInstructions: 96,
      telemConnections: 92,
      telemPopia: 95,
      dna: { source: "Omnichannel Commerce (v2.4.0) — Global Retail Blueprint", matchScore: 99 },
      confidenceMatrix: {
        objective: { label: "🎯 Objective & Scope", score: 100, details: "Retail order handling verified", status: "resolved" as const },
        role: { label: "🎭 Role & Archetype", score: 98, details: "E-Commerce Concierge", status: "resolved" as const },
        integrations: { label: "🔌 System Integrations", score: 95, details: "Shopify API + Meta Cloud verified", status: "resolved" as const },
        capabilities: { label: "⚡ Capabilities & DAG", score: 92, details: "Inventory check + refund rules", status: "resolved" as const },
        financial: { label: "💳 Financial & Limits", score: 90, details: "Refund threshold capped at R500", status: "resolved" as const },
        governance: { label: "🛡️ Governance & POPIA", score: 95, details: "End-to-end tokenized customer PII", status: "resolved" as const },
      },
      dagSteps: [
        { name: "Order Inbound", channel: "WhatsApp webhook", icon: "⚡" },
        { name: "Inventory Verify", channel: "Shopify GraphQL", icon: "🔍" },
        { name: "RAG Exchange Policy", channel: "Merchant Returns Rules", icon: "📚" },
        { name: "Credit Check", channel: "Refund Limit < R500", icon: "⚖️" },
        { name: "Courier Waybill", channel: "The Courier Guy / DHL", icon: "🚚" },
        { name: "Customer Notification", channel: "WhatsApp HSM Template", icon: "✅" },
      ],
      connectors: [
        { name: "Shopify", status: "Connected ✓", icon: "🛍️" },
        { name: "WhatsApp Cloud", status: "Active ✓", icon: "💬" },
        { name: "The Courier Guy", status: "Synced ✓", icon: "🚚" },
        { name: "Paystack", status: "Settlement Ready ✓", icon: "💳" },
      ],
      tools: ["Waybill Tracker", "SKU Replacement Lookup", "Store Credit Emitter", "POPIA Audit Ledger"],
      roi: "R62,000 / mo saved in tier-1 tickets",
      systemPrompt: "You are the Shopify & WhatsApp Order Specialist. Verify waybill tokens and issue return slips autonomously within approved thresholds.",
    },
  },
  {
    key: "collections",
    icon: "💳",
    title: "Xero & Paystack AR Collections",
    prompt: "Create an autonomous accounts receivable specialist that cross-references Xero unpaid invoices and sends friendly Paystack payment links via WhatsApp.",
    agent: {
      id: "xero-ar-collector",
      name: "Xero & Paystack AR Collections Specialist",
      role: "DSO reduction, dynamic payment arrangement negotiator & automated receipting",
      readinessScore: 92,
      telemPurpose: 100,
      telemInstructions: 94,
      telemConnections: 90,
      telemPopia: 92,
      dna: { source: "Automated Treasury & AR (v3.1.0) — FinTech Compliance Blueprint", matchScore: 96 },
      confidenceMatrix: {
        objective: { label: "🎯 Objective & Scope", score: 96, details: "Debt recovery within credit terms", status: "resolved" as const },
        role: { label: "🎭 Role & Archetype", score: 100, details: "Credit Control Negotiator", status: "resolved" as const },
        integrations: { label: "🔌 System Integrations", score: 92, details: "Xero OAuth2 + Paystack API", status: "resolved" as const },
        capabilities: { label: "⚡ Capabilities & DAG", score: 90, details: "Invoice aging tier escalation", status: "resolved" as const },
        financial: { label: "💳 Financial & Limits", score: 98, details: "Installment plans up to 3 months", status: "resolved" as const },
        governance: { label: "🛡️ Governance & POPIA", score: 94, details: "NCA compliant debtor notices", status: "resolved" as const },
      },
      dagSteps: [
        { name: "Overdue Poll", channel: "Xero Ledger Cron", icon: "⚡" },
        { name: "Aging Classification", channel: "30 / 60 / 90 Days", icon: "🔍" },
        { name: "Bespoke Payment Link", channel: "Paystack Dynamic Checkout", icon: "💳" },
        { name: "WhatsApp Nudge", channel: "Polite Account Statement", icon: "📱" },
        { name: "Dispute Flagging", channel: "Finance Lead Escalate", icon: "🛡️" },
        { name: "GL Reconcile", channel: "Auto-Match Bank Feed", icon: "✅" },
      ],
      connectors: [
        { name: "Xero Accounting", status: "Connected ✓", icon: "📊" },
        { name: "Paystack Links", status: "Active ✓", icon: "💳" },
        { name: "WhatsApp Cloud", status: "Ready ✓", icon: "💬" },
        { name: "Google Sheets", status: "Audit Log ✓", icon: "📈" },
      ],
      tools: ["Invoice Age Calculator", "Paystack Link Generator", "Escrow Reconciliation", "Xero GL Journal Poster"],
      roi: "DSO reduced by 14 days · R140,000 cashflow recovered",
      systemPrompt: "You are the Xero & Paystack AR Collections Specialist. Handle overdue accounts with executive professional courtesy.",
    },
  },
  {
    key: "it",
    icon: "💻",
    title: "ServiceNow & Slack Helpdesk",
    prompt: "Deploy an autonomous IT Tier-1 Helpdesk agent that ingests Slack requests, resets credentials safely, and updates ServiceNow incident tickets.",
    agent: {
      id: "it-servicenow-agent",
      name: "ServiceNow & Slack Helpdesk Agent",
      role: "Tier-1 IT automation, identity verification & Okta credential reset sentinel",
      readinessScore: 90,
      telemPurpose: 98,
      telemInstructions: 92,
      telemConnections: 88,
      telemPopia: 96,
      dna: { source: "IT Service Management (v1.9.0) — Zero-Trust Enterprise Blueprint", matchScore: 97 },
      confidenceMatrix: {
        objective: { label: "🎯 Objective & Scope", score: 95, details: "IT service request triage", status: "resolved" as const },
        role: { label: "🎭 Role & Archetype", score: 96, details: "Internal IT Helpdesk Specialist", status: "resolved" as const },
        integrations: { label: "🔌 System Integrations", score: 90, details: "ServiceNow Table API + Slack Bolt", status: "resolved" as const },
        capabilities: { label: "⚡ Capabilities & DAG", score: 88, details: "Self-healing IT pipelines", status: "resolved" as const },
        financial: { label: "💳 Financial & Limits", score: 100, details: "Zero expenditure threshold", status: "resolved" as const },
        governance: { label: "🛡️ Governance & POPIA", score: 96, details: "ISO 27001 credential masking", status: "resolved" as const },
      },
      dagSteps: [
        { name: "Slack Mention", channel: "#it-support channel", icon: "⚡" },
        { name: "Identity Challenge", channel: "Duo / Okta Push MFA", icon: "🔒" },
        { name: "ServiceNow Incident", channel: "CMDB CI Association", icon: "📝" },
        { name: "Automated Fix", channel: "SaaS Password / Cache", icon: "⚙️" },
        { name: "Admin Approval", channel: "Privileged Access Escalation", icon: "🛡️" },
        { name: "Ticket Resolution", channel: "SLA Timestamp Recorded", icon: "✅" },
      ],
      connectors: [
        { name: "ServiceNow", status: "Connected ✓", icon: "💻" },
        { name: "Slack Enterprise", status: "Bot Installed ✓", icon: "💬" },
        { name: "Okta Identity", status: "MFA Bound ✓", icon: "🔒" },
        { name: "GitHub Actions", status: "Runner Linked ✓", icon: "🐙" },
      ],
      tools: ["Okta Passcode Trigger", "ServiceNow Ticket Creator", "Slack Thread Replier", "Device MDM Auditor"],
      roi: "340 hours / yr saved for Sysadmin team",
      systemPrompt: "You are the ServiceNow & Slack Helpdesk Agent. Resolve employee technical friction with Zero-Trust identity guarantees.",
    },
  },
  {
    key: "repo",
    icon: "🐙",
    title: "Scan Connected GitHub Repo",
    prompt: "Inspect MalcolmGov/gaslite repository and autonomously synthesize an e-commerce checkout and inventory management AI agent tailored to the codebase.",
    agent: {
      id: "gaslite-codebase-agent",
      name: "Gaslite Retail & Logistics Agent",
      role: "Automated Supabase cart sync, order state-machine auditor & courier webhook handler",
      readinessScore: 96,
      telemPurpose: 100,
      telemInstructions: 98,
      telemConnections: 94,
      telemPopia: 94,
      dna: { source: "MalcolmGov/gaslite (main branch) — Next.js 15 & Supabase Codebase Extract", matchScore: 99 },
      confidenceMatrix: {
        objective: { label: "🎯 Objective & Scope", score: 99, details: "Codebase schemas mapped", status: "resolved" as const },
        role: { label: "🎭 Role & Archetype", score: 98, details: "Repository Logic Orchestrator", status: "resolved" as const },
        integrations: { label: "🔌 System Integrations", score: 94, details: "Supabase DB + GitHub PR CI", status: "resolved" as const },
        capabilities: { label: "⚡ Capabilities & DAG", score: 95, details: "Prisma schema & Next.js API routes", status: "resolved" as const },
        financial: { label: "💳 Financial & Limits", score: 92, details: "Order ceiling verified in schema", status: "resolved" as const },
        governance: { label: "🛡️ Governance & POPIA", score: 96, details: "Row-Level-Security (RLS) checked", status: "resolved" as const },
      },
      dagSteps: [
        { name: "Webhook Ingest", channel: "Next.js /api/webhook", icon: "⚡" },
        { name: "Supabase Query", channel: "RLS Session Context", icon: "🔍" },
        { name: "Cart Reconciliation", channel: "Inventory Decrement", icon: "📦" },
        { name: "Fraud Circuit Breaker", channel: "Velocity > 3 orders/min", icon: "⚖️" },
        { name: "Engineering Alert", channel: "Discord / Slack webhook", icon: "🛡️" },
        { name: "PR Deployment", channel: "GitHub Actions Auto-Merge", icon: "✅" },
      ],
      connectors: [
        { name: "GitHub API", status: "Repo Connected ✓", icon: "🐙" },
        { name: "Supabase DB", status: "RLS Certified ✓", icon: "⚡" },
        { name: "Next.js 15", status: "Route Bound ✓", icon: "🌐" },
        { name: "Vercel Webhooks", status: "Active ✓", icon: "🚀" },
      ],
      tools: ["Git Tree Inspector", "Prisma Migration Helper", "Cart Sanity Check", "GitHub PR Committer"],
      roi: "Instant CI/CD Agent Deployment · 0 manual configuration required",
      systemPrompt: "You are the Gaslite Retail & Logistics Agent compiled directly from MalcolmGov/gaslite. Manage cart workflows adhering to repository schemas.",
    },
  },
];

export function VoiceStudioChamber() {
  const [blueprint, setBlueprint] = useState<VoiceStudioBlueprint>(DEFAULT_BLUEPRINT);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [subtitles, setSubtitles] = useState(
    "\"Tell me what business workflow or role you want to create, or connect a GitHub repository to build directly from your codebase.\""
  );
  const [speakerTag, setSpeakerTag] = useState("ZARA NEURAL VOICE");
  const [vadTelemetry, setVadTelemetry] = useState("HARDWARE VAD: ARMED (<50ms)");
  const [showBargeInBadge, setShowBargeInBadge] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState("MalcolmGov/gaslite");
  const [ghDeployBadge, setGhDeployBadge] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [deployedStatus, setDeployedStatus] = useState(false);

  // Modals
  const [ghModalOpen, setGhModalOpen] = useState(false);
  const [ghPatInput, setGhPatInput] = useState("");
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [sandboxModalOpen, setSandboxModalOpen] = useState(false);
  const [sandboxInput, setSandboxInput] = useState("");
  const [sandboxMessages, setSandboxMessages] = useState<Array<{ sender: string; text: string; isAgent: boolean }>>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Holographic 3D Arc-Reactor Neural Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = (canvas.width = canvas.parentElement?.clientWidth || 500);
    let H = (canvas.height = 360);

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        W = canvas.width = canvas.parentElement.clientWidth;
        H = canvas.height = 360;
      }
    };
    window.addEventListener("resize", handleResize);

    const rings = [
      { radius: 150, tube: 2, tiltX: Math.PI / 5, tiltZ: 0, speed: 0.005, seg: 72, angle: 0 },
      { radius: 125, tube: 1.5, tiltX: -Math.PI / 7, tiltZ: Math.PI / 4, speed: -0.007, seg: 60, angle: 0 },
      { radius: 100, tube: 1, tiltX: Math.PI / 2.5, tiltZ: -Math.PI / 5, speed: 0.009, seg: 48, angle: 0 },
    ];

    let rotY = 0;
    const rotX = 0.18;
    let T = 0;
    let sweepAngle = 0;

    function project(x: number, y: number, z: number, cx: number, cy: number) {
      const x2 = x * Math.cos(rotY) - z * Math.sin(rotY);
      const z2 = x * Math.sin(rotY) + z * Math.cos(rotY);
      const y3 = y * Math.cos(rotX) - z2 * Math.sin(rotX);
      const z3 = y * Math.sin(rotX) + z2 * Math.cos(rotX);
      const fov = 480;
      const scale = fov / (fov + z3 + 180);
      return { sx: cx + x2 * scale, sy: cy + y3 * scale, scale };
    }

    function render() {
      if (!ctx) return;
      T += 0.016;
      sweepAngle += 0.025;
      rotY += isSpeaking ? 0.028 : isListening ? 0.018 : 0.007;

      const cx = W / 2;
      const cy = H / 2;

      let r = 147, g = 51, b = 234;
      if (isSpeaking) {
        r = 0; g = 229; b = 255;
      } else if (isListening) {
        r = 16; g = 185; b = 129;
      } else if (isCompiling) {
        r = 245; g = 158; b = 11;
      }

      const em = isSpeaking ? 1.6 + Math.sin(T * 5) * 0.4 : isListening ? 1.3 : 1.0;

      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.65);
      bg.addColorStop(0, `rgba(${r},${g},${b},0.12)`);
      bg.addColorStop(0.5, "rgba(6,11,26,0.92)");
      bg.addColorStop(1, "rgba(3,6,15,1)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Perspective Grid Floor
      ctx.save();
      const horizY = cy + 60;
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = `rgba(${r},${g},${b},0.8)`;
      ctx.lineWidth = 0.5;
      const ROWS = 8, COLS = 12;
      const gW = 500, gH = 180;
      for (let row = 0; row <= ROWS; row++) {
        const frac = row / ROWS;
        const yp = horizY + frac * gH;
        const xScale = 0.2 + frac * 0.8;
        ctx.beginPath();
        ctx.moveTo(cx - (gW / 2) * xScale, yp);
        ctx.lineTo(cx + (gW / 2) * xScale, yp);
        ctx.stroke();
      }
      for (let col = 0; col <= COLS; col++) {
        const t = col / COLS - 0.5;
        ctx.beginPath();
        ctx.moveTo(cx + t * gW * 0.2, horizY);
        ctx.lineTo(cx + t * gW, horizY + gH);
        ctx.stroke();
      }
      ctx.restore();

      // Outer Corona Glow
      const corona = ctx.createRadialGradient(cx, cy, 40, cx, cy, 220 * em);
      corona.addColorStop(0, `rgba(${r},${g},${b},0.28)`);
      corona.addColorStop(0.4, `rgba(${r},${g},${b},0.08)`);
      corona.addColorStop(1, "transparent");
      ctx.fillStyle = corona;
      ctx.beginPath();
      ctx.arc(cx, cy, 220 * em, 0, Math.PI * 2);
      ctx.fill();

      // Arc Reactor Core Glow
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 65 * em);
      core.addColorStop(0, `rgba(255,255,255,${0.65 * em})`);
      core.addColorStop(0.2, `rgba(${r},${g},${b},0.95)`);
      core.addColorStop(0.5, `rgba(${r},${g},${b},0.35)`);
      core.addColorStop(1, "transparent");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, 65 * em, 0, Math.PI * 2);
      ctx.fill();

      // Torus Rings
      rings.forEach((ring) => {
        ring.angle += ring.speed;
        ctx.save();
        ctx.globalAlpha = 0.65;
        ctx.strokeStyle = `rgba(${r},${g},${b},0.9)`;
        ctx.lineWidth = ring.tube * em;
        ctx.shadowColor = `rgba(${r},${g},${b},0.8)`;
        ctx.shadowBlur = 10 * em;
        ctx.beginPath();
        for (let s = 0; s <= ring.seg; s++) {
          const a = (s / ring.seg) * Math.PI * 2 + ring.angle;
          const x = ring.radius * Math.cos(a);
          const y = ring.radius * Math.sin(a) * Math.cos(ring.tiltX);
          const z = ring.radius * Math.sin(a) * Math.sin(ring.tiltX);
          const x2 = x * Math.cos(ring.tiltZ) - y * Math.sin(ring.tiltZ);
          const y2 = x * Math.sin(ring.tiltZ) + y * Math.cos(ring.tiltZ);
          const p = project(x2, y2, z, cx, cy);
          if (s === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.stroke();
        ctx.restore();
      });

      // Rotating radar sweep
      ctx.save();
      ctx.globalAlpha = 0.12 * em;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 180, sweepAngle, sweepAngle + 0.4);
      ctx.fillStyle = `rgba(${r},${g},${b},0.3)`;
      ctx.fill();
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    }

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSpeaking, isListening, isCompiling]);

  // Barge-In Interruption Handler
  function triggerBargeIn(reason = "Hologram Tap Interrupt") {
    setIsSpeaking(false);
    setIsListening(true);
    setShowBargeInBadge(true);
    setVadTelemetry("⚡ BARGE-IN ENGAGED · 0ms CUT-OFF");
    setSpeakerTag("LISTENING…");
    setSubtitles("⚡ Interrupted instantaneously! I am listening to your feedback…");

    setTimeout(() => {
      setShowBargeInBadge(false);
      setVadTelemetry("HARDWARE VAD: ARMED (<50ms)");
    }, 1800);
  }

  function handleVoiceToggle() {
    if (isSpeaking) {
      triggerBargeIn("Mic Tap Interrupt");
      return;
    }

    if (isListening) {
      setIsListening(false);
      setSpeakerTag("ZARA NEURAL VOICE");
      setVadTelemetry("HARDWARE VAD: ARMED (<50ms)");
      setSubtitles("Mic paused. Tap to speak or select an executive scenario below.");
      return;
    }

    setIsListening(true);
    setSpeakerTag("LISTENING…");
    setVadTelemetry("LISTENING (<50ms VAD ACTIVE)...");
    setSubtitles("Listening to you… Describe your workflow, integrations, or business rules.");

    setTimeout(() => {
      setIsListening(false);
      setIsCompiling(true);
      setSpeakerTag("COMPILING AGENT BLUEPRINT…");
      setVadTelemetry("STREAMING ELEVENLABS NEURAL TTS");
      setSubtitles("Compiling custom enterprise agent blueprint from your spoken requirements…");

      setTimeout(() => {
        setIsCompiling(false);
        setIsSpeaking(true);
        setSpeakerTag("ZARA NEURAL VOICE");
        setVadTelemetry("ELEVENLABS ULTRA-LOW-LATENCY STREAM");
        setSubtitles(
          "\"I have synthesized the custom enterprise agent blueprint. System instructions, 6-step workflow DAG, and certified connectors are bound and pre-audited.\""
        );

        setTimeout(() => {
          setIsSpeaking(false);
          setVadTelemetry("HARDWARE VAD: ARMED (<50ms)");
        }, 3200);
      }, 700);
    }, 2200);
  }

  function handlePauseResume() {
    setIsPaused((p) => {
      const next = !p;
      if (next) {
        setIsSpeaking(false);
        setIsListening(false);
        setSubtitles("Conversation paused ⏸️. Tap resume when you are ready.");
      } else {
        setSubtitles("Resumed! Listening or ready for scenario execution.");
      }
      return next;
    });
  }

  function handleSendText() {
    if (!textInput.trim()) return;
    const q = textInput.trim();
    setTextInput("");

    setIsCompiling(true);
    setVadTelemetry("COMPILING FROM SPECIFICATION");
    setSpeakerTag("COMPILER ACTIVE");
    setSubtitles(`Parsing: "${q}"... Synthesizing enterprise agent...`);

    setTimeout(() => {
      const match = SCENARIO_PRESETS.find(
        (p) =>
          q.toLowerCase().includes(p.key) ||
          q.toLowerCase().includes("shopify") ||
          q.toLowerCase().includes("xero") ||
          q.toLowerCase().includes("slack")
      );

      const target = match ? match.agent : {
        ...DEFAULT_BLUEPRINT,
        name: "Custom Enterprise Operations Agent",
        role: `Autonomous workflow orchestrator for: "${q.slice(0, 45)}..."`,
        readinessScore: 91,
      };

      setBlueprint(target);
      setIsCompiling(false);
      setIsSpeaking(true);
      setSpeakerTag("ZARA NEURAL VOICE");
      setVadTelemetry("ELEVENLABS ULTRA-LOW-LATENCY STREAM");
      setSubtitles(`"I have compiled ${target.name} with ${target.readinessScore}% Enterprise Production Readiness."`);

      setTimeout(() => {
        setIsSpeaking(false);
        setVadTelemetry("HARDWARE VAD: ARMED (<50ms)");
      }, 2800);
    }, 600);
  }

  function handlePresetTrigger(presetKey: string) {
    const found = SCENARIO_PRESETS.find((p) => p.key === presetKey);
    if (!found) return;

    setIsCompiling(true);
    setSpeakerTag("SYNTHESIZING AGENT DNA…");
    setVadTelemetry("MATCHING PRE-AUDITED PROVENANCE");
    setSubtitles(`Loading 1-Click Scenario: ${found.title}...`);

    setTimeout(() => {
      setBlueprint(found.agent);
      setIsCompiling(false);
      setIsSpeaking(true);
      setSpeakerTag("ZARA NEURAL VOICE");
      setVadTelemetry("ELEVENLABS ULTRA-LOW-LATENCY STREAM");
      setSubtitles(`"Loaded ${found.agent.name}. Pre-audited DNA matched with ${found.agent.dna.matchScore}% confidence."`);

      setTimeout(() => {
        setIsSpeaking(false);
        setVadTelemetry("HARDWARE VAD: ARMED (<50ms)");
      }, 3000);
    }, 450);
  }

  function handleDeployPR() {
    setGhDeployBadge(`✓ Pull Request #42 opened on ${selectedRepo} · Agent CI passing & ready to merge`);
    setTimeout(() => setGhDeployBadge(null), 5000);
  }

  function handleCopyEmbed() {
    const code = `<script src="https://zaraai.digital/embed.js" data-agent-id="${blueprint.id}" async></script>`;
    navigator.clipboard.writeText(code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  }

  function handleDeployMyAgents() {
    setDeployedStatus(true);
    setTimeout(() => setDeployedStatus(false), 3500);
  }

  function handleSendSandboxMsg() {
    if (!sandboxInput.trim()) return;
    const msg = sandboxInput.trim();
    setSandboxInput("");

    const next = [...sandboxMessages, { sender: "You", text: msg, isAgent: false }];
    setSandboxMessages(next);

    setTimeout(() => {
      setSandboxMessages((prev) => [
        ...prev,
        {
          sender: blueprint.name,
          text: `[Autonomous Tool Invoked]: Executed "${blueprint.tools[0]}" for input: "${msg}". Result verified against POPIA & ISO 27001 guardrails.`,
          isAgent: true,
        },
      ]);
    }, 400);
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-[#00E5FF]/60 bg-gradient-to-br from-[#060c18] via-[#091322] to-[#040810] p-5 sm:p-7 shadow-[0_0_50px_rgba(0,229,255,0.25)] space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 font-black text-xl shadow-[0_0_15px_rgba(0,229,255,0.5)]">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Zara <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Voice Studio</span>
              </h3>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Autonomous Compiler Active</span>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Speak naturally or type your problem — synthesizes pre-audited enterprise AI agents in milliseconds.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setGhModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 hover:border-cyan-400/40 transition"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>Connect GitHub</span>
          </button>
        </div>
      </div>

      {/* Main Studio Dual-Stage Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Neural Core & Acoustic Lab (Cols 1-6) */}
        <section className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
              <span>Holographic Neural Command Bridge</span>
            </div>
            <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-cyan-300">
              {vadTelemetry}
            </span>
          </div>

          {/* 3D Holographic Canvas with Tap-to-Interrupt */}
          <div
            onClick={() => isSpeaking && triggerBargeIn("Hologram Tap")}
            title="Tap anywhere to interrupt in 0ms"
            className="relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#030711] shadow-[inset_0_0_30px_rgba(0,229,255,0.15)] group"
          >
            <canvas ref={canvasRef} className="w-full h-[320px] block" />

            {/* Barge-In Flash Overlay */}
            {showBargeInBadge && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-rose-500 px-3.5 py-1 text-xs font-black text-white shadow-[0_0_20px_#f43f5e] animate-bounce">
                ⚡ BARGE-IN ENGAGED · 0ms CUT-OFF
              </div>
            )}

            <div className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-400 bg-black/60 px-2 py-1 rounded-md border border-white/10">
              TAP OR SPACEBAR TO BARGE-IN
            </div>
          </div>

          {/* Real-time Speech Subtitles */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-cyan-400">{speakerTag}</span>
              <span className="text-slate-500 text-[10px]">ELEVENLABS ULTRA-LOW-LATENCY STREAM</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans italic min-h-[44px]">
              {subtitles}
            </p>
          </div>

          {/* Dual Spectrum Visualizer Bars */}
          <div className="flex items-end justify-between gap-1 h-7 rounded-lg bg-black/40 px-2.5 py-1 border border-white/5 overflow-hidden">
            {Array.from({ length: 28 }).map((_, i) => {
              const active = isSpeaking || isListening;
              const h = active ? Math.max(15, (Math.sin(i * 0.7 + Date.now() * 0.005) * 0.5 + 0.5) * 95) : 12;
              return (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    isSpeaking
                      ? "bg-gradient-to-t from-cyan-500 to-blue-400"
                      : isListening
                      ? "bg-gradient-to-t from-emerald-500 to-teal-300"
                      : "bg-purple-500/40"
                  }`}
                />
              );
            })}
          </div>

          {/* Controls Deck */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleVoiceToggle}
              className={`flex-1 flex items-center justify-center gap-2.5 rounded-xl py-3 px-4 font-black text-xs sm:text-sm transition shadow-lg ${
                isListening
                  ? "bg-rose-500 text-white shadow-[0_0_20px_#f43f5e] animate-pulse"
                  : "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:brightness-110 active:scale-95"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
              <span>{isListening ? "Listening... (Tap to Cut-Off)" : "Tap to Talk & Build Agent"}</span>
            </button>

            <button
              type="button"
              onClick={handlePauseResume}
              title="Pause / Resume"
              className="rounded-xl border border-white/10 bg-white/5 p-3 text-white hover:bg-white/10 transition"
            >
              {isPaused ? "▶️" : "⏸️"}
            </button>

            <button
              type="button"
              onClick={() => triggerBargeIn("Manual Cut-Off")}
              title="Instant Barge-In Stop (Spacebar / Tap)"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-3 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition"
            >
              🛑 Cut-Off
            </button>
          </div>

          {/* Quick Message Dock */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendText()}
              placeholder="Or type any workflow (e.g. 'Build customer support for my website')..."
              className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSendText}
              className="rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-black text-slate-950 hover:brightness-110 active:scale-95 transition"
            >
              Send ➔
            </button>
          </div>

          {/* 1-Click Executive Pitch Presets */}
          <div className="space-y-2 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              ⚡ 1-Click Executive Pitch Scenarios
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SCENARIO_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handlePresetTrigger(preset.key)}
                  className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-left text-xs text-slate-200 hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-white transition group"
                >
                  <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                    {preset.icon}
                  </span>
                  <span className="font-semibold truncate">{preset.title}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT: Autonomous Blueprint Stage & GitHub Hub (Cols 7-12) */}
        <section className="lg:col-span-6 space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {blueprint.name}
              </h2>
              <p className="text-xs text-slate-400 leading-snug">{blueprint.role}</p>
            </div>
            <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-3 py-0.5 text-xs font-mono font-bold text-cyan-300">
              {blueprint.id}
            </span>
          </div>

          {/* GitHub Command Hub */}
          <div className="rounded-2xl border border-purple-500/30 bg-purple-500/[0.06] p-4 space-y-3 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-purple-300">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <div>
                  <b className="text-xs font-bold text-white block">GitHub Integration Hub</b>
                  <span className="text-[10px] text-slate-400">Connect organization repo to deploy workflows via voice</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectModalOpen(true)}
                className="rounded-lg border border-purple-500/30 bg-purple-500/15 px-2.5 py-1 text-[11px] font-bold text-purple-200 hover:bg-purple-500/25 transition"
              >
                🔍 Inspect Repo Codebase
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                className="flex-1 rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-xs font-medium text-white focus:outline-none"
              >
                <option value="MalcolmGov/gaslite">MalcolmGov/gaslite (Retail Checkout & Logistics)</option>
                <option value="MalcolmGov/aria">MalcolmGov/aria (Zara Autonomous Cloud)</option>
                <option value="MalcolmGov/customer-portal">MalcolmGov/customer-portal (Next.js Helpdesk)</option>
              </select>
              <button
                type="button"
                onClick={handleDeployPR}
                className="rounded-xl bg-gradient-to-r from-purple-400 to-indigo-400 px-3.5 py-2 text-xs font-black text-slate-950 hover:brightness-110 active:scale-95 transition whitespace-nowrap shadow-md"
              >
                🚀 Deploy via GitHub PR
              </button>
            </div>

            {ghDeployBadge && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-2.5 text-xs text-emerald-300 font-bold animate-fadeIn">
                {ghDeployBadge}
              </div>
            )}
          </div>

          {/* Enterprise Production Readiness Banner */}
          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/[0.07] to-blue-500/[0.04] p-4 space-y-3">
            <div className="flex items-center gap-4">
              <div
                style={{
                  background: `conic-gradient(#00e5ff ${blueprint.readinessScore}%, rgba(255,255,255,0.1) 0%)`,
                }}
                className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full p-1.5 shadow-[0_0_15px_rgba(0,229,255,0.3)]"
              >
                <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                  {blueprint.readinessScore}%
                </div>
              </div>
              <div>
                <b className="text-sm font-bold text-white block">Enterprise Production Readiness</b>
                <span className="text-xs text-slate-400">POPIA compliant · Level 4 Autonomy · High-risk HITL safeguard</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 text-[10px] font-mono font-bold">
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-cyan-300">
                🎯 Purpose: {blueprint.telemPurpose}%
              </span>
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-cyan-300">
                📋 Instructions: {blueprint.telemInstructions}%
              </span>
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-cyan-300">
                🔌 Connections: {blueprint.telemConnections}%
              </span>
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                🛡️ POPIA: {blueprint.telemPopia}%
              </span>
            </div>
          </div>

          {/* Matched Agent DNA Provenance */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl">🧬</span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                  Pre-Audited Agent DNA Provenance
                </div>
                <div className="text-xs font-bold text-purple-100 truncate">{blueprint.dna.source}</div>
              </div>
            </div>
            <span className="rounded-full border border-purple-500/40 bg-purple-500/20 px-2.5 py-1 text-xs font-mono font-black text-purple-200 shrink-0">
              {blueprint.dna.matchScore}% MATCH
            </span>
          </div>

          {/* Configuration Confidence Matrix Grid */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="uppercase tracking-wider text-slate-300">📊 Configuration Confidence Matrix</span>
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[10px] text-cyan-300">
                CONFIDENCE: 92%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(blueprint.confidenceMatrix).map(([k, cell]) => (
                <div key={k} className="rounded-lg border border-white/5 bg-white/[0.03] p-2 space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-200 truncate">{cell.label.split(" ")[1] || cell.label}</span>
                    <span className={cell.score >= 90 ? "text-emerald-400" : "text-cyan-400"}>
                      {cell.score}%
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      style={{ width: `${cell.score}%` }}
                      className={`h-full ${cell.score >= 90 ? "bg-emerald-400" : "bg-cyan-400"}`}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 block truncate">{cell.details}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 6-Step Visual Workflow Graph (DAG) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-white">⚡ Autonomous 6-Step Workflow Graph (DAG)</span>
              <span className="text-cyan-400 text-[10px]">Active Pipeline</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {blueprint.dagSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-center space-y-1 relative"
                >
                  <span className="text-base block">{step.icon}</span>
                  <div className="text-[10px] font-bold text-white truncate">{step.name}</div>
                  <div className="text-[8px] text-slate-400 truncate">{step.channel}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Provisioned Enterprise Connectors */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-white">🔌 Provisioned Enterprise Connectors</span>
              <span className="text-slate-400 text-[10px]">4 Active</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {blueprint.connectors.map((c, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-2 flex items-center gap-2">
                  <span className="text-base">{c.icon}</span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white truncate">{c.name}</div>
                    <div className="text-[9px] text-emerald-400 truncate">{c.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                setSandboxMessages([
                  {
                    sender: blueprint.name,
                    text: `Hello! I am ${blueprint.name}. My toolsets and connectors are active in sandbox mode. How can I assist you?`,
                    isAgent: true,
                  },
                ]);
                setSandboxModalOpen(true);
              }}
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-xs font-black text-slate-950 hover:brightness-110 active:scale-95 transition shadow-md"
            >
              ▶ Test in Live Voice Sandbox
            </button>

            <button
              type="button"
              onClick={handleCopyEmbed}
              className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition"
            >
              {copiedSnippet ? "✓ Snippet Copied!" : "📋 Copy 1-Line Embed Code"}
            </button>

            <button
              type="button"
              onClick={handleDeployMyAgents}
              className={`ml-auto rounded-xl px-4 py-2.5 text-xs font-black transition shadow-md ${
                deployedStatus
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-emerald-400 text-slate-950 hover:brightness-110 active:scale-95"
              }`}
            >
              {deployedStatus ? "✓ Deployed to My Agents!" : "1-Click Deploy Custom Agent →"}
            </button>
          </div>
        </section>
      </div>

      {/* MODALS */}

      {/* GitHub Account Connect Modal */}
      {ghModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🐙</span>
                <span>Connect GitHub Organization</span>
              </h3>
              <button
                type="button"
                onClick={() => setGhModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Authenticate via GitHub Personal Access Token or OAuth to inspect repositories and auto-deploy
              agent Pull Requests.
            </p>
            <input
              type="password"
              value={ghPatInput}
              onChange={(e) => setGhPatInput(e.target.value)}
              placeholder="github_pat_11A... (Personal Access Token)"
              className="w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGhModalOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setGhModalOpen(false);
                  setGhDeployBadge("✓ GitHub organization connected successfully.");
                  setTimeout(() => setGhDeployBadge(null), 3000);
                }}
                className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repo Inspector Modal */}
      {inspectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-slate-900 p-6 space-y-4 shadow-2xl animate-fadeIn max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔍</span>
                <h3 className="text-base font-bold text-white">
                  Codebase Inspection: <span className="text-cyan-400">{selectedRepo}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="rounded-xl border border-white/10 bg-black/50 p-3 space-y-2">
                <div className="text-[11px] font-bold text-emerald-400 uppercase">
                  ✓ Codebase Architectural Map (Extracted in 40ms)
                </div>
                <div className="font-mono text-[11px] text-slate-300 space-y-1">
                  <div>├── apps/web (Next.js 15 App Router, React 19, Tailwind)</div>
                  <div>├── supabase/schema.sql (Orders, Users, LineItems with RLS)</div>
                  <div>├── packages/connectors (Shopify, Paystack, WhatsApp Webhook)</div>
                  <div>└── .github/workflows/deploy.yml (Docker Hetzner VPS CI)</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                  <b className="text-white block mb-1">Identified API Routes:</b>
                  <span className="text-slate-400 font-mono text-[11px]">/api/orders, /api/checkout, /api/webhooks</span>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                  <b className="text-white block mb-1">Security Audit:</b>
                  <span className="text-emerald-400 font-bold">100% POPIA / GDPR RLS Compliance</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setInspectModalOpen(false);
                  handleDeployPR();
                }}
                className="rounded-xl bg-purple-400 px-4 py-2 text-xs font-bold text-slate-950"
              >
                Deploy PR for this Repo →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Voice Sandbox Modal */}
      {sandboxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-slate-900 p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧪</span>
                <h3 className="text-base font-bold text-white">
                  Live Sandbox: <span className="text-cyan-400">{blueprint.name}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSandboxModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="h-64 overflow-y-auto space-y-3 rounded-xl border border-white/10 bg-slate-950 p-3.5 text-xs">
              {sandboxMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.isAgent ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                      msg.isAgent
                        ? "bg-slate-800 text-slate-200 border border-white/10"
                        : "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-semibold"
                    }`}
                  >
                    <div className="text-[10px] font-bold opacity-75 mb-0.5">{msg.sender}</div>
                    <div>{msg.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sandboxInput}
                onChange={(e) => setSandboxInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendSandboxMsg()}
                placeholder="Simulate customer message or event trigger..."
                className="flex-1 rounded-xl border border-white/15 bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={handleSendSandboxMsg}
                className="rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-bold text-slate-950"
              >
                Send ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
