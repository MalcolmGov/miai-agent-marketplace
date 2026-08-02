/**
 * Go-live stand-behind shortlist + demo pack.
 *
 * - License entitlement = full catalogue (100 × 5 = 500).
 * - GO_LIVE_100 = all Depth-strong families we stand behind for customer production.
 * - GO_LIVE_18 = featured demo / Cluster A–C subset.
 * - GO_LIVE_55 = prior stand-behind wave (subset of 100).
 * Catalogue `pilot=1` filter uses GO_LIVE_100 (= MONDAY_PILOT_FAMILY_IDS).
 */

export const GO_LIVE_18_FAMILY_IDS = [
  "executive-assistant",
  "it-helpdesk",
  "dental-front-desk",
  "hotel-guest",
  "sales-qualifier",
  "home-services",
  "restaurant-takeaway",
  "salon-booking",
  "clinic-front-desk",
  "customer-support",
  "delivery-tracking",
  "trades-receptionist",
  "events-venue",
  "onboarding-buddy",
  "accounting-practice",
  "building-management",
  "gym-membership",
  "pharmacy",
] as const;

/** Stand-behind list (= GO_LIVE_100). Kept as MONDAY_PILOT_* for filter/helpers. */
export const MONDAY_PILOT_FAMILY_IDS = [
  "accounting-practice",
  "admissions",
  "agency-studio",
  "bank-branch",
  "bookkeeping",
  "building-management",
  "clinic-front-desk",
  "course-advisor",
  "customer-support",
  "delivery-tracking",
  "dental-front-desk",
  "dental-practice",
  "events-venue",
  "executive-assistant",
  "field-service",
  "fleet-driver",
  "front-desk",
  "grant-stock-planner",
  "gym-membership",
  "home-services",
  "hotel-concierge",
  "hotel-guest",
  "hr-helpdesk",
  "insurance-broker",
  "insurance-claims",
  "it-helpdesk",
  "law-firm-intake",
  "loan-prequalifier",
  "loyalty-rewards",
  "marketing-assistant",
  "mobile-money",
  "onboarding-buddy",
  "order-tracking",
  "payment-disputes",
  "payroll-queries",
  "pharmacy",
  "policy-compliance",
  "procurement",
  "product-finder",
  "property-enquiries",
  "remittance",
  "rental-enquiries",
  "restaurant-takeaway",
  "returns-exchanges",
  "sales-qualifier",
  "salon-booking",
  "spaza-merchant",
  "stock-availability",
  "student-helpdesk",
  "tour-activity",
  "trades-receptionist",
  "travel-desk",
  "utility-billing",
  "vas-concierge",
  "veterinary",
  // Wave expand → Go-live 100
  "agri-advisory",
  "ai-coding-assistant",
  "airtime-bundles",
  "bi-analyst",
  "case-management",
  "citizen-services",
  "contract-review",
  "credit-cards",
  "cybersecurity-desk",
  "data-quality",
  "device-upgrades",
  "devops-assistant",
  "documentation-assistant",
  "energy-operations",
  "enterprise-connectivity",
  "executive-dashboards",
  "factory-operations",
  "farm-operations",
  "fibre-support",
  "financial-reporting",
  "fraud-investigations",
  "interview-scheduling",
  "investment-advisor",
  "learning-development",
  "legal-research",
  "licensing",
  "maintenance-desk",
  "media-content-desk",
  "mortgage-advisor",
  "municipality-desk",
  "network-faults",
  "passport-visa",
  "performance-reviews",
  "production-planning",
  "prompt-engineering",
  "qa-testing",
  "quality-assurance",
  "recruitment",
  "sales-forecasting",
  "security-incident",
  "sim-registration",
  "social-services",
  "tax-office",
  "warehouse-operations",
  "wealth-management",
] as const;

/** Prior stand-behind wave (18 featured + 37). */
export const GO_LIVE_55_FAMILY_IDS = [
  "accounting-practice",
  "admissions",
  "agency-studio",
  "bank-branch",
  "bookkeeping",
  "building-management",
  "clinic-front-desk",
  "course-advisor",
  "customer-support",
  "delivery-tracking",
  "dental-front-desk",
  "dental-practice",
  "events-venue",
  "executive-assistant",
  "field-service",
  "fleet-driver",
  "front-desk",
  "grant-stock-planner",
  "gym-membership",
  "home-services",
  "hotel-concierge",
  "hotel-guest",
  "hr-helpdesk",
  "insurance-broker",
  "insurance-claims",
  "it-helpdesk",
  "law-firm-intake",
  "loan-prequalifier",
  "loyalty-rewards",
  "marketing-assistant",
  "mobile-money",
  "onboarding-buddy",
  "order-tracking",
  "payment-disputes",
  "payroll-queries",
  "pharmacy",
  "policy-compliance",
  "procurement",
  "product-finder",
  "property-enquiries",
  "remittance",
  "rental-enquiries",
  "restaurant-takeaway",
  "returns-exchanges",
  "sales-qualifier",
  "salon-booking",
  "spaza-merchant",
  "stock-availability",
  "student-helpdesk",
  "tour-activity",
  "trades-receptionist",
  "travel-desk",
  "utility-billing",
  "vas-concierge",
  "veterinary",
] as const;

/** Full stand-behind = all catalogue families (100). */
export const GO_LIVE_100_FAMILY_IDS = MONDAY_PILOT_FAMILY_IDS;


export type MondayPilotId = (typeof MONDAY_PILOT_FAMILY_IDS)[number];
export type GoLive18Id = (typeof GO_LIVE_18_FAMILY_IDS)[number];
export type GoLive55Id = (typeof GO_LIVE_55_FAMILY_IDS)[number];
export type GoLive100Id = MondayPilotId;

export function isMondayPilotFamilyId(familyOrAgentId: string): boolean {
  const lower = familyOrAgentId.toLowerCase();
  return MONDAY_PILOT_FAMILY_IDS.some(
    (id) => lower === id || lower.includes(id) || lower.endsWith(`-${id}`),
  );
}

export function isGoLive55FamilyId(familyOrAgentId: string): boolean {
  const lower = familyOrAgentId.toLowerCase();
  return GO_LIVE_55_FAMILY_IDS.some(
    (id) => lower === id || lower.includes(id) || lower.endsWith(`-${id}`),
  );
}

export function isGoLive100FamilyId(familyOrAgentId: string): boolean {
  return isMondayPilotFamilyId(familyOrAgentId);
}

export function isGoLive18FamilyId(familyOrAgentId: string): boolean {
  const lower = familyOrAgentId.toLowerCase();
  return GO_LIVE_18_FAMILY_IDS.some(
    (id) => lower === id || lower.includes(id) || lower.endsWith(`-${id}`),
  );
}

/** Featured Cluster A–C cards with demo prompts (18). */
export const MONDAY_PILOT_CARDS: Array<{
  id: MondayPilotId;
  name: string;
  audience: "internal" | "customer";
  blurb: string;
  demoAgentId: string;
  prompt: string;
}> = [
  {
    id: "executive-assistant",
    name: "Executive Assistant",
    audience: "internal",
    blurb: "Calendar check → confirm → schedule + remind + notify.",
    demoAgentId: "us-executive-assistant",
    prompt: "Schedule a 30-min budget review tomorrow at 14:00 and set a reminder.",
  },
  {
    id: "it-helpdesk",
    name: "IT Helpdesk",
    audience: "internal",
    blurb: "KB how-to → ticket → escalate when stuck.",
    demoAgentId: "us-it-helpdesk",
    prompt: "I can't connect to VPN from home — walk me through it.",
  },
  {
    id: "dental-front-desk",
    name: "Dental Front Desk",
    audience: "customer",
    blurb: "Fees & treatments → book visit → clinical handoff.",
    demoAgentId: "us-dental-front-desk",
    prompt: "I'd like to book a cleaning next week, preferably Tuesday morning.",
  },
  {
    id: "hotel-guest",
    name: "Hotel Guest Concierge",
    audience: "customer",
    blurb: "Amenities + local tips → log guest request with confirm.",
    demoAgentId: "us-hotel-guest",
    prompt: "Can I get extra towels and a late check-out tomorrow?",
  },
  {
    id: "sales-qualifier",
    name: "Sales Qualifier",
    audience: "customer",
    blurb: "Qualify → capture lead → book callback.",
    demoAgentId: "us-sales-qualifier",
    prompt: "We're a 40-person clinic looking at inbound WhatsApp lead capture.",
  },
  {
    id: "home-services",
    name: "Home Services Front Desk",
    audience: "customer",
    blurb: "Availability → book job → notify dispatch.",
    demoAgentId: "us-home-services",
    prompt: "I need a plumber for a leaking geyser tomorrow afternoon.",
  },
  {
    id: "restaurant-takeaway",
    name: "Restaurant & Takeaway",
    audience: "customer",
    blurb: "Menu & hours → takeaway order → confirm pickup.",
    demoAgentId: "us-restaurant-takeaway",
    prompt: "I'd like to order two burgers for pickup in 30 minutes.",
  },
  {
    id: "salon-booking",
    name: "Salon Booking",
    audience: "customer",
    blurb: "Services & prices → book stylist → confirm appointment.",
    demoAgentId: "us-salon-booking",
    prompt: "Book a women's haircut Saturday morning if possible.",
  },
  {
    id: "clinic-front-desk",
    name: "Clinic Front Desk",
    audience: "customer",
    blurb: "Hours & prep → book visit → clinical handoff.",
    demoAgentId: "us-clinic-front-desk",
    prompt: "I need a same-week GP appointment for a persistent cough.",
  },
  {
    id: "customer-support",
    name: "Customer Support",
    audience: "customer",
    blurb: "Policy answers → order help → escalate with transcript.",
    demoAgentId: "us-customer-support",
    prompt: "My order hasn't arrived and tracking hasn't updated in 3 days.",
  },
  {
    id: "delivery-tracking",
    name: "Delivery Tracking",
    audience: "customer",
    blurb: "Status lookup → ETA → exception handoff.",
    demoAgentId: "us-delivery-tracking",
    prompt: "Where is parcel TRK-48291 and when will it arrive?",
  },
  {
    id: "trades-receptionist",
    name: "Trades Receptionist",
    audience: "customer",
    blurb: "Quote intake → book site visit → notify the crew.",
    demoAgentId: "us-trades-receptionist",
    prompt: "We need a sparky to replace a faulty DB board this week.",
  },
  {
    id: "events-venue",
    name: "Events Venue",
    audience: "customer",
    blurb: "Capacity & packages → hold date → confirm booking.",
    demoAgentId: "us-events-venue",
    prompt: "Do you have space for 120 guests on a Saturday in October?",
  },
  {
    id: "onboarding-buddy",
    name: "Onboarding Buddy",
    audience: "internal",
    blurb: "Day-1 checklist → tools access → escalate to HR/IT.",
    demoAgentId: "us-onboarding-buddy",
    prompt: "It's my first day — what do I need to set up before standup?",
  },
  {
    id: "accounting-practice",
    name: "Accounting Practice",
    audience: "customer",
    blurb: "Deadlines & docs → book consult → secure handoff.",
    demoAgentId: "us-accounting-practice",
    prompt: "When are Q3 estimated taxes due and what should I bring?",
  },
  {
    id: "building-management",
    name: "Building Management",
    audience: "customer",
    blurb: "Levies & access → log maintenance → emergency escalate.",
    demoAgentId: "us-building-management",
    prompt: "There's a water leak in the parking level — who do I contact?",
  },
  {
    id: "gym-membership",
    name: "Gym Membership",
    audience: "customer",
    blurb: "Plans & hours → start membership → book induction.",
    demoAgentId: "us-gym-membership",
    prompt: "What does the monthly plan cost and can I book an induction?",
  },
  {
    id: "pharmacy",
    name: "Pharmacy Assistant",
    audience: "customer",
    blurb: "Hours & OTC → prescription pickup → clinical handoff.",
    demoAgentId: "us-pharmacy",
    prompt: "What are your hours and can I reserve a flu shot this week?",
  },
];

/** Remaining Go-live 55 families (beyond featured 18) — catalogue stand-behind, compact list. */
export const GO_LIVE_55_MORE: Array<{
  id: GoLive55Id;
  name: string;
  audience: "internal" | "customer";
  demoAgentId: string;
}> = [
  { id: "admissions", name: "Admissions Assistant", audience: "customer", demoAgentId: "us-admissions" },
  { id: "agency-studio", name: "Agency & Studio", audience: "internal", demoAgentId: "us-agency-studio" },
  { id: "bank-branch", name: "Bank Branch Assistant", audience: "customer", demoAgentId: "us-bank-branch" },
  { id: "bookkeeping", name: "Bookkeeping Assistant", audience: "internal", demoAgentId: "us-bookkeeping" },
  { id: "course-advisor", name: "Course Advisor", audience: "customer", demoAgentId: "us-course-advisor" },
  { id: "dental-practice", name: "Dental Practice", audience: "customer", demoAgentId: "us-dental-practice" },
  { id: "field-service", name: "Field Service Dispatch", audience: "internal", demoAgentId: "us-field-service" },
  { id: "fleet-driver", name: "Fleet & Driver Desk", audience: "internal", demoAgentId: "us-fleet-driver" },
  { id: "front-desk", name: "Front Desk / Reception", audience: "customer", demoAgentId: "us-front-desk" },
  { id: "grant-stock-planner", name: "Grant-Day Stock Planner", audience: "internal", demoAgentId: "us-grant-stock-planner" },
  { id: "hotel-concierge", name: "Hotel Concierge", audience: "customer", demoAgentId: "us-hotel-concierge" },
  { id: "hr-helpdesk", name: "HR Helpdesk", audience: "internal", demoAgentId: "us-hr-helpdesk" },
  { id: "insurance-broker", name: "Insurance Broker", audience: "customer", demoAgentId: "us-insurance-broker" },
  { id: "insurance-claims", name: "Insurance Claims Helper", audience: "customer", demoAgentId: "us-insurance-claims" },
  { id: "law-firm-intake", name: "Law Firm Intake", audience: "customer", demoAgentId: "us-law-firm-intake" },
  { id: "loan-prequalifier", name: "Loan Pre-Qualifier", audience: "customer", demoAgentId: "us-loan-prequalifier" },
  { id: "loyalty-rewards", name: "Loyalty & Rewards", audience: "customer", demoAgentId: "us-loyalty-rewards" },
  { id: "marketing-assistant", name: "Marketing Assistant", audience: "internal", demoAgentId: "us-marketing-assistant" },
  { id: "mobile-money", name: "Mobile Money Desk", audience: "customer", demoAgentId: "us-mobile-money" },
  { id: "order-tracking", name: "Order Tracking", audience: "customer", demoAgentId: "us-order-tracking" },
  { id: "payment-disputes", name: "Card & Payment Disputes", audience: "customer", demoAgentId: "us-payment-disputes" },
  { id: "payroll-queries", name: "Payroll Queries", audience: "internal", demoAgentId: "us-payroll-queries" },
  { id: "policy-compliance", name: "Policy & Compliance", audience: "internal", demoAgentId: "us-policy-compliance" },
  { id: "procurement", name: "Procurement Desk", audience: "internal", demoAgentId: "us-procurement" },
  { id: "product-finder", name: "Product Finder", audience: "customer", demoAgentId: "us-product-finder" },
  { id: "property-enquiries", name: "Property Enquiries", audience: "customer", demoAgentId: "us-property-enquiries" },
  { id: "remittance", name: "Remittance Helper", audience: "customer", demoAgentId: "us-remittance" },
  { id: "rental-enquiries", name: "Rental Enquiries", audience: "customer", demoAgentId: "us-rental-enquiries" },
  { id: "returns-exchanges", name: "Returns & Exchanges", audience: "customer", demoAgentId: "us-returns-exchanges" },
  { id: "spaza-merchant", name: "Corner Store Merchant", audience: "customer", demoAgentId: "us-spaza-merchant" },
  { id: "stock-availability", name: "Stock & Availability", audience: "customer", demoAgentId: "us-stock-availability" },
  { id: "student-helpdesk", name: "Student Helpdesk", audience: "customer", demoAgentId: "us-student-helpdesk" },
  { id: "tour-activity", name: "Tour & Activity Desk", audience: "customer", demoAgentId: "us-tour-activity" },
  { id: "travel-desk", name: "Travel Desk", audience: "customer", demoAgentId: "us-travel-desk" },
  { id: "utility-billing", name: "Utility & Billing", audience: "customer", demoAgentId: "us-utility-billing" },
  { id: "vas-concierge", name: "Gift Card & VAS Concierge", audience: "customer", demoAgentId: "us-vas-concierge" },
  { id: "veterinary", name: "Veterinary Front Desk", audience: "customer", demoAgentId: "us-veterinary" },
];

/** Remaining Go-live 100 families (beyond Go-live 55). */
export const GO_LIVE_100_MORE: Array<{
  id: GoLive100Id;
  name: string;
  audience: "internal" | "customer";
  demoAgentId: string;
}> = [
  { id: "agri-advisory", name: "Agri Advisory Desk", audience: "customer", demoAgentId: "us-agri-advisory" },
  { id: "ai-coding-assistant", name: "AI Coding Assistant", audience: "internal", demoAgentId: "us-ai-coding-assistant" },
  { id: "airtime-bundles", name: "Airtime & Bundles", audience: "customer", demoAgentId: "us-airtime-bundles" },
  { id: "bi-analyst", name: "BI Analyst Assistant", audience: "internal", demoAgentId: "us-bi-analyst" },
  { id: "case-management", name: "Legal Case Management", audience: "customer", demoAgentId: "us-case-management" },
  { id: "citizen-services", name: "Citizen Services", audience: "customer", demoAgentId: "us-citizen-services" },
  { id: "contract-review", name: "Contract Review Intake", audience: "customer", demoAgentId: "us-contract-review" },
  { id: "credit-cards", name: "Credit Card Desk", audience: "customer", demoAgentId: "us-credit-cards" },
  { id: "cybersecurity-desk", name: "Cybersecurity Desk", audience: "internal", demoAgentId: "us-cybersecurity-desk" },
  { id: "data-quality", name: "Data Quality Desk", audience: "internal", demoAgentId: "us-data-quality" },
  { id: "device-upgrades", name: "Device Upgrades", audience: "customer", demoAgentId: "us-device-upgrades" },
  { id: "devops-assistant", name: "DevOps Assistant", audience: "internal", demoAgentId: "us-devops-assistant" },
  { id: "documentation-assistant", name: "Documentation Assistant", audience: "internal", demoAgentId: "us-documentation-assistant" },
  { id: "energy-operations", name: "Energy Operations Desk", audience: "customer", demoAgentId: "us-energy-operations" },
  { id: "enterprise-connectivity", name: "Enterprise Connectivity", audience: "customer", demoAgentId: "us-enterprise-connectivity" },
  { id: "executive-dashboards", name: "Executive Dashboards", audience: "internal", demoAgentId: "us-executive-dashboards" },
  { id: "factory-operations", name: "Factory Operations", audience: "internal", demoAgentId: "us-factory-operations" },
  { id: "farm-operations", name: "Farm Operations Desk", audience: "customer", demoAgentId: "us-farm-operations" },
  { id: "fibre-support", name: "Fibre Support", audience: "customer", demoAgentId: "us-fibre-support" },
  { id: "financial-reporting", name: "Financial Reporting Desk", audience: "internal", demoAgentId: "us-financial-reporting" },
  { id: "fraud-investigations", name: "Fraud Investigations Desk", audience: "customer", demoAgentId: "us-fraud-investigations" },
  { id: "interview-scheduling", name: "Interview Scheduling", audience: "internal", demoAgentId: "us-interview-scheduling" },
  { id: "investment-advisor", name: "Investment Advisor Intake", audience: "customer", demoAgentId: "us-investment-advisor" },
  { id: "learning-development", name: "Learning & Development", audience: "internal", demoAgentId: "us-learning-development" },
  { id: "legal-research", name: "Legal Research Intake", audience: "customer", demoAgentId: "us-legal-research" },
  { id: "licensing", name: "Licensing Desk", audience: "customer", demoAgentId: "us-licensing" },
  { id: "maintenance-desk", name: "Maintenance Desk", audience: "internal", demoAgentId: "us-maintenance-desk" },
  { id: "media-content-desk", name: "Media Content Desk", audience: "customer", demoAgentId: "us-media-content-desk" },
  { id: "mortgage-advisor", name: "Mortgage Advisor", audience: "customer", demoAgentId: "us-mortgage-advisor" },
  { id: "municipality-desk", name: "Municipality Desk", audience: "customer", demoAgentId: "us-municipality-desk" },
  { id: "network-faults", name: "Network Fault Desk", audience: "customer", demoAgentId: "us-network-faults" },
  { id: "passport-visa", name: "Passport & Visa Desk", audience: "customer", demoAgentId: "us-passport-visa" },
  { id: "performance-reviews", name: "Performance Reviews Desk", audience: "internal", demoAgentId: "us-performance-reviews" },
  { id: "production-planning", name: "Production Planning", audience: "internal", demoAgentId: "us-production-planning" },
  { id: "prompt-engineering", name: "Prompt Engineering Desk", audience: "internal", demoAgentId: "us-prompt-engineering" },
  { id: "qa-testing", name: "QA Testing Assistant", audience: "internal", demoAgentId: "us-qa-testing" },
  { id: "quality-assurance", name: "Quality Assurance Desk", audience: "internal", demoAgentId: "us-quality-assurance" },
  { id: "recruitment", name: "Recruitment Assistant", audience: "internal", demoAgentId: "us-recruitment" },
  { id: "sales-forecasting", name: "Sales Forecasting Desk", audience: "internal", demoAgentId: "us-sales-forecasting" },
  { id: "security-incident", name: "Security Incident Desk", audience: "internal", demoAgentId: "us-security-incident" },
  { id: "sim-registration", name: "SIM Registration", audience: "customer", demoAgentId: "us-sim-registration" },
  { id: "social-services", name: "Social Services Desk", audience: "customer", demoAgentId: "us-social-services" },
  { id: "tax-office", name: "Tax Office Assistant", audience: "customer", demoAgentId: "us-tax-office" },
  { id: "warehouse-operations", name: "Warehouse Operations", audience: "internal", demoAgentId: "us-warehouse-operations" },
  { id: "wealth-management", name: "Wealth Management Desk", audience: "customer", demoAgentId: "us-wealth-management" },
];

export const DEMO_SCRIPT_STEPS: Array<{
  title: string;
  minutes: string;
  detail: string;
  href?: string;
}> = [
  {
    title: "Catalogue & Smart search",
    minutes: "2",
    detail:
      "Platform license = all 500. Go-live 100 are the families we stand behind for customer production (featured 18 for deep demos).",
    href: "/#catalogue",
  },
  {
    title: "Learn more → Rent / setup",
    minutes: "2",
    detail: "Open detail modal, then Rent / setup into Agent Studio.",
    href: "/agents/us-dental-front-desk",
  },
  {
    title: "Multi-step sandbox",
    minutes: "4",
    detail: "Run a confirm-before-write prompt; show tool chips and plan → confirm → act.",
  },
  {
    title: "Actions / Slack",
    minutes: "2",
    detail: "Show connector panel; live Slack if credentials are present.",
  },
  {
    title: "Trust Center",
    minutes: "2",
    detail: "Four pillars with Live / Partial / Planned — under-claim, no fake SOC 2.",
    href: "/trust",
  },
  {
    title: "Admin + Insights + custom request",
    minutes: "3",
    detail: "Live rentals/tokens; submit a custom request and show Admin pipeline.",
    href: "/admin",
  },
];
