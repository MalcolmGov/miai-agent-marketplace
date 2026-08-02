/** Trust Center — visual pillars + truth labels for partner meetings. */

export type Truth = "live" | "partial" | "via_provider" | "planned";
export type Status = "shipped" | "in_progress" | "planned";

export function truthLabel(t: Truth): string {
  if (t === "live") return "Live";
  if (t === "partial") return "Partial";
  if (t === "via_provider") return "Via provider";
  return "Planned";
}

export const HERO_BADGES: Array<{ label: string; truth: Truth; note: string }> = [
  {
    label: "POPIA-aligned",
    truth: "live",
    note: "Africa market packs (incl. ZA) encode POPIA-style minimisation and human handoff",
  },
  {
    label: "GDPR-ready",
    truth: "live",
    note: "EU packs + erasure language → human handoff; DSAR JSON export for owners/admins",
  },
  {
    label: "PCI-DSS (via provider)",
    truth: "via_provider",
    note: "Card data never touches agents — payments stay with Stripe / wallet provider",
  },
  {
    label: "SOC 2 (in progress)",
    truth: "planned",
    note: "Evidence collection planned against Azure / MyInstantAI control plane post-cutover",
  },
];

export type PillarItem = {
  title: string;
  body: string;
  truth: Truth;
  caveat?: string;
};

export type Pillar = {
  id: string;
  title: string;
  accent: string;
  accentSoft: string;
  icon: "lock" | "key" | "shield" | "building";
  items: PillarItem[];
};

export const PILLARS: Pillar[] = [
  {
    id: "privacy",
    title: "Data & privacy",
    accent: "#34d399",
    accentSoft: "rgba(52, 211, 153, 0.14)",
    icon: "lock",
    items: [
      {
        title: "Tenant data isolation",
        body: "Every business is workspace-partitioned — audit and APIs never return cross-tenant rows.",
        truth: "live",
      },
      {
        title: "Encryption in transit & at rest",
        body: "TLS on the host edge · OAuth tokens encrypted with AES-256-GCM at rest (v2 envelopes).",
        truth: "live",
        caveat: "Legacy v1 HMAC seals still open for migration; Azure Key Vault wrapping is next.",
      },
      {
        title: "PII minimisation",
        body: "Agents collect only what the task needs; connector secrets never enter prompts. Turn transcripts are redacted at write time (Phase 3).",
        truth: "partial",
        caveat: "Best-effort redaction (email/phone/card/OTP) — not a substitute for data minimisation at source.",
      },
      {
        title: "Retention & erasure",
        body: "DSAR JSON export and admin-managed erasure API for owners/admins. Audit trail stays append-only with tombstone events.",
        truth: "live",
        caveat: "Erasure is destructive and admin-only — chat agents still escalate to a human for end-user requests.",
      },
    ],
  },
  {
    id: "identity",
    title: "Identity & access",
    accent: "#60a5fa",
    accentSoft: "rgba(96, 165, 250, 0.14)",
    icon: "key",
    items: [
      {
        title: "OAuth 2.0 + PKCE",
        body: "Live in this build — every connector authorises with PKCE and HMAC-signed state.",
        truth: "live",
      },
      {
        title: "SSO / OIDC",
        body: "OIDC Bearer adapter ready for MyInstantAI identity (`workspace_id`, `roles`).",
        truth: "partial",
        caveat: "SAML via your IdP once MIAI SSO is wired — mock auth is for demos only.",
      },
      {
        title: "Role-based access",
        body: "Owner · admin · agent · read-only enforced on rent, wallet, configure, knowledge, OAuth, DSAR. Workspace page manages members and roles.",
        truth: "live",
        caveat: "OIDC still trusts IdP roles until SCIM; in-app invites are token-based (no email send yet).",
      },
      {
        title: "Scoped embed keys",
        body: "Per workspace + agent, HMAC-bound, rate-limited — only live/rented agents serve chat.",
        truth: "live",
      },
    ],
  },
  {
    id: "safety",
    title: "AI safety & guardrails",
    accent: "#fb923c",
    accentSoft: "rgba(251, 146, 60, 0.14)",
    icon: "shield",
    items: [
      {
        title: "Grounded answers",
        body: "Fenced to knowledge + tools — agents must not invent policy, prices, or records.",
        truth: "live",
      },
      {
        title: "Prompt-injection defense",
        body: "Guardrail docs + runtime checks · “Test the guardrails” probes in Agent Studio.",
        truth: "live",
      },
      {
        title: "Human-in-the-loop",
        body: "Sensitive, disputed, or high-value actions hand off to a person — including erasure requests.",
        truth: "live",
      },
      {
        title: "Output moderation",
        body: "Off-scope and unsafe replies are blocked or rephrased by pack guardrails before send.",
        truth: "partial",
        caveat: "Policy-layer moderation in runtime packs — not a separate third-party moderator yet.",
      },
      {
        title: "AI transparency (Art.50-aligned)",
        body: "Chat, embed, and App surfaces disclose that replies come from an AI system — not a human — with a clear path to request a person.",
        truth: "live",
        caveat: "Draft disclosure copy pending counsel review for jurisdiction-specific wording.",
      },
    ],
  },
  {
    id: "infra",
    title: "Infrastructure & ops",
    accent: "#2dd4bf",
    accentSoft: "rgba(45, 212, 191, 0.14)",
    icon: "building",
    items: [
      {
        title: "Secrets stay server-side",
        body: "Connector credentials encrypted at rest and never shipped to the browser.",
        truth: "live",
        caveat: "Azure Key Vault is on the deploy path; staging uses env + encrypted file store.",
      },
      {
        title: "Full audit trail",
        body: "Rent, chat, embed, OAuth, knowledge, wallet, consent, and DSAR export/erasure events per workspace.",
        truth: "live",
        caveat: "Append-oriented Postgres inserts; true WORM / immutable blob export planned with SOC 2 evidence.",
      },
      {
        title: "Rate limits & spend caps",
        body: "Embed: 30 req/min per key · wallet pause when tokens run out.",
        truth: "partial",
        caveat: "Richer per-tenant quota UI and anomaly alerts are next.",
      },
      {
        title: "Security headers + CSP",
        body: "Enforcing Content-Security-Policy plus nosniff, frame, referrer, and permissions policies.",
        truth: "live",
      },
    ],
  },
];

export const REGION_PACKS: Array<{
  id: string;
  label: string;
  frameworks: string[];
  emergency: string;
  channels: string[];
  agentLayer: string;
  platformNote: string;
}> = [
  {
    id: "us",
    label: "United States",
    frameworks: ["CCPA", "TCPA", "HIPAA (health — BAA required)"],
    emergency: "911",
    channels: ["SMS", "Web", "App"],
    agentLayer:
      "US packs bake TCPA (no cold outreach, honor STOP), CCPA minimisation, and health-agent HIPAA caution into prompts and guardrails.",
    platformNote:
      "Platform stores workspace data in the deployed region. HIPAA workloads need a signed BAA.",
  },
  {
    id: "eu",
    label: "European Union",
    frameworks: ["GDPR", "ePrivacy (marketing)"],
    emergency: "112",
    channels: ["SMS", "Web", "App"],
    agentLayer:
      "EU packs minimise personal data and hand access/erasure requests to a human — DSAR export for portability.",
    platformNote: "EU-only Postgres pin is on the Azure roadmap. Today: deploy region = chosen cloud region.",
  },
  {
    id: "africa",
    label: "Africa (incl. South Africa)",
    frameworks: ["POPIA-style", "Regional privacy"],
    emergency: "Local emergency services",
    channels: ["WhatsApp", "Web", "App", "SMS"],
    agentLayer:
      "Africa packs follow POPIA-style collection limits and escalate sensitive HR/payroll/medical matters to a person.",
    platformNote: "ZA is covered under the Africa pack. Country residency selectable at Azure deploy time.",
  },
  {
    id: "asia",
    label: "Asia",
    frameworks: ["PDPA-style", "Regional privacy"],
    emergency: "Local emergency services",
    channels: ["Web", "App", "SMS"],
    agentLayer:
      "Asia packs apply PDPA-style minimisation, opt-out via human handoff, and no cold marketing messages. Distinct from Oceania (AU/NZ/Pacific).",
    platformNote: "Asia residency follows the customer’s Azure region choice.",
  },
  {
    id: "oceania",
    label: "Oceania (AU / NZ / Pacific)",
    frameworks: ["Australian Privacy Act (APPs)", "NZ Privacy Act"],
    emergency: "000 (AU) / 111 (NZ)",
    channels: ["SMS", "Web", "App"],
    agentLayer:
      "Oceania packs bake AU/NZ privacy minimisation, STOP handling, and dual emergency guidance (000 / 111) into prompts and guardrails. Default currency AUD with NZD called out for NZ tenants.",
    platformNote: "AU/NZ/Pacific residency follows the customer’s Azure region choice.",
  },
];

export const ROADMAP_SECURITY: Array<{ when: string; item: string; status: Status }> = [
  {
    when: "Now",
    item: "RBAC matrix, AES-GCM tokens, DSAR export, CSP enforce, Test the guardrails demo",
    status: "shipped",
  },
  {
    when: "Next",
    item: "Key Vault wrapping, CSP nonce tightening, invite email delivery / SCIM, anomaly alerts",
    status: "in_progress",
  },
  {
    when: "Azure cutover",
    item: "Per-tenant region pin, EU/ZA/APAC residency options, App Insights SIEM hooks",
    status: "planned",
  },
  {
    when: "Post-GA",
    item: "SOC 2 Type II, DPA + subprocessor schedule, breach SLA",
    status: "planned",
  },
];

export function statusLabel(s: Status): string {
  if (s === "shipped") return "Shipped";
  if (s === "in_progress") return "In progress";
  return "Planned";
}
