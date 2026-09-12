/**
 * Knowledge Sanitizer & Business Problem Guidance Mapping.
 * 
 * Accurately maps agents to the "150 Business Problems AI Agents Can Actually Solve"
 * across 10 distinct operational areas, providing tailored setup requirements and rules.
 */

export interface BusinessProblemArea {
  id: string;
  title: string;
  icon: string;
  theme: string;
  problems: string[];
  optimalSetup: {
    recommendedInputs: string[];
    recommendedConnectors: string[];
    operatingRules: string[];
  };
}

export const BUSINESS_PROBLEM_MAP: Record<string, BusinessProblemArea> = {
  sales: {
    id: "sales",
    title: "1. Sales & Inbound Leads",
    icon: "⚡",
    theme: "#38bdf8",
    problems: [
      "Eliminates missed leads and slow response times (instant < 60s qualification)",
      "Standardizes lead qualification criteria without repetitive manual forms",
      "Stops pipeline stagnation and cold prospect neglect with automated multi-turn follow-ups",
      "Handles common buyer objections and pricing tier clarifications 24/7",
      "Auto-captures contact records before routing qualified deals to human account executives",
    ],
    optimalSetup: {
      recommendedInputs: [
        "Product/Service pricing tiers & qualification questions (budget, timeline, team size)",
        "Sales executive calendar booking link or escalation email",
        "Top 5 buyer objection responses & competitive advantages",
      ],
      recommendedConnectors: ["HubSpot", "Google Calendar", "Slack / Teams"],
      operatingRules: [
        "Never invent custom discounting or quote unlisted prices without manager confirmation",
        "Immediately route enterprise requests over budget threshold to sales team",
      ],
    },
  },
  enquiries: {
    id: "enquiries",
    title: "2. Customer Enquiries & Front Desk",
    icon: "💬",
    theme: "#3dd6c6",
    problems: [
      "Resolves inbox chaos and repetitive questions across WhatsApp, Web, and SMS",
      "Eliminates after-hours enquiry misses and multi-hour response delays",
      "Provides consistent, verified business answers without staff fatigue",
      "Triages enquiry urgency and routes sensitive tickets with pre-filled context summaries",
      "Offers instant multilingual translation for regional and international customers",
    ],
    optimalSetup: {
      recommendedInputs: [
        "Official business hours, location details & holiday schedules",
        "Core service/product FAQs and standard operating policies",
        "Emergency phone number & supervisor escalation queue",
      ],
      recommendedConnectors: ["Email (SMTP)", "WhatsApp", "Zendesk"],
      operatingRules: [
        "Always confirm caller details before initiating ticket submissions",
        "Immediately direct critical or medical emergencies to regional emergency dispatch",
      ],
    },
  },
  education: {
    id: "education",
    title: "3. Course Advisory & Admissions",
    icon: "🎓",
    theme: "#818cf8",
    problems: [
      "Eliminates prospect confusion over course prerequisites, eligibility, and program duration",
      "Matches prospective students to career-ready diplomas, degrees, or bootcamps based on interests",
      "Clarifies tuition fees, payment schedules, installment plans, and deposit requirements",
      "Prevents student drop-off between inquiry and formal admissions registration",
      "Triages funding, transfer credit, and RPL inquiries directly to admissions officers",
    ],
    optimalSetup: {
      recommendedInputs: [
        "Program catalog (fields of study, durations, entry criteria like High School/GED, tuition)",
        "Intake dates (e.g. February / July semester starts) and application deadlines",
        "Admissions office contact info and financial aid escalation guidelines",
      ],
      recommendedConnectors: ["HubSpot / Slate CRM", "Google Calendar", "Email / SMS"],
      operatingRules: [
        "Clearly state that registering interest is not formal enrollment and does not guarantee a seat",
        "Never approve scholarships, tuition discounts, or credit transfers without admissions sign-off",
      ],
    },
  },
  bookings: {
    id: "bookings",
    title: "4. Bookings & Scheduling",
    icon: "📅",
    theme: "#a78bfa",
    problems: [
      "Stops appointment no-shows and last-minute cancellation losses with automated reminders",
      "Eliminates reschedule chaos, slot friction, and double-booking calendar clashes",
      "Conducts intake prep qualification prior to securing appointment slots",
      "Automates waitlist notifications and filled slot reallocation",
      "Provides seamless time-zone conversion for cross-border consultations",
    ],
    optimalSetup: {
      recommendedInputs: [
        "Appointment slot duration (e.g., 30m / 60m) & required buffer time",
        "Intake questions (name, contact, primary service required)",
        "Cancellation and deposit policy guidelines",
      ],
      recommendedConnectors: ["Google Calendar", "Microsoft 365 Calendar", "Calendly"],
      operatingRules: [
        "Read back time, date, and service details to secure client confirmation prior to writing calendar events",
        "Never double-book overlapping calendar events",
      ],
    },
  },
  onboarding: {
    id: "onboarding",
    title: "5. Customer Onboarding & Intake",
    icon: "📋",
    theme: "#34d399",
    problems: [
      "Accelerates slow client onboarding pipelines and missing document delays",
      "Guides new users through structured checklists and registration requirements",
      "Removes welcome friction by delivering instant orientation and next-step guides",
      "Collects required compliance details (KYC/FICA/CIP references) before kickoff",
      "Prevents manual onboarding follow-up overload for operations staff",
    ],
    optimalSetup: {
      recommendedInputs: [
        "Document intake checklist (e.g. proof of ID, utility bill, formation docs)",
        "Step-by-step kickoff timeline & next-step roadmap",
        "Onboarding coordinator escalation contact",
      ],
      recommendedConnectors: ["HubSpot", "Google Drive / OneDrive", "Slack"],
      operatingRules: [
        "Enforce strict data privacy (GDPR / CCPA) — redact and handle identifiers confidentially",
        "Do not issue final service activation approvals until human compliance review completes",
      ],
    },
  },
  operations: {
    id: "operations",
    title: "6. Operations & Dispatch",
    icon: "⚙️",
    theme: "#f59e0b",
    problems: [
      "Stops internal task handoff friction and job dispatch communication gaps",
      "Provides real-time job status updates and incident report summaries",
      "Coordinates mobile technician and delivery driver dispatch schedules",
      "Automates maintenance reminder logging and checklist completion tracking",
      "Bridges siloed communication between front-line operators and headquarters",
    ],
    optimalSetup: {
      recommendedInputs: [
        "Service dispatch territory boundaries & operating shifts",
        "Standard task handover checklists and incident severity levels",
        "Manager-on-duty contact details",
      ],
      recommendedConnectors: ["Slack", "Microsoft Teams", "Webhook / MCP Server"],
      operatingRules: [
        "Require user confirmation before dispatching field technicians or writing work orders",
        "Never overwrite active work tickets without logging previous revision histories",
      ],
    },
  },
  finance: {
    id: "finance",
    title: "7. Finance & Cashflow",
    icon: "💳",
    theme: "#10b981",
    problems: [
      "Reduces late invoice follow-up drag and overdue payment chasing friction",
      "Guides customers to approved instant settlement rails (PayID, SEPA, Stripe, ACH, Ozow)",
      "Clarifies billing breakdowns, subscription tiers, and invoice line items",
      "Eliminates tax deadline confusion (Form 1040, 941, VAT/Sales Tax, Provisional Tax)",
      "Protects payment security by strictly refusing credit card numbers in plaintext chat",
    ],
    optimalSetup: {
      recommendedInputs: [
        "Standard invoice payment terms (Net 30, due dates, late policy)",
        "Supported regional payment rails & official remittance portal URL",
        "General filing calendars and compliance deadlines",
      ],
      recommendedConnectors: ["Xero", "QuickBooks", "Stripe"],
      operatingRules: [
        "Strict PCI-DSS compliance: NEVER accept or store credit card numbers, CVVs, or bank PINs in chat",
        "Never invent balances or calculate unauthorized settlement discounts",
      ],
    },
  },
  support: {
    id: "support",
    title: "8. Support & Ticket Triage",
    icon: "🛠️",
    theme: "#ec4899",
    problems: [
      "Relieves ticket queue overload and repetitive FAQ response drag",
      "Eliminates service status confusion during outages or maintenance windows",
      "Gathers structured diagnostic context (error messages, account IDs, browser/OS)",
      "Reduces refund and escalation bottlenecks with clear tier-1 criteria",
      "Monitors CSAT resolution satisfaction and schedules automated follow-up check-ins",
    ],
    optimalSetup: {
      recommendedInputs: [
        "Tier-1 troubleshooting steps for top 10 reported technical issues",
        "System status page URL & scheduled maintenance windows",
        "Refund and service warranty guidelines",
      ],
      recommendedConnectors: ["Zendesk", "Jira Service Management", "Slack"],
      operatingRules: [
        "Always verify user account ownership before releasing sensitive account diagnostics",
        "Escalate unresolved technical issues to engineering on-call if severity is high",
      ],
    },
  },
  compliance: {
    id: "compliance",
    title: "9. Compliance, Risk & Governance",
    icon: "🛡️",
    theme: "#6366f1",
    problems: [
      "Stops document expiry misses and regulatory filing deadline penalties",
      "Enforces standardized consent collection and audit trail verification",
      "Eliminates confusion across jurisdictional privacy standards (GDPR, POPIA, CCPA)",
      "Maintains zero-retention privacy boundaries for sensitive customer data",
      "Logs incident summaries and coordinates structured compliance reporting",
    ],
    optimalSetup: {
      recommendedInputs: [
        "Applicable statutory compliance frameworks and audit schedules",
        "Data protection officer (DPO) escalation contact",
        "Privacy policy terms & consumer rights summary (access, erasure)",
      ],
      recommendedConnectors: ["Audit Log Sink", "Slack / Teams", "Secure Webhook"],
      operatingRules: [
        "Enforce strict confirm-before-write policy on all data mutations",
        "Never bypass compliance boundaries or render binding legal opinions",
      ],
    },
  },
  developer: {
    id: "developer",
    title: "10. Developer & Technical Operations",
    icon: "💻",
    theme: "#06b6d4",
    problems: [
      "Answers developer engineering questions grounded in verified repo documentation",
      "Explains API endpoints, authentication schemes, schemas, and rate limits",
      "Diagnoses common SDK and integration errors with reproducible code snippets",
      "Assists engineers in constructing valid queries, prompts, and schema structures",
      "Provides 24/7 technical documentation assistance without interrupting core devs",
    ],
    optimalSetup: {
      recommendedInputs: [
        "API reference documentation, OpenAPI/Swagger specs, or Markdown docs",
        "Authentication guidelines (bearer tokens, API keys, OAuth flows)",
        "Common error codes & SDK troubleshooting guide",
      ],
      recommendedConnectors: ["GitHub / GitLab", "MCP Server", "Slack"],
      operatingRules: [
        "Ground all answers in repo docs — never invent non-existent endpoints or libraries",
        "Do not execute arbitrary code or commit changes directly to production branches",
      ],
    },
  },
};

/**
 * Maps any agent category or family id to its exact business problem cluster.
 */
export function resolveProblemArea(category: string, familyId: string, name?: string): BusinessProblemArea {
  const cat = (category || "").toLowerCase();
  const fam = (familyId || "").toLowerCase();
  const nm = (name || "").toLowerCase();
  const all = `${cat} ${fam} ${nm}`;

  // 1. Course Advisory & Education (check first so course-advisor doesn't get swept into generic onboarding)
  if (/course|curriculum|student|admission|advisor|college|university|education|degree|bootcamp|school|tuition/.test(all) && !/onboarding-buddy/.test(fam)) {
    return BUSINESS_PROBLEM_MAP.education;
  }

  // 2. Developer & Technical Operations
  if (/coding|developer|engineer|devops|qa-testing|documentation-assistant|prompt-engineering|api-assistant/.test(all)) {
    return BUSINESS_PROBLEM_MAP.developer;
  }

  // 3. Finance & Cashflow
  if (/finance|tax|accounting|bookkeeping|invoice|debt|billing|credit|banking|remittance|mortgage|wealth|investment/.test(all)) {
    return BUSINESS_PROBLEM_MAP.finance;
  }

  // 4. Compliance, Risk & Governance
  if (/compliance|governance|policy|audit|legal|contract-review|fraud|regulatory|cybersecurity|security-incident/.test(all)) {
    return BUSINESS_PROBLEM_MAP.compliance;
  }

  // 5. Bookings & Scheduling
  if (/booking|calendar|appointment|schedule|event|hotel|venue|concierge|salon|clinic|dental|tour/.test(all)) {
    return BUSINESS_PROBLEM_MAP.bookings;
  }

  // 6. Sales & Inbound Leads
  if (/sales|lead|pipeline|growth|crm|commercial|outbound|qualifier|agency/.test(all)) {
    return BUSINESS_PROBLEM_MAP.sales;
  }

  // 7. Customer Onboarding & Intake (specifically for employee/client onboarding and admissions document intake)
  if (/onboard|hr|recruitment|talent|learning-development|performance-reviews/.test(all)) {
    return BUSINESS_PROBLEM_MAP.onboarding;
  }

  // 8. Operations & Dispatch
  if (/operation|logistics|fleet|warehouse|delivery|facility|driver|trades|home-services|energy-operations|maintenance/.test(all)) {
    return BUSINESS_PROBLEM_MAP.operations;
  }

  // 9. Support & Ticket Triage
  if (/support|helpdesk|it-help|service-desk|complaint|repair|telecom|fibre|network-fault/.test(all)) {
    return BUSINESS_PROBLEM_MAP.support;
  }

  // Default to Customer Enquiries & Front Desk
  return BUSINESS_PROBLEM_MAP.enquiries;
}

/**
 * Convenient alias taking agentId, optional agentName, and optional agentCategory.
 */
export function getBusinessProblemForAgent(
  agentId: string,
  agentName?: string,
  agentCategory?: string
): BusinessProblemArea {
  return resolveProblemArea(agentCategory ?? "", agentId, agentName);
}

/**
 * Strips internal test harness tokens (eval groundings, mock anchor phrases) from user-facing knowledge bases.
 */
export function cleanKnowledgeBase(rawKnowledge: string): string {
  if (!rawKnowledge) return "";

  let cleaned = rawKnowledge;

  // 1. Cut off ## Grounded facts (evals) and ## Behavioral grounding sections
  cleaned = cleaned.replace(/\n##\s+(?:Grounded facts|Behavioral grounding|Eval grounding)[\s\S]*?(?=\n##\s+[^\n]+|\s*$)/gi, "\n");

  // 2. Remove any lingering "- Grounded operational reference: ..." lines
  cleaned = cleaned.replace(/^[ \t]*[-*•]\s+Grounded operational reference:[^\n]*\n?/gim, "");

  // 3. Remove standalone test anchor bullets like "- Reference documents, filing deadlines..."
  cleaned = cleaned.replace(/^[ \t]*[-*•]\s+Reference documents, filing deadlines[^\n]*\n?/gim, "");
  cleaned = cleaned.replace(/^[ \t]*[-*•]\s+All actions require confirmation before execution\.\n?/gim, "");

  // 4. Collapse consecutive empty newlines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  return cleaned;
}
