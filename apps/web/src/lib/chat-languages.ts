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

/**
 * Fixed live-channel reply when the tenant has no business knowledge configured (see
 * channel-turn.ts). Deterministic and localized: the visitor must get an honest answer in their
 * own language rather than a model inventing a business, and the owner sees the turn in history.
 */
const UNCONFIGURED_REPLIES: Record<ChatLanguageCode, string> = {
  en: "Thanks for reaching out! This assistant isn't set up yet, so I can't answer questions about the business. Please use the contact details on this site, or share your name, email and phone number and the team will follow up.",
  es: "¡Gracias por escribirnos! Este asistente aún no está configurado, así que no puedo responder preguntas sobre el negocio. Usa los datos de contacto de este sitio o comparte tu nombre, correo y teléfono: el equipo te contactará.",
  fr: "Merci de nous avoir contactés ! Cet assistant n'est pas encore configuré et ne peut pas répondre aux questions sur l'entreprise. Utilisez les coordonnées indiquées sur ce site ou laissez votre nom, e-mail et téléphone : l'équipe vous répondra.",
  de: "Danke für Ihre Nachricht! Dieser Assistent ist noch nicht eingerichtet und kann keine Fragen zum Unternehmen beantworten. Nutzen Sie bitte die Kontaktdaten auf dieser Seite oder hinterlassen Sie Namen, E-Mail und Telefonnummer — das Team meldet sich bei Ihnen.",
  it: "Grazie per averci contattato! Questo assistente non è ancora configurato e non può rispondere a domande sull'azienda. Usa i contatti di questo sito oppure lascia nome, email e telefono: il team ti risponderà.",
  zh: "感谢您的来信！此助手尚未完成配置，暂时无法回答与企业相关的问题。请使用本网站上的联系方式，或留下您的姓名、邮箱和电话，团队会与您联系。",
  hi: "संपर्क करने के लिए धन्यवाद! यह सहायक अभी सेटअप नहीं हुआ है, इसलिए मैं व्यवसाय से जुड़े सवालों का जवाब नहीं दे सकता। कृपया इस साइट पर दिए संपर्क विवरण का उपयोग करें, या अपना नाम, ईमेल और फ़ोन साझा करें — टीम आपसे संपर्क करेगी।",
  sw: "Asante kwa kuwasiliana nasi! Msaidizi huyu bado hajasanidiwa, kwa hivyo siwezi kujibu maswali kuhusu biashara. Tafadhali tumia maelezo ya mawasiliano kwenye tovuti hii, au tuachie jina lako, barua pepe na namba ya simu — timu itawasiliana nawe.",
};

export function unconfiguredReply(code: ChatLanguageCode): string {
  return UNCONFIGURED_REPLIES[code] ?? UNCONFIGURED_REPLIES.en;
}

export function chatLangStorageKey(agentId: string) {
  return `miai-chat-lang:${agentId}`;
}
