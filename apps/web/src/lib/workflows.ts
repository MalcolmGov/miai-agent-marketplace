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
