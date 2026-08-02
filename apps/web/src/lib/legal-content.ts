/**
 * Draft legal page copy — Phase 4 I1 / expanded structure.
 * Not legal advice; pending counsel / partner brand review.
 * Placeholders marked TBD must be filled by counsel before customer cutover.
 */

export const LEGAL_DRAFT_BANNER =
  "DRAFT FOR PRODUCT PREVIEW — not legal advice and not a binding agreement. Pending counsel, operating-entity designation, and partner review. Mandatory consumer and data-protection rights are not waived.";

export const LEGAL_LAST_UPDATED = "2 August 2026";
export const LEGAL_VERSION = "0.2-draft";

export type LegalSection = { heading: string; body: string[] };

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "1. Introduction and scope",
    body: [
      "This Privacy Notice explains how the MyInstantAI Agent Marketplace (“MyInstantAI”, “we”, “us”, “the platform”) processes personal data when you visit our sites, create or join a workspace, rent or configure AI agents, use Studio / embed / App / WhatsApp / Ask AI channels, or connect third-party Actions (OAuth integrations).",
      "It applies to visitors, workspace members, and end users who interact with agents you deploy. It does not cover third-party sites you link to (Shopify, Slack, Zendesk, Stripe, LLM providers, etc.) — those have their own policies.",
      "Controller / processor roles depend on your commercial arrangement (self-serve marketplace vs partner-hosted). Until counsel confirms the operating entity per region, treat role allocations as provisional.",
    ],
  },
  {
    heading: "2. Who we are",
    body: [
      "Operating entity, registered address, and designated Information Officer / DPO: TBD — to be published when the contracting entity is confirmed for each market (including South Africa POPIA registration where required).",
      "Product contact for privacy requests during the draft period: your partner / MyInstantAI support channel, quoting your workspace id and a clear description of the request.",
      "Related internal drafts (not customer contracts): Record of Processing Activities, DPIA skeleton, breach runbook, and DPA/BAA templates maintained for assurance evidence.",
    ],
  },
  {
    heading: "3. Categories of personal data we process",
    body: [
      "Account & workspace: user identifiers, display names or emails you supply, workspace id, role/membership (readonly, agent, admin, owner), authentication mode metadata (mock staging headers vs OIDC claims when enabled).",
      "Commercial & metering: rental / subscription state, token or wallet balances and top-up events (no payment card PAN stored in chat or our primary app DB — card data is handled by Stripe or your wallet provider).",
      "Agent configuration: agent package ids, model settings, knowledge documents and pasted text you upload, crawled page text you request, tool/Action bindings.",
      "Conversations & ops: chat messages, session ids, correlation ids, channel (web, embed, app, WhatsApp, Ask AI), guardrail/safety events, rate-limit signals, and append-oriented audit events.",
      "Integrations: OAuth access and refresh tokens (encrypted at rest), provider metadata (e.g. Slack team, Shopify shop host, Zendesk subdomain), webhook delivery logs necessary for debugging.",
      "Leads & requests: optional name, email, and message content when you submit Ask AI leads or custom agent requests.",
      "Technical: IP address and user-agent as processed by our hosting providers and edge logs; theme, locale, and consent preference in browser storage.",
      "We do not intentionally collect special-category data (health, biometrics, etc.) as a product feature. If you upload such data into knowledge or chat, you are responsible for having a lawful basis and appropriate safeguards.",
    ],
  },
  {
    heading: "4. How we collect data",
    body: [
      "Directly from you when you register, configure agents, chat, upload knowledge, connect Actions, or contact support.",
      "Automatically from your browser or app (session, consent, device/browser metadata, security logs).",
      "From third-party providers when you authorise OAuth connectors or when LLM providers return model outputs based on prompts you send.",
      "From your organisation’s administrators if they invite you into a workspace or configure agents on your behalf.",
    ],
  },
  {
    heading: "5. Purposes and lawful bases (placeholders pending counsel)",
    body: [
      "Provide and operate the marketplace, agent runtime, embedding, and metering — typically contract / steps prior to contract (TBD counsel).",
      "Secure the service (authentication, RBAC, SSRF controls, webhook HMAC, rate limits, abuse prevention, audit) — typically legitimate interests or legal obligation (TBD).",
      "Improve reliability and safety (guardrails, evaluation, incident response) — legitimate interests (TBD); we will not use your private workspace content to train public foundation models unless a separate agreement says otherwise.",
      "Respond to data-subject and enterprise requests (access, export, erasure) — legal obligation / contract (TBD).",
      "Optional analytics and product measurement only after consent where required — consent (see Cookies notice).",
      "Sales follow-up on Ask AI / custom requests — consent or legitimate interests (TBD).",
    ],
  },
  {
    heading: "6. AI-specific processing",
    body: [
      "You interact with an AI system. Prompts and retrieved knowledge may be sent to a configured model provider (OpenAI, Anthropic, or a partner gateway) to generate replies and tool calls.",
      "Live paths may apply input/output guardrails and PII redaction hooks before storage or display; these reduce risk but are not a guarantee that sensitive data never appears in logs or model contexts.",
      "Confirm-before-write and human handoff are available for side-effecting Actions. You remain responsible for what your agents are authorised to do in third-party systems.",
      "EU AI Act transparency: we disclose AI-system interaction in product UI (chat/embed/Trust). High-risk classifications, if any, will be assessed per use case with counsel — we do not claim conformity assessment completion in this draft.",
    ],
  },
  {
    heading: "7. Sharing and subprocessors",
    body: [
      "Hosting & data stores: e.g. Railway (staging), Microsoft Azure (production path when cut over), managed Postgres, optional Redis/Upstash for rate limits and sessions.",
      "Model inference: LLM providers or partner gateway under your configured model mode.",
      "Payments: Stripe or partner wallet — we do not store PAN in chat.",
      "OAuth vendors you connect (Slack, Google, Microsoft, Shopify, HubSpot, Zendesk, etc.) receive authentication and API traffic you authorise.",
      "Professional advisors, auditors, or authorities where required by law.",
      "We do not sell personal data. A current subprocessor narrative is maintained in Trust / compliance documentation and will be attached to customer DPAs when executed.",
    ],
  },
  {
    heading: "8. International transfers",
    body: [
      "Staging may run outside the EU/EEA (e.g. Railway US). LLM inference may occur in the provider’s regions. Production Azure region pinning and SCCs / adequacy / supplementary measures: TBD per customer DPA.",
      "Until residency commitments are signed, do not assume EU-only processing. Honest status labels appear in the Trust Center.",
    ],
  },
  {
    heading: "9. Retention",
    body: [
      "Workspace operational data: retained while the workspace is active and for a wind-down period after closure (exact days TBD counsel).",
      "Chat transcripts and knowledge: until deleted by an authorised admin, superseded, or erased under a DSAR / managed erasure job.",
      "Audit events: append-oriented; practical caps may apply in storage — policy TBD (see audit retention docs).",
      "OAuth tokens: until you disconnect the connector or the workspace is erased.",
      "Consent preference in the browser: until cleared or overwritten.",
      "Backups and logs held by subprocessors follow their schedules and our deletion instructions once production backup policy is finalised (TBD).",
    ],
  },
  {
    heading: "10. Security measures",
    body: [
      "Technical measures include TLS in transit, encrypted OAuth tokens at rest, production boot hardening (strong secrets, mock-rail dual acknowledgments, Postgres required unless dual file-fallback ACK), outbound URL safety for connectors, webhook HMAC signatures, zod validation and body-size limits on key APIs, CSP (with documented residuals), and optional distributed rate limiting.",
      "Organisational measures (access control, breach process, vendor review) are being formalised; see the draft breach-72h runbook and Trust Center. No SOC 2 / ISO certificate is claimed in this draft.",
    ],
  },
  {
    heading: "11. Your rights",
    body: [
      "Depending on GDPR, UK GDPR, POPIA, CCPA/CPRA, and other applicable laws, you may have rights to access, rectify, erase, restrict, object, portability, and to withdraw consent.",
      "Workspace owners/admins can initiate a structured DSAR export (JSON pack excluding OAuth secrets) and request managed workspace erasure (audit tombstones may remain).",
      "End users of a customer’s agent should contact that customer (controller) in the first instance; we will assist the customer as processor where applicable.",
      "You may lodge a complaint with a supervisory authority in your jurisdiction (e.g. Information Regulator of South Africa, EU DPA, ICO). Contact details TBD once the operating entity is designated.",
    ],
  },
  {
    heading: "12. Children",
    body: [
      "The marketplace is directed at business users. We do not knowingly offer the service to children. If you believe we have collected a child’s data inappropriately, contact support for deletion.",
    ],
  },
  {
    heading: "13. Changes to this notice",
    body: [
      "We will update the “Last updated” date when this draft changes. Material changes before customer cutover will be communicated through the product or your partner channel. Binding privacy terms will appear in the executed DPA / MSA.",
    ],
  },
  {
    heading: "14. Contact",
    body: [
      "Privacy / DSAR: partner or MyInstantAI support — include workspace id, requester role, and the right you wish to exercise.",
      "Security vulnerabilities: see SECURITY.md (private reporting). Do not open public issues for exploitable findings.",
    ],
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: "1. Agreement and parties",
    body: [
      "These Terms of Use (“Terms”) govern access to and use of the MyInstantAI Agent Marketplace websites, APIs, Studio, embed widget, App channel, and related documentation.",
      "“Customer” means the organisation that rents agents or administers a workspace. “You” means an individual user accessing the service. Binding commercial terms (fees, SLAs, liability caps, DPA) will be set in an order form / MSA when executed — this page is a draft product notice only.",
    ],
  },
  {
    heading: "2. Eligibility and accounts",
    body: [
      "You must be authorised by your organisation to use the workspace. You are responsible for safeguarding credentials, embed keys, and OAuth connections under your control.",
      "Staging environments may use dual-flag mock authentication for demos. Mock rails are not a production identity provider. Customer cutover requires OIDC (or equivalent) as documented in platform integration guides.",
    ],
  },
  {
    heading: "3. The service",
    body: [
      "We provide tools to browse a catalogue of AI agents, configure knowledge and Actions, test in sandbox, rent/deploy to channels (website embed, App, WhatsApp where enabled), and monitor basic ops/history.",
      "Features labelled draft, mock, staging, or demo are for evaluation. Availability, region, and connector depth may differ between staging and production.",
      "We may modify, suspend, or discontinue features with reasonable notice where practicable, except for emergency security changes.",
    ],
  },
  {
    heading: "4. Customer content and responsibilities",
    body: [
      "You retain rights in knowledge, prompts, and business data you upload (“Customer Content”). You grant us a limited licence to host, process, transmit, and display Customer Content solely to provide the service.",
      "You represent that you have all rights and notices required to upload Customer Content and to connect third-party systems, and that your use complies with applicable law (including employment, consumer, financial, and health regulations where relevant).",
      "You are responsible for reviewing agent behaviour before go-live, configuring confirm-before-write appropriately, and supervising high-impact Actions.",
    ],
  },
  {
    heading: "5. Acceptable use",
    body: [
      "You must not use the service to: collect payment card numbers, one-time passwords, or passwords in chat; commit fraud or evade sanctions/AML controls; scrape or attack systems; send malware; infringe IP; harass individuals; or access data you are not entitled to see.",
      "You must not reverse-engineer the service except as permitted by mandatory law, bypass rate limits or safety controls, share embed keys publicly, or resell access without authorisation.",
      "Regulated advice (legal, medical, investment, credit) must not be presented as a substitute for a licensed professional. Agents should hand off when out of scope.",
    ],
  },
  {
    heading: "6. AI outputs and disclaimers",
    body: [
      "You acknowledge you are interacting with an AI system. Outputs may be inaccurate, incomplete, or inappropriate. You must verify critical outputs before relying on them.",
      "Except as expressly agreed in a signed MSA, the service and outputs are provided “as is” and “as available” without warranties of merchantability, fitness for a particular purpose, or non-infringement, to the fullest extent permitted by law.",
      "Human handoff and audit trails are provided as product features; they do not guarantee regulatory compliance for your industry.",
    ],
  },
  {
    heading: "7. Third-party services",
    body: [
      "Actions may call third-party APIs under OAuth tokens you authorise. Those services are not controlled by us. Their outages, policy changes, or data handling are their responsibility.",
      "You must comply with each provider’s terms and scopes. Disconnecting a connector is your responsibility when access should end.",
    ],
  },
  {
    heading: "8. Fees and tokens",
    body: [
      "Catalogue prices and token meters shown in-product are indicative. Binding fees, prepaid wallets, refunds, and taxes will be defined in commercial documents or Stripe checkout terms.",
      "Unused prepaid balances on mock/demo wallets may reset or be non-transferable unless a production wallet agreement says otherwise.",
    ],
  },
  {
    heading: "9. Intellectual property",
    body: [
      "We and our licensors own the platform, agent package formats, UI, and documentation (excluding Customer Content and third-party marks).",
      "Subject to these Terms and your plan, we grant you a non-exclusive, non-transferable right to use the service for your internal business purposes during the subscription term.",
    ],
  },
  {
    heading: "10. Confidentiality",
    body: [
      "Each party may receive confidential technical or business information. Recipients must protect it with reasonable care and use it only for performing under these Terms or the MSA, except for information that is public, independently developed, or required to be disclosed by law.",
    ],
  },
  {
    heading: "11. Privacy and data protection",
    body: [
      "Processing of personal data is described in the Privacy Notice and Data protection page. Enterprise customers will execute a DPA (and BAA if HIPAA applies) before processing regulated data at scale.",
      "Do not use the service to store or process PHI, cardholder data, or government secrets unless a signed agreement expressly covers that workload.",
    ],
  },
  {
    heading: "12. Suspension and termination",
    body: [
      "We may suspend access for security risk, non-payment (when billing is live), or material breach. You may stop using the service at any time; workspace deletion/erasure follows the Privacy Notice.",
      "On termination, your licence ends. Survival: IP, confidentiality, disclaimers, liability, and accrued payment terms (when commercialised).",
    ],
  },
  {
    heading: "13. Liability and indemnity (placeholders)",
    body: [
      "Liability caps, excluded damages, and indemnities will be set by counsel in the MSA. Nothing in this draft excludes liability that cannot be excluded under applicable law (e.g. fraud, death/personal injury caused by negligence, or non-waivable consumer rights).",
      "Customer will indemnify the platform against claims arising from Customer Content, unlawful agent instructions, or misuse of third-party APIs — exact wording TBD counsel.",
    ],
  },
  {
    heading: "14. Governing law and disputes",
    body: [
      "Governing law, venue, and dispute resolution: TBD based on contracting entity (e.g. South Africa / England & Wales / Delaware). Until designated, disputes should be raised via your partner commercial channel.",
    ],
  },
  {
    heading: "15. Changes",
    body: [
      "We may update these draft Terms during product development. The Last updated date will change. Binding terms for paying customers will be versioned in the MSA/order form.",
    ],
  },
];

export const DATA_PROTECTION_SECTIONS: LegalSection[] = [
  {
    heading: "1. Purpose of this page",
    body: [
      "This Data Protection summary describes how the marketplace approaches personal data governance, security, and data-subject requests. It complements the Privacy Notice and is aimed at customers’ security/privacy reviewers.",
      "Internal assurance drafts (RoPA, DPIA, breach-72h runbook, DPA/BAA templates, PCI Stripe SAQ narrative, SOC 2 evidence index) support sales and audits but are not signed contracts or certifications until countersigned or attested by an auditor.",
    ],
  },
  {
    heading: "2. Roles",
    body: [
      "Typical pattern: Customer is controller of end-user chat and knowledge content; MyInstantAI / platform operator acts as processor for that content. For marketplace account data we may act as controller — TBD counsel per entity.",
      "Sub-processors include hosting, database, optional Redis, LLM providers, Stripe, and OAuth vendors you enable. A schedule will attach to the DPA.",
    ],
  },
  {
    heading: "3. Processing inventory (summary)",
    body: [
      "Marketplace chat across Studio, website, App, Ask AI, and embed — transcripts, session and correlation ids.",
      "OAuth connector tokens — sealed at rest; not included in DSAR export packages.",
      "Knowledge sources — uploads, paste, and limited same-site crawl text.",
      "Audit & traceability — append-oriented events for security and support.",
      "Leads & custom requests — prospect contact fields when submitted.",
      "Workspace RBAC — membership and roles for access control.",
    ],
  },
  {
    heading: "4. Lawful basis and minimisation",
    body: [
      "Lawful bases are mapped per activity in the RoPA draft and must be confirmed by counsel before production marketing claims.",
      "Product controls encouraging minimisation: confirm-before-write on side effects, guardrails against collecting PAN/OTP/passwords in chat, PII redaction hooks on live paths, and body-size limits on APIs.",
    ],
  },
  {
    heading: "5. Data subject requests (DSAR)",
    body: [
      "Access / portability: authorised workspace owner/admin may obtain a JSON export via the DSAR export API (excludes OAuth secrets and raw provider tokens).",
      "Erasure: managed workspace erasure endpoint for admins creates audit tombstones; residual copies in backups/subprocessors follow their deletion cycles once production backup policy is live (TBD).",
      "Rectification / restriction / objection: process via support until self-serve tooling exists; timelines TBD (GDPR 30 days / POPIA as applicable).",
      "Identity verification: we may require proof of authority over the workspace before fulfilling requests.",
    ],
  },
  {
    heading: "6. Security controls (current product)",
    body: [
      "Access: workspace RBAC; OIDC path for production; staging mock rails only under dual acknowledgment flags.",
      "Encryption: TLS in transit; OAuth token encryption at rest; Postgres as durable store when DATABASE_URL is set (required in production).",
      "Network egress: SSRF protections and DNS pinning for guarded fetches; Shopify/Zendesk host allowlists.",
      "Integrity: webhook HMAC (timestamp + body); timing-safe compares for secrets; append-oriented audit inserts.",
      "Application: zod validation, content-length caps, CSP (unsafe-eval removed; unsafe-inline residual documented), optional Redis rate limits that fail closed when Redis is configured but unavailable.",
      "Supply chain: CI typecheck/tests/catalogue integrity/static-eval gates; secret scanning; critical dependency audit.",
    ],
  },
  {
    heading: "7. Breach notification",
    body: [
      "Draft 72-hour breach runbook exists for internal use. Customer notification commitments and supervisory authority filings will be defined in the DPA and local law (e.g. POPIA, GDPR Art. 33/34).",
      "Report suspected incidents via SECURITY.md / support channels immediately.",
    ],
  },
  {
    heading: "8. International transfers and residency",
    body: [
      "Staging hosting and LLM regions may involve transfers outside the customer’s country. EU residency, Azure Private Link, and Key Vault-backed KMS are tracked as partner/Azure dependencies — not claimed as complete on staging alone.",
      "Transfer tools (SCCs, TIAs): TBD counsel per customer.",
    ],
  },
  {
    heading: "9. Sector and special regimes",
    body: [
      "HIPAA: not offered without an executed BAA and PHI architecture decision. Do not upload PHI for production use under this draft.",
      "PCI: card data must not be entered in chat; Stripe Checkout / Payment Links handle cards. SAQ narrative is draft evidence only.",
      "Children’s data and special-category data: not targeted; customer must not configure agents to solicit them without legal review.",
    ],
  },
  {
    heading: "10. Customer responsibilities",
    body: [
      "Configure agents and knowledge lawfully; obtain end-user notices where you are controller; manage OAuth scopes; review audit logs; execute DPA before scaling regulated workloads; and keep admin accounts secured.",
    ],
  },
  {
    heading: "11. Contact",
    body: [
      "Data protection / DSAR: partner or MyInstantAI support with workspace id. DPO / Information Officer formal contacts: TBD.",
    ],
  },
];

export const COOKIES_SECTIONS: LegalSection[] = [
  {
    heading: "1. What this notice covers",
    body: [
      "This Cookie & Local Storage Notice describes how the MyInstantAI Agent Marketplace uses cookies, local storage, and similar technologies on our websites and web apps.",
      "It should be read with the Privacy Notice. Mobile App / WhatsApp channels may use different device identifiers governed by those platforms.",
    ],
  },
  {
    heading: "2. Essential storage (always on)",
    body: [
      "Theme preference (light/dark) so the UI renders consistently.",
      "Interface language / locale selection.",
      "Session continuity needed to keep you signed into a workspace or demo session (mechanism depends on auth mode: mock staging vs OIDC).",
      "Security and load-balancing cookies that our host may set to operate the site safely.",
      "These are necessary for the service you request and are not used for cross-site advertising.",
    ],
  },
  {
    heading: "3. Consent preference",
    body: [
      "When you choose “Essential only” or “Accept all” on the banner, we store `miai_consent_v1` in local storage so we do not re-prompt on every visit.",
      "We may also record the choice server-side (workspace-linked when authenticated) for audit of consent capture.",
    ],
  },
  {
    heading: "4. Optional analytics and telemetry",
    body: [
      "If enabled in a given environment, product analytics or App Insights-style telemetry runs only after you Accept all (or equivalent opt-in), except where strictly necessary operational telemetry is required to keep the service secure.",
      "Staging may emit console/operational logs for reliability without advertising cookies. We do not use third-party ad networks in the current product draft.",
      "Exact analytics cookies/SDK names will be listed here when a production analytics vendor is switched on.",
    ],
  },
  {
    heading: "5. Embed widget",
    body: [
      "The agent.js embed loads from our origin and may use browser storage scoped to the host page for chat session continuity. Customers embedding the widget should update their own cookie notices to mention the MyInstantAI chat widget where required.",
      "Script integrity (SRI) metadata is published for supply-chain transparency; it does not itself set cookies.",
    ],
  },
  {
    heading: "6. How long storage lasts",
    body: [
      "Session storage: cleared when the browser session ends (unless restored by your auth provider).",
      "Local storage preferences (theme, locale, consent): until you clear site data or overwrite the preference.",
      "Server-side sessions (when used): aligned with auth token lifetime — TBD per OIDC configuration.",
    ],
  },
  {
    heading: "7. Managing your choices",
    body: [
      "Use the on-site cookie banner. Choosing Essential only disables optional analytics in environments that honour the flag.",
      "You can also clear cookies and site data in your browser settings, or use browser controls that block third-party storage.",
      "Declining optional analytics does not block catalogue browsing, Studio configuration, or agent chat.",
    ],
  },
  {
    heading: "8. Updates",
    body: [
      "We will revise this notice when we add analytics vendors or change storage practices. See Last updated on this page.",
    ],
  },
  {
    heading: "9. Contact",
    body: [
      "Questions about cookies or consent: partner / MyInstantAI support, or see the Privacy Notice contact section.",
    ],
  },
];
