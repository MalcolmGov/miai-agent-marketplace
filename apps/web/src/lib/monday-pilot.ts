/**
 * All 55 production families (US heroes at Depth strong).
 * Full catalogue = 70 × 5 market packs = 500 agents under the annual license.
 * Catalogue "Production ready" filter = these families; Wave 3 localizes eu/africa/asia packs.
 */

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
] as const;


export type MondayPilotId = (typeof MONDAY_PILOT_FAMILY_IDS)[number];

export function isMondayPilotFamilyId(familyOrAgentId: string): boolean {
  const lower = familyOrAgentId.toLowerCase();
  return MONDAY_PILOT_FAMILY_IDS.some(
    (id) => lower === id || lower.includes(id) || lower.endsWith(`-${id}`),
  );
}

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
      "Platform license = all 500. First-wave Production 18 are the go-live families we stand behind.",
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
