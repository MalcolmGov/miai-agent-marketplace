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
  {
    agentId: "us-dental-front-desk",
    pilot: true,
    phase: 1,
    bindings: [
      ...booking("google_calendar"),
      { tool: "list_services", connector: "webhook" },
      { tool: "get_treatment_info", connector: "webhook" },
      { tool: "handoff_to_human", connector: "slack" },
    ],
  },
  {
    agentId: "us-home-services",
    pilot: true,
    phase: 1,
    bindings: [
      ...booking("google_calendar"),
      { tool: "list_services", connector: "webhook" },
      { tool: "request_estimate", connector: "hubspot" },
      { tool: "handoff_to_human", connector: "slack" },
    ],
  },
  {
    agentId: "eu-trades-receptionist",
    pilot: true,
    phase: 1,
    bindings: [
      ...booking("m365_calendar"),
      { tool: "list_services", connector: "webhook" },
      { tool: "request_estimate", connector: "hubspot" },
      { tool: "handoff_to_human", connector: "teams" },
    ],
  },
  {
    agentId: "eu-hotel-guest",
    pilot: true,
    phase: 1,
    bindings: [
      { tool: "get_amenity_info", connector: "webhook" },
      { tool: "get_local_recommendations", connector: "webhook" },
      { tool: "make_guest_request", connector: "webhook" },
      { tool: "handoff_to_human", connector: "slack" },
    ],
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
    if (tool.includes("book") || tool.includes("availability"))
      return { tool, connector: "google_calendar" as const };
    if (tool.includes("order") || tool.includes("stock"))
      return { tool, connector: "shopify" as const };
    if (tool.includes("ticket") || tool.includes("lead") || tool.includes("capture"))
      return { tool, connector: "hubspot" as const };
    return { tool, connector: "webhook" as const };
  });
}
