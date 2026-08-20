/**
 * What the personal assistant can do, grouped the way a new user thinks about their life.
 *
 * This is the source of truth for the onboarding surfaces on /me: the first-run welcome, the
 * reopenable "What I can do" sheet, and the empty-state starter prompts. A marketplace buyer
 * arrives cold — no idea the assistant touches their inbox, calendar, tasks, memory, etc. — so
 * every group carries a plain-language blurb, tap-to-run examples, and which account (if any) it
 * needs, so the connect model is taught rather than hit as a wall.
 *
 * Pure data (no React / no browser APIs) so it can be imported in tests and reused by a future
 * prospect-facing showcase page.
 */

/** Consumer-facing labels for the connectors the assistant can use. */
export const CONNECTOR_LABEL: Record<string, string> = {
  email: "Gmail",
  google_calendar: "Calendar",
  google_tasks: "Google Tasks",
  google_contacts: "Contacts",
  google_drive: "Drive",
  youtube: "YouTube",
  notion: "Notion",
  spotify: "Spotify",
};

export type CapabilityGroup = {
  key: string;
  icon: string;
  title: string;
  /** One plain sentence: what this does for the user. */
  blurb: string;
  /** Connector ids this group works best with. Empty = nothing to connect, works immediately. */
  needs: string[];
  /** Tap-to-run example prompts — the fastest path from "what can it do?" to a real result. */
  examples: string[];
};

/**
 * Ordered so the no-setup groups come first: a cold buyer should reach a real result before ever
 * meeting a "connect your account" step. Memory is second because it's the differentiator most
 * users never discover on their own.
 */
export const CAPABILITY_GROUPS: CapabilityGroup[] = [
  {
    key: "everyday",
    icon: "✨",
    title: "Everyday help",
    blurb: "Ask me anything — quick research, the weather, explaining something confusing. No setup needed.",
    needs: [],
    examples: [
      "What's the weather for my run tomorrow?",
      "Find 3 well-reviewed dinner spots near me",
      "Explain this phone bill in plain English",
    ],
  },
  {
    key: "memory",
    icon: "🧠",
    title: "Remembers you",
    blurb: "Tell me your preferences and the people in your life — I'll remember them across every chat, so you never repeat yourself.",
    needs: [],
    examples: [
      "Remember I'm vegetarian and prefer mornings",
      "Remember my daughter's name is Aya",
      "What do you remember about me?",
    ],
  },
  {
    key: "email",
    icon: "✉️",
    title: "Your inbox",
    blurb: "I catch you up on what matters and draft replies in your voice — and I never send anything without your say-so.",
    needs: ["email"],
    examples: [
      "Catch me up on my inbox",
      "Draft a reply to my latest email",
    ],
  },
  {
    key: "calendar",
    icon: "📅",
    title: "Your calendar",
    blurb: "See what's on, and create or move events — I always read the details back before changing anything.",
    needs: ["google_calendar"],
    examples: [
      "What's on my calendar today?",
      "Block 30 minutes tomorrow for focus time",
    ],
  },
  {
    key: "tasks",
    icon: "✅",
    title: "Reminders & to-dos",
    blurb: "Set time-based reminders and keep a to-do list — your tasks sync to Google Tasks once it's connected.",
    needs: [],
    examples: [
      "Remind me to call the pharmacy at 5pm",
      "Add 'renew my passport' to my to-dos",
    ],
  },
  {
    key: "find",
    icon: "🔎",
    title: "Find things",
    blurb: "Look up a file, a person, a note or a video — I search the accounts you've connected.",
    needs: ["google_drive", "google_contacts", "notion", "youtube"],
    examples: [
      "Find the file with our lease agreement",
      "Search my Notion for the trip plan",
      "Find a 10-minute morning yoga video",
    ],
  },
  {
    key: "music",
    icon: "🎵",
    title: "Music",
    blurb: "Control Spotify hands-free — play something, pause, or ask what's on.",
    needs: ["spotify"],
    examples: [
      "Play some focus music",
      "What's playing right now?",
    ],
  },
];

/**
 * Empty-state starter chips — instant-value (no-account) prompts first, so the very first tap a
 * new user makes pays off without hitting a connect wall.
 */
export const STARTER_PROMPTS: string[] = [
  "What's the weather for my run tomorrow?",
  "Find 3 well-reviewed dinner spots near me",
  "Remember I'm vegetarian and prefer mornings",
  "Catch me up on my inbox",
  "What's on my calendar today?",
  "Remind me to call the pharmacy at 5pm",
];

/**
 * The three prompts shown in the first-run welcome. All work with nothing connected, so a brand
 * new user gets an "it just did that" moment on their first message.
 */
export const FIRST_RUN_PROMPTS: string[] = [
  "What's the weather for my run tomorrow?",
  "Find 3 well-reviewed dinner spots near me",
  "Remember I'm vegetarian and prefer mornings",
];

/** Labels for a group's needed connectors, filtered to those not yet connected. */
export function unmetConnectorLabels(needs: string[], connected: Set<string>): string[] {
  return needs.filter((n) => !connected.has(n)).map((n) => CONNECTOR_LABEL[n] ?? n);
}
