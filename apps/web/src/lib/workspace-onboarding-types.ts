export type OnboardingMarket = "us" | "eu" | "africa" | "asia" | "oceania";

export type OnboardingIntent =
  | "customer-support"
  | "bookings"
  | "hotel"
  | "it-helpdesk"
  | "sales"
  | "other";

export type ChecklistStepId = "market" | "browse" | "try" | "rent" | "install";

export type ChecklistState = Record<ChecklistStepId, boolean>;

export type WorkspaceOnboarding = {
  workspaceId: string;
  companyName: string;
  market: OnboardingMarket;
  industry: string;
  companySize: string;
  intent: OnboardingIntent;
  contactEmail?: string;
  product: "agents";
  wizardCompleted: boolean;
  checklist: ChecklistState;
  checklistDismissed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export const EMPTY_CHECKLIST: ChecklistState = {
  market: false,
  browse: false,
  try: false,
  rent: false,
  install: false,
};

export function intentToFamilyHint(intent: OnboardingIntent): string {
  switch (intent) {
    case "customer-support":
      return "customer-support";
    case "bookings":
      return "home-services";
    case "hotel":
      return "hotel-guest";
    case "it-helpdesk":
      return "it-helpdesk";
    case "sales":
      return "sales-qualifier";
    default:
      return "customer-support";
  }
}
