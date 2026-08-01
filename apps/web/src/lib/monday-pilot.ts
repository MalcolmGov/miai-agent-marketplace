/**
 * Demo / UAT shortlist (6 of 220).
 * Commercial model: annual platform license covers the full catalogue — this list is for room depth only.
 */

export const MONDAY_PILOT_FAMILY_IDS = [
  "executive-assistant",
  "it-helpdesk",
  "dental-front-desk",
  "hotel-guest",
  "sales-qualifier",
  "home-services",
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
      "Platform story: annual license = all 220. Brand hero, Smart search, optional Demo 6 shortlist.",
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
