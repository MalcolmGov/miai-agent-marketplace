/** Reply languages for agent chat (steers model output — not UI chrome). */

export const CHAT_LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "sw", label: "Swahili", native: "Kiswahili" },
] as const;

export type ChatLanguageCode = (typeof CHAT_LANGUAGES)[number]["code"];

const PACK_DEFAULTS: Record<string, ChatLanguageCode[]> = {
  us: ["en", "es"],
  eu: ["en", "de", "fr", "es", "it"],
  africa: ["en", "fr", "sw"],
  asia: ["en", "zh", "hi"],
};

export function isChatLanguage(value: string | null | undefined): value is ChatLanguageCode {
  return Boolean(value && CHAT_LANGUAGES.some((l) => l.code === value));
}

export function marketFromAgentId(agentId: string): keyof typeof PACK_DEFAULTS {
  const id = agentId.toLowerCase();
  if (id.startsWith("us-")) return "us";
  if (id.startsWith("eu-")) return "eu";
  if (id.startsWith("asia-")) return "asia";
  if (id.startsWith("africa-")) return "africa";
  return "africa";
}

export function suggestedLanguagesForAgent(agentId: string): ChatLanguageCode[] {
  return PACK_DEFAULTS[marketFromAgentId(agentId)] ?? ["en"];
}

export function defaultChatLanguage(agentId: string): ChatLanguageCode {
  return suggestedLanguagesForAgent(agentId)[0] ?? "en";
}

export function chatLanguageLabel(code: ChatLanguageCode): string {
  return CHAT_LANGUAGES.find((l) => l.code === code)?.native ?? code;
}

/** Instruction appended to the agent system prompt for this turn. */
export function replyLanguageSystemAppend(code: ChatLanguageCode): string {
  if (code === "en") {
    return [
      "## Reply language",
      "Reply to the user in clear English unless they write in another language and clearly expect that language back.",
      "Keep tool names, IDs, and system identifiers in English.",
    ].join("\n");
  }
  const native = chatLanguageLabel(code);
  const englishName = CHAT_LANGUAGES.find((l) => l.code === code)?.label ?? code;
  return [
    "## Reply language (required)",
    `Always reply to the user in ${englishName} (${native}).`,
    "Translate user-facing explanations, confirmations, and summaries into that language.",
    "Keep tool names, IDs, SKUs, and connector identifiers in English.",
    "If a safety / handoff message must be given, give it in the reply language.",
  ].join("\n");
}

export function chatLangStorageKey(agentId: string) {
  return `miai-chat-lang:${agentId}`;
}
