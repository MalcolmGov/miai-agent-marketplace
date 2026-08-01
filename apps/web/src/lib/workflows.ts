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
] as const;

const WORKFLOW_RE =
  /executive-assistant|it-helpdesk|salon-booking|trades-receptionist|home-services|sales-qualifier|restaurant-takeaway|onboarding-buddy/i;

export function isWorkflowFamilyId(familyOrAgentId: string): boolean {
  return WORKFLOW_RE.test(familyOrAgentId);
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
  return {
    workflow: false,
    prompts: [
      "Where is the Austin office?",
      "How many PTO days do full-time employees get?",
      "Speak to a human",
    ],
  };
}
