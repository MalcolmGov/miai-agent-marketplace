/**
 * Draft legal page copy — Phase 4 I1.
 * Not legal advice; pending counsel / partner brand review.
 */

export const LEGAL_DRAFT_BANNER =
  "DRAFT — not legal advice. Pending counsel and partner review. Does not create a binding agreement.";

export type LegalSection = { heading: string; body: string[] };

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "Who we are",
    body: [
      "MyInstantAI Agent Marketplace (“we”, “the platform”) provides AI agent configuration, chat, and connector tooling for business workspaces.",
      "Controller / processor roles depend on your deployment (self-serve marketplace vs partner-hosted). See docs/compliance/ROPA_DRAFT.md.",
    ],
  },
  {
    heading: "Data we process",
    body: [
      "Account and workspace identifiers, role memberships, agent configuration, knowledge you upload, chat transcripts, audit events, OAuth connection metadata (tokens encrypted at rest), and optional lead capture from Ask AI.",
      "We do not intend to store payment card numbers (PAN) in chat — payments are directed to Stripe or your wallet provider.",
    ],
  },
  {
    heading: "Purposes",
    body: [
      "Provide the marketplace and agent runtime, secure OAuth connectors, improve reliability and safety (guardrails, rate limits), meet legal obligations, and respond to DSAR / erasure requests from workspace owners and admins.",
    ],
  },
  {
    heading: "Your rights",
    body: [
      "Depending on your region (GDPR, POPIA, CCPA, etc.), you may have rights to access, correct, export, or erase personal data. Workspace admins can download a DSAR export and request managed erasure from the Trust Center.",
      "Chat-level erasure requests are handed to a human when automated wipe is not appropriate.",
    ],
  },
  {
    heading: "Retention",
    body: [
      "Operational data is retained while your workspace is active. Audit events are append-oriented; see docs/AUDIT_RETENTION.md. Exact retention schedules are draft until counsel finalises them.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "Privacy questions: use your partner / MyInstantAI support channel and reference your workspace id. Information Officer / DPO details will be published when the operating entity designates them.",
    ],
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: "Service",
    body: [
      "The marketplace lets you rent and configure AI agents, connect Actions (OAuth / APIs), and embed chat. Features marked mock or staging are for demos and are not production cutover.",
    ],
  },
  {
    heading: "Acceptable use",
    body: [
      "Do not use agents to collect card numbers, OTPs, or passwords in chat; to bypass sanctions/AML; to access another person’s data; or to provide regulated advice where a licensed professional is required.",
      "You must not reverse-engineer or abuse rate limits, embed keys, or connector credentials.",
    ],
  },
  {
    heading: "AI outputs",
    body: [
      "You acknowledge that you are interacting with an AI system. Outputs may be incorrect. Sensitive, clinical, legal, and financial decisions require a human. Human handoff is available in-product.",
    ],
  },
  {
    heading: "Liability",
    body: [
      "Draft placeholder — liability caps, warranties, and indemnities will be set by counsel and your commercial agreement. Nothing on this page waives mandatory consumer or data-protection rights.",
    ],
  },
];

export const COOKIES_SECTIONS: LegalSection[] = [
  {
    heading: "What we use",
    body: [
      "Essential cookies / local storage keep theme, locale, and session continuity working.",
      "We may store a consent preference (`miai_consent_v1`) when you accept or decline optional analytics cookies.",
    ],
  },
  {
    heading: "Optional analytics",
    body: [
      "Optional analytics (if enabled later via App Insights or similar) only run after consent. Staging may log operational telemetry without advertising cookies.",
    ],
  },
  {
    heading: "Manage choices",
    body: [
      "Use the cookie banner choices, or clear site data in your browser. Declining optional cookies does not block core marketplace features.",
    ],
  },
];
