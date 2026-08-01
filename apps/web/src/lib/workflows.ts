/** Families with multi-step goal → plan → confirm → execute → verify runtime. */
export const WORKFLOW_FAMILY_IDS = [
  "executive-assistant",
  "it-helpdesk",
  "salon-booking",
  "trades-receptionist",
  "home-services",
  "sales-qualifier",
  "restaurant-takeaway",
  "onboarding-buddy",
  "dental-front-desk",
  "hotel-guest",
] as const;

const WORKFLOW_RE =
  /executive-assistant|it-helpdesk|salon-booking|trades-receptionist|home-services|sales-qualifier|restaurant-takeaway|onboarding-buddy|dental-front-desk|hotel-guest/i;

export function isWorkflowFamilyId(familyOrAgentId: string): boolean {
  return WORKFLOW_RE.test(familyOrAgentId);
}

/** Chips shown in chat / studio so buyers see these agents act, not only answer. */
export function workflowCapabilityChips(agentId: string): string[] {
  if (!isWorkflowFamilyId(agentId)) return [];

  const base = ["Multi-step", "Can act", "Confirm before write"];

  if (/executive-assistant/i.test(agentId)) {
    return [...base, "Calendar", "Reminders", "Slack notify"];
  }
  if (/it-helpdesk/i.test(agentId)) {
    return [...base, "KB how-tos", "Create ticket", "Escalate"];
  }
  if (/salon-booking/i.test(agentId)) {
    return [...base, "Check availability", "Book", "Notify desk"];
  }
  if (/trades-receptionist|home-services/i.test(agentId)) {
    return [...base, "Check availability", "Book job", "Notify dispatch"];
  }
  if (/sales-qualifier/i.test(agentId)) {
    return [...base, "Qualify", "Capture lead", "Book callback"];
  }
  if (/restaurant-takeaway/i.test(agentId)) {
    return [...base, "Menu", "Book table", "Place order"];
  }
  if (/onboarding-buddy/i.test(agentId)) {
    return [...base, "Checklist", "Log question", "Escalate"];
  }
  if (/dental-front-desk/i.test(agentId)) {
    return [...base, "Fees & treatments", "Book visit", "Clinical handoff"];
  }
  if (/hotel-guest/i.test(agentId)) {
    return [...base, "Amenities", "Local tips", "Log request"];
  }
  return base;
}

/** Friendly label for a tool name shown after a turn. */
export function toolChipLabel(toolName: string): string {
  const map: Record<string, string> = {
    check_availability: "Checked availability",
    book_appointment: "Booked appointment",
    notify_team: "Notified team",
    handoff_to_human: "Handed off",
    check_calendar: "Checked calendar",
    schedule_meeting: "Scheduled meeting",
    set_reminder: "Set reminder",
    search_kb: "Searched knowledge",
    create_ticket: "Created ticket",
    get_menu: "Fetched menu",
    book_table: "Booked table",
    place_order: "Placed order",
    capture_lead: "Captured lead",
    book_callback: "Booked callback",
    make_guest_request: "Logged guest request",
    get_amenity_info: "Amenity info",
    get_local_recommendations: "Local tips",
    list_services: "Listed services",
    get_treatment_info: "Treatment info",
  };
  return map[toolName] ?? toolName.replace(/_/g, " ");
}

export function workflowDemoHint(agentId: string): string | null {
  if (/executive-assistant/i.test(agentId)) {
    return "Connect Google Calendar + Slack on Actions, then try the suggested prompt — confirm the plan to write to the calendar.";
  }
  if (/it-helpdesk/i.test(agentId)) {
    return "Sandbox can demo VPN how-tos and ticket workflows; connect Slack for live notify/handoff.";
  }
  if (/salon-booking|trades-receptionist|home-services/i.test(agentId)) {
    return "Connect Calendar + Slack on Actions, then book with confirm-before-write in sandbox or live.";
  }
  if (/sales-qualifier/i.test(agentId)) {
    return "Connect Calendar for callbacks and HubSpot when ready; confirm before booking the sales call.";
  }
  if (/restaurant-takeaway/i.test(agentId)) {
    return "Try menu → confirm → place order / book table in sandbox; connect Calendar + Slack for live notify.";
  }
  if (/onboarding-buddy/i.test(agentId)) {
    return "Walk day-1 checklist, then confirm before logging a People-team question; connect Slack for notify.";
  }
  if (/dental-front-desk/i.test(agentId)) {
    return "Connect Calendar + Slack on Actions; book cleaning/exam with confirm-before-write — clinical/pain always hands off.";
  }
  if (/hotel-guest/i.test(agentId)) {
    return "Ask amenities or log towels/late check-out with confirm; billing and complaints go to the front desk.";
  }
  return null;
}

/** Short clickable sandbox prompts for the empty chat state. */
export function tryPromptsForAgent(agentId: string): { workflow: boolean; prompts: string[] } {
  if (/executive-assistant/i.test(agentId)) {
    return {
      workflow: true,
      prompts: [
        "Schedule a 30-min budget review with Thabo tomorrow at 14:00, set a reminder, and notify the team.",
        "Am I free Thursday afternoon?",
      ],
    };
  }
  if (/it-helpdesk/i.test(agentId)) {
    return {
      workflow: true,
      prompts: [
        "How do I connect to the office VPN?",
        "Laptop won’t power on — log a ticket for Thandi, ext 4412.",
        "I clicked a phishing link.",
      ],
    };
  }
  if (/salon-booking/i.test(agentId)) {
    return {
      workflow: true,
      prompts: [
        "Can I get a men’s cut this Saturday?",
        "Book the 10am skin fade with Riaan — Name’s Sipho, 555-0100.",
      ],
    };
  }
  if (/trades-receptionist|home-services/i.test(agentId)) {
    return {
      workflow: true,
      prompts: [
        "Can I get an AC diagnostic this Thursday?",
        "Book drain clearing Thursday 10:00 for Lea, +491701112233, Invalidenstr. 12 Berlin.",
      ],
    };
  }
  if (/sales-qualifier/i.test(agentId)) {
    return {
      workflow: true,
      prompts: [
        "What does your Growth plan include and roughly what does it cost?",
        "Call me Thursday afternoon on 555-0100 about Growth.",
      ],
    };
  }
  if (/restaurant-takeaway/i.test(agentId)) {
    return {
      workflow: true,
      prompts: [
        "What pizzas do you have and how much?",
        "Order a Margherita and fries for collection — 555-0100.",
        "Book a table for 2 on 2026-08-08 at 19:00.",
      ],
    };
  }
  if (/onboarding-buddy/i.test(agentId)) {
    return {
      workflow: true,
      prompts: [
        "It’s my first day — what’s on my checklist?",
        "Where do I submit banking for payroll?",
        "Laptop won’t boot — I’m stuck.",
      ],
    };
  }
  if (/dental-front-desk/i.test(agentId)) {
    return {
      workflow: true,
      prompts: [
        "How much is a cleaning?",
        "Can I get a cleaning this Thursday?",
        "Book a cleaning Thursday 10:00 — Name’s Maya, 555-0142.",
      ],
    };
  }
  if (/hotel-guest/i.test(agentId)) {
    return {
      workflow: true,
      prompts: [
        "What time is check-in and what’s the Wi‑Fi?",
        "Any restaurant recommendations nearby?",
        "I need extra towels in room 412.",
      ],
    };
  }
  return {
    workflow: false,
    prompts: [
      "Where is the Austin office?",
      "How many PTO days do full-time employees get?",
      "Speak to a human",
    ],
  };
}
