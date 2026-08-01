import type { ToolBinding } from "@miai/connectors";
import { GENERATED_PRESETS } from "./generated-presets.js";

export interface AgentPreset {
  agentId: string;
  pilot?: boolean;
  phase: 1 | 2;
  bindings: ToolBinding[];
}

const booking = (calendar: "google_calendar" | "m365_calendar" = "google_calendar"): ToolBinding[] => [
  { tool: "check_availability", connector: calendar },
  { tool: "book_appointment", connector: calendar },
  { tool: "reschedule_or_cancel", connector: calendar },
  { tool: "book_callback", connector: calendar },
  { tool: "book_viewing", connector: calendar },
  { tool: "book_consultation", connector: calendar },
  { tool: "book_table", connector: calendar },
  { tool: "check_table_availability", connector: calendar },
];

const executiveAssistant = (
  calendar: "google_calendar" | "m365_calendar" = "google_calendar",
  handoff: "slack" | "teams" = "slack",
): ToolBinding[] => [
  { tool: "check_calendar", connector: calendar },
  { tool: "schedule_meeting", connector: calendar },
  { tool: "set_reminder", connector: calendar },
  { tool: "notify_team", connector: handoff },
  { tool: "handoff_to_human", connector: handoff },
];

const itHelpdesk = (handoff: "slack" | "teams" = "slack"): ToolBinding[] => [
  { tool: "search_kb", connector: "webhook" },
  { tool: "get_ticket_status", connector: "webhook" },
  { tool: "create_ticket", connector: "hubspot" },
  { tool: "notify_team", connector: handoff },
  { tool: "handoff_to_human", connector: handoff },
];

const salonBooking = (
  calendar: "google_calendar" | "m365_calendar" = "google_calendar",
  handoff: "slack" | "teams" = "slack",
): ToolBinding[] => [
  { tool: "list_services", connector: "webhook" },
  { tool: "check_availability", connector: calendar },
  { tool: "book_appointment", connector: calendar },
  { tool: "reschedule_or_cancel", connector: calendar },
  { tool: "notify_team", connector: handoff },
  { tool: "handoff_to_human", connector: handoff },
];

const tradesBooking = (
  calendar: "google_calendar" | "m365_calendar" = "google_calendar",
  handoff: "slack" | "teams" = "slack",
): ToolBinding[] => [
  { tool: "list_services", connector: "webhook" },
  { tool: "check_availability", connector: calendar },
  { tool: "book_appointment", connector: calendar },
  { tool: "request_estimate", connector: "hubspot" },
  { tool: "notify_team", connector: handoff },
  { tool: "handoff_to_human", connector: handoff },
];

const salesQualifier = (
  calendar: "google_calendar" | "m365_calendar" = "google_calendar",
  handoff: "slack" | "teams" = "slack",
): ToolBinding[] => [
  { tool: "send_info", connector: "webhook" },
  { tool: "capture_lead", connector: "hubspot" },
  { tool: "book_callback", connector: calendar },
  { tool: "notify_team", connector: handoff },
  { tool: "handoff_to_human", connector: handoff },
];

const restaurantTakeaway = (
  calendar: "google_calendar" | "m365_calendar" = "google_calendar",
  handoff: "slack" | "teams" = "slack",
): ToolBinding[] => [
  { tool: "get_menu", connector: "webhook" },
  { tool: "check_table_availability", connector: calendar },
  { tool: "book_table", connector: calendar },
  { tool: "place_order", connector: "webhook" },
  { tool: "notify_team", connector: handoff },
  { tool: "handoff_to_human", connector: handoff },
];

const dentalFrontDesk = (
  calendar: "google_calendar" | "m365_calendar" = "google_calendar",
  handoff: "slack" | "teams" = "slack",
): ToolBinding[] => [
  { tool: "list_services", connector: "webhook" },
  { tool: "get_treatment_info", connector: "webhook" },
  { tool: "check_availability", connector: calendar },
  { tool: "book_appointment", connector: calendar },
  { tool: "notify_team", connector: handoff },
  { tool: "handoff_to_human", connector: handoff },
];

const hotelGuest = (handoff: "slack" | "teams" = "slack"): ToolBinding[] => [
  { tool: "get_amenity_info", connector: "webhook" },
  { tool: "get_local_recommendations", connector: "webhook" },
  { tool: "make_guest_request", connector: "webhook" },
  { tool: "notify_team", connector: handoff },
  { tool: "handoff_to_human", connector: handoff },
];

const onboardingBuddy = (handoff: "slack" | "teams" = "slack"): ToolBinding[] => [
  { tool: "get_onboarding_checklist", connector: "webhook" },
  { tool: "get_resource", connector: "webhook" },
  { tool: "log_question", connector: "hubspot" },
  { tool: "notify_team", connector: handoff },
  { tool: "handoff_to_human", connector: handoff },
];

const supportShopify = (handoff: "slack" | "teams" = "slack"): ToolBinding[] => [
  { tool: "get_order_status", connector: "shopify" },
  { tool: "check_availability", connector: "shopify" },
  { tool: "create_ticket", connector: "hubspot" },
  { tool: "handoff_to_human", connector: handoff },
];

/** Explicit hand overrides — pilots win over generated presets. */
const HAND_OVERRIDES: AgentPreset[] = [
  {
    agentId: "us-customer-support",
    pilot: true,
    phase: 1,
    bindings: supportShopify("slack"),
  },
  {
    agentId: "customer-support",
    pilot: true,
    phase: 1,
    bindings: supportShopify("slack"),
  },
  // Multi-workflow Dental Front Desk — non-clinical book with confirm-before-write
  {
    agentId: "us-dental-front-desk",
    pilot: true,
    phase: 1,
    bindings: dentalFrontDesk("google_calendar", "slack"),
  },
  {
    agentId: "africa-dental-front-desk",
    pilot: true,
    phase: 1,
    bindings: dentalFrontDesk("google_calendar", "slack"),
  },
  {
    agentId: "asia-dental-front-desk",
    pilot: true,
    phase: 1,
    bindings: dentalFrontDesk("google_calendar", "slack"),
  },
  {
    agentId: "eu-dental-front-desk",
    pilot: true,
    phase: 1,
    bindings: dentalFrontDesk("m365_calendar", "teams"),
  },
  {
    agentId: "us-home-services",
    pilot: true,
    phase: 1,
    bindings: tradesBooking("google_calendar", "slack"),
  },
  {
    agentId: "eu-home-services",
    pilot: true,
    phase: 1,
    bindings: tradesBooking("m365_calendar", "teams"),
  },
  {
    agentId: "asia-home-services",
    pilot: true,
    phase: 1,
    bindings: tradesBooking("google_calendar", "slack"),
  },
  {
    agentId: "africa-home-services",
    pilot: true,
    phase: 1,
    bindings: tradesBooking("google_calendar", "slack"),
  },
  {
    agentId: "eu-trades-receptionist",
    pilot: true,
    phase: 1,
    bindings: tradesBooking("m365_calendar", "teams"),
  },
  {
    agentId: "us-trades-receptionist",
    pilot: true,
    phase: 1,
    bindings: tradesBooking("google_calendar", "slack"),
  },
  {
    agentId: "asia-trades-receptionist",
    pilot: true,
    phase: 1,
    bindings: tradesBooking("google_calendar", "slack"),
  },
  {
    agentId: "africa-trades-receptionist",
    pilot: true,
    phase: 1,
    bindings: tradesBooking("google_calendar", "slack"),
  },
  // Multi-workflow Salon & Barber
  {
    agentId: "us-salon-booking",
    pilot: true,
    phase: 1,
    bindings: salonBooking("google_calendar", "slack"),
  },
  {
    agentId: "salon-booking",
    pilot: true,
    phase: 1,
    bindings: salonBooking("google_calendar", "slack"),
  },
  {
    agentId: "asia-salon-booking",
    pilot: true,
    phase: 1,
    bindings: salonBooking("google_calendar", "slack"),
  },
  {
    agentId: "eu-salon-booking",
    pilot: true,
    phase: 1,
    bindings: salonBooking("m365_calendar", "teams"),
  },
  // Multi-workflow Hotel Guest — amenity/local → confirm → guest request
  {
    agentId: "us-hotel-guest",
    pilot: true,
    phase: 1,
    bindings: hotelGuest("slack"),
  },
  {
    agentId: "eu-hotel-guest",
    pilot: true,
    phase: 1,
    bindings: hotelGuest("slack"),
  },
  {
    agentId: "asia-hotel-guest",
    pilot: true,
    phase: 1,
    bindings: hotelGuest("slack"),
  },
  {
    agentId: "africa-hotel-guest",
    pilot: true,
    phase: 1,
    bindings: hotelGuest("slack"),
  },
  {
    agentId: "property-enquiries",
    phase: 2,
    bindings: [
      { tool: "book_viewing", connector: "webhook", config: { template: "property_enquiry" } },
      { tool: "capture_lead", connector: "hubspot" },
      { tool: "handoff_to_human", connector: "slack" },
    ],
  },
  {
    agentId: "hotel-concierge",
    phase: 2,
    bindings: [
      { tool: "make_guest_request", connector: "webhook", config: { template: "hotel_guest_request" } },
      { tool: "handoff_to_human", connector: "slack" },
    ],
  },
  {
    agentId: "insurance-claims",
    phase: 2,
    bindings: [
      { tool: "start_claim", connector: "webhook", config: { template: "insurance_fnol" } },
      { tool: "get_claim_status", connector: "webhook", config: { template: "insurance_fnol" } },
      { tool: "handoff_to_human", connector: "slack" },
    ],
  },
  // Multi-workflow Executive Assistant — calendar + Slack notify
  {
    agentId: "us-executive-assistant",
    pilot: true,
    phase: 1,
    bindings: executiveAssistant("google_calendar", "slack"),
  },
  {
    agentId: "executive-assistant",
    pilot: true,
    phase: 1,
    bindings: executiveAssistant("google_calendar", "slack"),
  },
  {
    agentId: "asia-executive-assistant",
    pilot: true,
    phase: 1,
    bindings: executiveAssistant("google_calendar", "slack"),
  },
  {
    agentId: "eu-executive-assistant",
    pilot: true,
    phase: 1,
    bindings: executiveAssistant("m365_calendar", "teams"),
  },
  // Multi-workflow IT Helpdesk — KB → ticket → Slack
  {
    agentId: "us-it-helpdesk",
    pilot: true,
    phase: 1,
    bindings: itHelpdesk("slack"),
  },
  {
    agentId: "it-helpdesk",
    pilot: true,
    phase: 1,
    bindings: itHelpdesk("slack"),
  },
  {
    agentId: "asia-it-helpdesk",
    pilot: true,
    phase: 1,
    bindings: itHelpdesk("slack"),
  },
  {
    agentId: "eu-it-helpdesk",
    pilot: true,
    phase: 1,
    bindings: itHelpdesk("teams"),
  },
  // Multi-workflow Sales Qualifier — HubSpot lead + calendar callback + Slack notify
  {
    agentId: "us-sales-qualifier",
    pilot: true,
    phase: 1,
    bindings: salesQualifier("google_calendar", "slack"),
  },
  {
    agentId: "sales-qualifier",
    pilot: true,
    phase: 1,
    bindings: salesQualifier("google_calendar", "slack"),
  },
  {
    agentId: "asia-sales-qualifier",
    pilot: true,
    phase: 1,
    bindings: salesQualifier("google_calendar", "slack"),
  },
  {
    agentId: "eu-sales-qualifier",
    pilot: true,
    phase: 1,
    bindings: salesQualifier("m365_calendar", "teams"),
  },
  // Multi-workflow Restaurant & Takeaway — menu → confirm → table/order → notify
  {
    agentId: "us-restaurant-takeaway",
    pilot: true,
    phase: 1,
    bindings: restaurantTakeaway("google_calendar", "slack"),
  },
  {
    agentId: "restaurant-takeaway",
    pilot: true,
    phase: 1,
    bindings: restaurantTakeaway("google_calendar", "slack"),
  },
  {
    agentId: "asia-restaurant-takeaway",
    pilot: true,
    phase: 1,
    bindings: restaurantTakeaway("google_calendar", "slack"),
  },
  {
    agentId: "eu-restaurant-takeaway",
    pilot: true,
    phase: 1,
    bindings: restaurantTakeaway("m365_calendar", "teams"),
  },
  // Multi-workflow Onboarding Buddy — checklist → log → Slack/People
  {
    agentId: "us-onboarding-buddy",
    pilot: true,
    phase: 1,
    bindings: onboardingBuddy("slack"),
  },
  {
    agentId: "onboarding-buddy",
    pilot: true,
    phase: 1,
    bindings: onboardingBuddy("slack"),
  },
  {
    agentId: "asia-onboarding-buddy",
    pilot: true,
    phase: 1,
    bindings: onboardingBuddy("slack"),
  },
  {
    agentId: "eu-onboarding-buddy",
    pilot: true,
    phase: 1,
    bindings: onboardingBuddy("teams"),
  },
];

function mergePresets(): AgentPreset[] {
  const byId = new Map<string, AgentPreset>();
  for (const p of GENERATED_PRESETS) {
    byId.set(p.agentId, { ...p, phase: p.phase as 1 | 2 });
  }
  for (const p of HAND_OVERRIDES) {
    byId.set(p.agentId, p);
  }
  return [...byId.values()];
}

export const PRESETS: AgentPreset[] = mergePresets();

export function getPreset(agentId: string): AgentPreset | undefined {
  return PRESETS.find((p) => p.agentId === agentId);
}

export function pilotAgentIds(): string[] {
  return PRESETS.filter((p) => p.pilot).map((p) => p.agentId);
}

/** Default handoff binding for any agent without a preset. */
export function defaultBindingsForTools(toolNames: string[]): ToolBinding[] {
  return toolNames.map((tool) => {
    if (tool === "handoff_to_human") return { tool, connector: "slack" as const };
    if (
      tool.includes("book") ||
      tool.includes("availability") ||
      tool.includes("check_calendar") ||
      tool.includes("schedule_meeting") ||
      tool.includes("set_reminder")
    )
      return { tool, connector: "google_calendar" as const };
    if (tool.includes("notify_team")) return { tool, connector: "slack" as const };
    if (tool.includes("order") || tool.includes("stock"))
      return { tool, connector: "shopify" as const };
    if (tool.includes("ticket") || tool.includes("lead") || tool.includes("capture"))
      return { tool, connector: "hubspot" as const };
    return { tool, connector: "webhook" as const };
  });
}
