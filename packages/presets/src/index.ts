import type { ToolBinding } from "@miai/connectors";

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

const frontDesk = (calendar: "google_calendar" | "m365_calendar", handoff: "slack" | "teams"): ToolBinding[] => [
  ...booking(calendar),
  { tool: "list_services", connector: "webhook" },
  { tool: "capture_lead", connector: "hubspot" },
  { tool: "handoff_to_human", connector: handoff },
];

export const PRESETS: AgentPreset[] = [
  // —— Phase 1 pilots ——
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

  // —— Africa / Asia pack variants of pilots (WhatsApp + Slack handoff) ——
  {
    agentId: "africa-customer-support",
    phase: 1,
    bindings: supportShopify("slack"),
  },
  {
    agentId: "asia-customer-support",
    phase: 1,
    bindings: supportShopify("slack"),
  },
  {
    agentId: "africa-dental-front-desk",
    phase: 1,
    bindings: [
      ...booking("google_calendar"),
      { tool: "list_services", connector: "webhook" },
      { tool: "get_treatment_info", connector: "webhook" },
      { tool: "handoff_to_human", connector: "slack" },
    ],
  },
  {
    agentId: "asia-dental-front-desk",
    phase: 1,
    bindings: [
      ...booking("google_calendar"),
      { tool: "list_services", connector: "webhook" },
      { tool: "get_treatment_info", connector: "webhook" },
      { tool: "handoff_to_human", connector: "slack" },
    ],
  },
  {
    agentId: "africa-home-services",
    phase: 1,
    bindings: [
      ...booking("google_calendar"),
      { tool: "list_services", connector: "webhook" },
      { tool: "request_estimate", connector: "hubspot" },
      { tool: "handoff_to_human", connector: "slack" },
    ],
  },
  {
    agentId: "asia-home-services",
    phase: 1,
    bindings: [
      ...booking("google_calendar"),
      { tool: "list_services", connector: "webhook" },
      { tool: "request_estimate", connector: "hubspot" },
      { tool: "handoff_to_human", connector: "slack" },
    ],
  },
  {
    agentId: "africa-trades-receptionist",
    phase: 1,
    bindings: [
      ...booking("google_calendar"),
      { tool: "list_services", connector: "webhook" },
      { tool: "request_estimate", connector: "hubspot" },
      { tool: "handoff_to_human", connector: "slack" },
    ],
  },
  {
    agentId: "asia-trades-receptionist",
    phase: 1,
    bindings: [
      ...booking("google_calendar"),
      { tool: "list_services", connector: "webhook" },
      { tool: "request_estimate", connector: "hubspot" },
      { tool: "handoff_to_human", connector: "slack" },
    ],
  },
  {
    agentId: "africa-hotel-guest",
    phase: 1,
    bindings: [
      { tool: "get_amenity_info", connector: "webhook" },
      { tool: "get_local_recommendations", connector: "webhook" },
      { tool: "make_guest_request", connector: "webhook" },
      { tool: "handoff_to_human", connector: "slack" },
    ],
  },
  {
    agentId: "asia-hotel-guest",
    phase: 1,
    bindings: [
      { tool: "get_amenity_info", connector: "webhook" },
      { tool: "get_local_recommendations", connector: "webhook" },
      { tool: "make_guest_request", connector: "webhook" },
      { tool: "handoff_to_human", connector: "slack" },
    ],
  },

  // —— Remaining US agents (phase 1 core connectors where possible) ——
  { agentId: "us-front-desk", phase: 1, bindings: frontDesk("google_calendar", "slack") },
  { agentId: "us-clinic-front-desk", phase: 1, bindings: [
    ...booking("google_calendar"),
    { tool: "list_services", connector: "webhook" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "africa-clinic-front-desk", phase: 1, bindings: [
    ...booking("google_calendar"),
    { tool: "list_services", connector: "webhook" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "asia-clinic-front-desk", phase: 1, bindings: [
    ...booking("google_calendar"),
    { tool: "list_services", connector: "webhook" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "us-salon-booking", phase: 1, bindings: [
    ...booking("google_calendar"),
    { tool: "list_services", connector: "webhook" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "africa-salon-booking", phase: 1, bindings: [
    ...booking("google_calendar"),
    { tool: "list_services", connector: "webhook" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "asia-salon-booking", phase: 1, bindings: [
    ...booking("google_calendar"),
    { tool: "list_services", connector: "webhook" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "us-hotel-concierge", phase: 1, bindings: [
    { tool: "get_amenity_info", connector: "webhook" },
    { tool: "make_guest_request", connector: "webhook" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "africa-hotel-concierge", phase: 1, bindings: [
    { tool: "get_amenity_info", connector: "webhook" },
    { tool: "make_guest_request", connector: "webhook" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "asia-hotel-concierge", phase: 1, bindings: [
    { tool: "get_amenity_info", connector: "webhook" },
    { tool: "make_guest_request", connector: "webhook" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "us-restaurant-takeaway", phase: 2, bindings: [
    { tool: "get_menu", connector: "webhook" },
    { tool: "place_order", connector: "stripe" },
    { tool: "check_table_availability", connector: "calendly" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "us-sales-qualifier", phase: 1, bindings: [
    { tool: "capture_lead", connector: "hubspot" },
    { tool: "book_consultation", connector: "google_calendar" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "africa-sales-qualifier", phase: 1, bindings: [
    { tool: "capture_lead", connector: "hubspot" },
    { tool: "book_consultation", connector: "google_calendar" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "asia-sales-qualifier", phase: 1, bindings: [
    { tool: "capture_lead", connector: "hubspot" },
    { tool: "book_consultation", connector: "google_calendar" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "us-insurance-claims", phase: 2, bindings: [
    { tool: "start_claim", connector: "webhook" },
    { tool: "get_claim_status", connector: "webhook" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "us-pharmacy", phase: 1, bindings: [
    ...booking("google_calendar"),
    { tool: "check_availability", connector: "webhook" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "africa-pharmacy", phase: 1, bindings: [
    ...booking("google_calendar"),
    { tool: "check_availability", connector: "webhook" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "asia-pharmacy", phase: 1, bindings: [
    ...booking("google_calendar"),
    { tool: "check_availability", connector: "webhook" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "us-veterinary", phase: 1, bindings: [
    ...booking("google_calendar"),
    { tool: "list_services", connector: "webhook" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "africa-veterinary", phase: 1, bindings: [
    ...booking("google_calendar"),
    { tool: "list_services", connector: "webhook" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "asia-veterinary", phase: 1, bindings: [
    ...booking("google_calendar"),
    { tool: "list_services", connector: "webhook" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "us-vas-concierge", phase: 1, bindings: [
    { tool: "list_services", connector: "webhook" },
    { tool: "capture_lead", connector: "hubspot" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "us-gym-membership", phase: 1, bindings: [
    ...booking("google_calendar"),
    { tool: "list_services", connector: "webhook" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "us-property-enquiries", phase: 1, bindings: [
    { tool: "book_viewing", connector: "google_calendar" },
    { tool: "capture_lead", connector: "hubspot" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "africa-property-enquiries", phase: 1, bindings: [
    { tool: "book_viewing", connector: "google_calendar" },
    { tool: "capture_lead", connector: "hubspot" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "asia-property-enquiries", phase: 1, bindings: [
    { tool: "book_viewing", connector: "google_calendar" },
    { tool: "capture_lead", connector: "hubspot" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "us-law-firm-intake", phase: 1, bindings: [
    { tool: "capture_lead", connector: "hubspot" },
    { tool: "book_consultation", connector: "google_calendar" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "us-marketing-assistant", phase: 1, bindings: [
    { tool: "capture_lead", connector: "hubspot" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "us-order-tracking", phase: 1, bindings: [
    { tool: "get_order_status", connector: "shopify" },
    { tool: "create_ticket", connector: "hubspot" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "africa-order-tracking", phase: 1, bindings: [
    { tool: "get_order_status", connector: "shopify" },
    { tool: "create_ticket", connector: "hubspot" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},
  { agentId: "asia-order-tracking", phase: 1, bindings: [
    { tool: "get_order_status", connector: "shopify" },
    { tool: "create_ticket", connector: "hubspot" },
    { tool: "handoff_to_human", connector: "slack" },
  ]},

  // —— Remaining EU agents ——
  { agentId: "eu-customer-support", phase: 1, bindings: supportShopify("teams") },
  { agentId: "eu-front-desk", phase: 1, bindings: frontDesk("m365_calendar", "teams") },
  { agentId: "eu-clinic-front-desk", phase: 1, bindings: [
    ...booking("m365_calendar"),
    { tool: "list_services", connector: "webhook" },
    { tool: "handoff_to_human", connector: "teams" },
  ]},
  { agentId: "eu-salon-booking", phase: 1, bindings: [
    ...booking("m365_calendar"),
    { tool: "list_services", connector: "webhook" },
    { tool: "handoff_to_human", connector: "teams" },
  ]},
  { agentId: "eu-hotel-concierge", phase: 1, bindings: [
    { tool: "get_amenity_info", connector: "webhook" },
    { tool: "make_guest_request", connector: "webhook" },
    { tool: "handoff_to_human", connector: "teams" },
  ]},
  { agentId: "eu-restaurant-takeaway", phase: 2, bindings: [
    { tool: "get_menu", connector: "webhook" },
    { tool: "place_order", connector: "stripe" },
    { tool: "check_table_availability", connector: "calendly" },
    { tool: "handoff_to_human", connector: "teams" },
  ]},
  { agentId: "eu-sales-qualifier", phase: 1, bindings: [
    { tool: "capture_lead", connector: "hubspot" },
    { tool: "book_consultation", connector: "m365_calendar" },
    { tool: "handoff_to_human", connector: "teams" },
  ]},
  { agentId: "eu-insurance-claims", phase: 2, bindings: [
    { tool: "start_claim", connector: "webhook" },
    { tool: "get_claim_status", connector: "webhook" },
    { tool: "handoff_to_human", connector: "teams" },
  ]},
  { agentId: "eu-utility-billing", phase: 1, bindings: [
    { tool: "get_account_status", connector: "webhook" },
    { tool: "create_ticket", connector: "zendesk" },
    { tool: "handoff_to_human", connector: "teams" },
  ]},
  { agentId: "eu-pharmacy", phase: 1, bindings: [
    ...booking("m365_calendar"),
    { tool: "check_availability", connector: "webhook" },
    { tool: "handoff_to_human", connector: "teams" },
  ]},
  { agentId: "eu-travel-desk", phase: 1, bindings: [
    { tool: "list_services", connector: "webhook" },
    { tool: "capture_lead", connector: "hubspot" },
    { tool: "handoff_to_human", connector: "teams" },
  ]},
  { agentId: "eu-rental-enquiries", phase: 1, bindings: [
    { tool: "book_viewing", connector: "m365_calendar" },
    { tool: "capture_lead", connector: "hubspot" },
    { tool: "handoff_to_human", connector: "teams" },
  ]},
  { agentId: "eu-payroll-queries", phase: 2, bindings: [
    { tool: "get_payslip_info", connector: "xero" },
    { tool: "handoff_to_human", connector: "teams" },
  ]},
  { agentId: "eu-accounting-practice", phase: 2, bindings: [
    { tool: "get_required_documents", connector: "xero" },
    { tool: "capture_onboarding", connector: "hubspot" },
    { tool: "handoff_to_human", connector: "teams" },
  ]},
  { agentId: "eu-veterinary", phase: 1, bindings: [
    ...booking("m365_calendar"),
    { tool: "list_services", connector: "webhook" },
    { tool: "handoff_to_human", connector: "teams" },
  ]},
  { agentId: "eu-gym-membership", phase: 1, bindings: [
    ...booking("m365_calendar"),
    { tool: "list_services", connector: "webhook" },
    { tool: "handoff_to_human", connector: "teams" },
  ]},

  // —— Webhook templates (phase 2) ——
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
