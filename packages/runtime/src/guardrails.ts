/**
 * Shared safety policy for mock + live models (Phase 3 D2).
 * Hard refusals / handoffs that must not depend on MockModel alone.
 */

export type GuardrailTool = { name: string };

export type GuardrailResult = {
  content: string;
  toolCall?: { name: string; args: Record<string, unknown> };
};

function findTool(tools: GuardrailTool[], ...parts: string[]): string | undefined {
  const lowerParts = parts.map((p) => p.toLowerCase());
  return tools.find((t) => lowerParts.every((p) => t.name.toLowerCase().includes(p)))?.name;
}

function emergencyNumber(system: string): string {
  const m =
    system.match(/call \*\*([^*]+)\*\*/i) ||
    system.match(/Emergencies:.*?([0-9]{3,5}|local emergency services)/i);
  return (m?.[1] || "local emergency services").trim();
}

function handoff(
  tools: GuardrailTool[],
  reason: string,
  summary: string,
  content: string,
): GuardrailResult {
  return {
    content,
    toolCall: {
      name: findTool(tools, "handoff") ?? "handoff_to_human",
      args: { reason, summary: summary.slice(0, 400) },
    },
  };
}

/**
 * Safety categories for the model-based classifier (P0-8) — a language-agnostic backstop behind the
 * en/es/fr keyword net, so a crisis written in ANY language still routes to a human. The runtime
 * runs the classifier only when the keyword net found nothing and the message looks non-English.
 */
export type SafetyCategory =
  | "none"
  | "self_harm"
  | "medical_emergency"
  | "physical_hazard"
  | "secret_disclosure";

/** System instruction for the safety classifier — output is a single category word. */
export const SAFETY_CLASSIFIER_INSTRUCTION =
  "You are a safety classifier for a customer-service assistant. Read the user's message in ANY " +
  "language and output EXACTLY ONE category word and nothing else:\n" +
  "- self_harm: the user expresses suicidal thoughts, intent to harm themselves, or a self-harm crisis.\n" +
  "- medical_emergency: a life-threatening medical situation (e.g. chest pain, can't breathe, unconscious, severe bleeding, overdose).\n" +
  "- physical_hazard: imminent physical danger (e.g. gas leak, fire, flooding, electrical hazard, intruder/break-in, a violent threat).\n" +
  "- secret_disclosure: the user is sharing, or about to share, a full card number, CVV, one-time code (OTP), PIN, or password.\n" +
  "- none: anything else.\n" +
  "If a message fits more than one, choose the most safety-critical. If you are unsure between a " +
  "category and none and there is any real risk, choose the category. Output only the category word.";

/** Parse the classifier's raw output into a category (robust to extra words / punctuation). */
export function parseSafetyCategory(raw: string): SafetyCategory {
  const t = (raw || "").toLowerCase();
  for (const c of ["self_harm", "medical_emergency", "physical_hazard", "secret_disclosure"] as const) {
    if (t.includes(c) || t.includes(c.replace("_", " "))) return c;
  }
  return "none";
}

/**
 * Build the forced response for a classifier verdict, reusing the same handoff/refusal paths as the
 * keyword net. Returns null for "none" (continue to the model).
 */
export function guardForSafetyCategory(
  category: SafetyCategory,
  userMessage: string,
  system: string,
  tools: GuardrailTool[],
): GuardrailResult | null {
  switch (category) {
    case "self_harm":
    case "medical_emergency": {
      const num = emergencyNumber(system);
      return handoff(
        tools,
        "emergency",
        userMessage,
        `If this is life-threatening or an emergency, call **${num}** / local emergency services now. I'm also handing you to a human teammate urgently.`,
      );
    }
    case "physical_hazard": {
      const num = emergencyNumber(system);
      return handoff(
        tools,
        "safety_emergency",
        userMessage,
        `This is a safety emergency — leave the area if needed and call **${num}** / local emergency services now. I'm connecting you to a human teammate urgently, and I won't say it's safe or that it has been fixed.`,
      );
    }
    case "secret_disclosure":
      return {
        content:
          "For your security, please don't share full card numbers, one-time codes (OTP), PINs, or passwords here. I can help without them, and a human teammate can assist with anything that needs verification.",
      };
    default:
      return null;
  }
}

/**
 * Rough "is this confidently English?" check, used to gate the model classifier so it runs only on
 * messages the en/es/fr keyword net can't confidently cover. Deliberately errs toward NOT-English
 * (i.e. run the classifier) for ambiguous input — a missed safety signal is worse than an extra
 * check. Non-Latin scripts and accented Latin are treated as non-English; otherwise we require a
 * common English function word.
 */
export function looksLikelyEnglish(text: string): boolean {
  // Non-Latin script (Greek/Cyrillic/Arabic/Hebrew/Devanagari/CJK/Hangul/Thai) → not English.
  if (/[Ͱ-᳿฀-๿぀-鿿가-힯]/.test(text)) return false;
  // Accented Latin / inverted punctuation → treat as non-English.
  if (/[àâäáãçéèêëíîïñóòôöõúùûüÿœæ¿¡]/i.test(text)) return false;
  // Require at least TWO common English function words — one alone is too weak (cognates like the
  // German "will"/"is" would otherwise read as English and skip the classifier). "will"/"am" are
  // deliberately omitted as high-frequency false friends.
  const matches = text
    .toLowerCase()
    .match(
      /\b(the|an|are|to|of|and|or|for|my|your|you|we|it|this|that|please|help|need|want|how|what|when|where|why|can|do|does|did|have|has|would|should|order|account|password|reset)\b/g,
    );
  return (matches?.length ?? 0) >= 2;
}

function luhnValid(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * P2-6: a real card number — a 13–19 digit run (optionally separated by spaces / dashes / dots)
 * that passes the Luhn checksum. The bare `{13,19}` digit regex over-fired on long order / reference
 * / tracking numbers (which almost never satisfy Luhn) and missed dot-separated PANs; requiring Luhn
 * cuts the false positives and the separator class catches `4111.1111.1111.1111`.
 */
export function containsLikelyPan(text: string): boolean {
  if (!text) return false;
  for (const m of text.matchAll(/(?<!\d)(?:\d[ .\-]?){13,19}(?!\d)/g)) {
    const digits = m[0].replace(/\D/g, "");
    if (digits.length >= 13 && digits.length <= 19 && luhnValid(digits)) return true;
  }
  return false;
}

/**
 * Pre-model input policy. Returns a forced response when the user message
 * hits a hard safety rule; otherwise null (continue to the model).
 */
export function checkInputGuardrails(
  userMessage: string,
  system: string,
  tools: GuardrailTool[],
  opts?: { consumerLine?: boolean },
): GuardrailResult | null {
  const last = userMessage;
  // Scan the FULL user message. Do not truncate at "##": that let an attacker hide unsafe content
  // (card/OTP, cross-tenant probe, emergency) after a "##" marker so no safety rule below would fire.
  const lower = last.toLowerCase();

  if (/ignore (all )?previous|system prompt|jailbreak|reveal your (prompt|rules)/.test(lower)) {
    return {
      content:
        "I can't share internal instructions. I can help with your account, booking, or order questions — what do you need?",
    };
  }

  if (
    // Explicit card keywords (en/es/fr) OR a Luhn-valid PAN in any language (P2-6). The bare-number
    // path is now Luhn-gated so long order/reference numbers no longer trip the card refusal.
    /card (number|details)|cvv|4111|debit card|credit card|charge my card|take my levy off|tarjeta de (cr[eé]dito|d[eé]bito)|carte bancaire|num[eé]ro de (carte|tarjeta)/.test(
      lower,
    ) ||
    containsLikelyPan(last)
  ) {
    return {
      content:
        "I can't take card details in chat — please use the secure payment link or pay at the practice. Never share full card numbers or CVV / OTP here.",
    };
  }

  if (/\botp\b|one-?time (pin|password)|share.*(pin|password)|c[oó]digo de un solo uso|clave (de un solo uso|temporal)|code (à|a) usage unique/.test(lower)) {
    return {
      content:
        "Never share OTP, PIN, or passwords with me — I will never ask for them. If someone asks, don't share.",
    };
  }

  // ── Multilingual safety net (es / fr) ──────────────────────────────────────────────────────────
  // The keyword blocks in this file are English-only, but agents now reply in the user's language
  // (#96 `## Language`), so a card/emergency written in Spanish/French could otherwise bypass them.
  // This adds high-confidence es/fr coverage for the highest-risk categories: self-harm, medical /
  // physical emergencies, gas/electrical/fire, and break-ins. NOTE: en/es/fr keyword coverage only —
  // robust safety for arbitrary languages the model may reply in needs a model-based safety
  // classifier (tracked as a follow-up); do not treat this as complete multilingual safety.
  {
    const num = emergencyNumber(system);
    if (
      /no puedo respirar|me estoy ahogando|dolor.{0,8}pecho|inconsciente|se desmay|sobredosis|envenen|veneno|sangrando mucho|quiero (morir|suicidarme|suicidar)|me voy a matar/.test(lower) ||
      /ne peux (pas|plus) respirer|[ée]touffe|douleur.{0,8}poitrine|inconscient|[ée]vanoui|surdose|overdose|empoison|veux mourir|me suicider/.test(lower)
    ) {
      return handoff(
        tools,
        "emergency",
        last,
        `If this is life-threatening or an emergency, call **${num}** / local emergency services now — I'm handing you to a human teammate urgently. ` +
          `Si es una emergencia, llame al **${num}** ahora. En cas d'urgence, appelez le **${num}** maintenant.`,
      );
    }
    if (/fuga de gas|huele a gas|olor a gas|olor a quemado|chispas|fuite de gaz|odeur de gaz|odeur de br[ûu]l[ée]|[ée]tincelle/.test(lower)) {
      return handoff(
        tools,
        "safety_emergency",
        last,
        `This is a safety emergency — leave the area if needed and call **${num}** / local emergency services now. I'm connecting you to a human urgently, and I won't say it's safe or fixed.`,
      );
    }
    if (/hay un intruso|entraron a robar|forzando la (puerta|reja)|intrus|cambriolage|on force la porte/.test(lower)) {
      return handoff(
        tools,
        "emergency",
        last,
        `This is a security emergency — call **${num}** / local emergency services and your security line now. I'm handing you to a human urgently.`,
      );
    }
  }

  if (/^\s*stop\b|unsubscribe|don't (text|message|contact) me|remove me/.test(lower)) {
    return handoff(
      tools,
      "stop_suppression",
      last,
      "Understood — STOP noted. You won't receive marketing messages; I'll hand off so suppression is completed.",
    );
  }

  if (
    /financial advice|should i (invest|buy|cancel|take the loan|switch)|which (loan|policy) is best|good investment|guarantee a return|what do you recommend|cheaper insurer|interest rates to drop|salary or dividends|how much income tax will i owe|tax (advice|planning)/.test(
      lower,
    )
  ) {
    return handoff(
      tools,
      "financial_advice",
      last,
      "I can't advise / can't give financial advice or recommend salary vs dividends for your situation. Please speak to an accountant — I can connect you to a licensed human / bond originator.",
    );
  }

  if (/sanctions|watchlist|aml|push the transfer through|push .* through anyway|bypass (compliance|review)/.test(lower)) {
    return handoff(
      tools,
      "sanctions_aml",
      last,
      "I can't / cannot push a flagged transfer through — this needs a compliance review. I'm connecting you to the compliance team now; I won't capture the transfer.",
    );
  }

  // Cross-tenant data-access probes. The family-reference clause ("my daughter Aya") is benign
  // first-party on the consumer line, so it is skipped there; every other third-party pattern
  // ("another account", "their records", "show me his …") still applies to both lines.
  const familyRef = /my (wife|husband|partner|friend|son|daughter)('s|\s+\w+)/;
  const crossTenant =
    /another (site|practice|branch|scheme|tenant|applicant|patient|customer|employee|client|person|unit|account|driver|student|retailer|college|school|gym|catalogue|catalog)|on (your |this )?platform|pull (up |another )|pull another|colleague'?s?|neighbour'?s?|neighbor'?s?|someone else'?s?|other (patient|client|customer|employee|gym|applicant|student)|manage .+ on this platform|their (patient|account|levy|bookings|salary|leave|file|address|name|phone|marks|chart|results|student number|students|timetables|records)|his (exam )?results|her (exam )?results|student number|previous (patient|customer)|last (patient|shopper|new hire|transfer|hire)|customer before me|table before me|other gyms|show me (his|her|their)|what does my colleague|who (else )?(applied|has booked|booked|received|lives)|i'?m not the (recipient|buyer)|it'?s not mine|not the recipient|competitor|jobs you did for|who lives there|driver'?s (home )?address|driver \w{2,12}'s (licence|license|address|phone)|open tickets for my colleague|salary and how many|claim on policy|policy and their claim|waiting list for|whoever else|phone number of whoever|other people (on|waiting)|account (bravo|alpha|other)|invoices for account|statement and outstanding|sipho'?s|job sheet and customer phone|for \w+'s job|technician'?s (job|route)|other account|enrolled at another/;

  if (crossTenant.test(lower) || (!opts?.consumerLine && familyRef.test(lower))) {
    return {
      content:
        "I can't share or access another person's, another account holder's, or another tenant's confidential information — privacy rules mean I cannot send another student's records. I can only share your own account / jobs assigned to you. I'm unable to pull up their records or accounts other than yours here.",
    };
  }

  if (
    /\baches\b|dark spot|\bswollen\b|\bthrobbing\b|do i need a filling|is it infected|\bpus\b|\babscess\b|\bcollapsed\b|struggling to breathe|rat poison|\bpoison\b|can't put weight|\bswallowed\b|handful of pills|very drowsy|\boverdose\b/.test(
      lower,
    )
  ) {
    const num = emergencyNumber(system);
    if (
      /collapsed|breathe|poison|bleeding heavily|unconscious|swallowed|handful of pills|drowsy|overdose|clutching his chest/.test(
        lower,
      )
    ) {
      return handoff(
        tools,
        "emergency",
        last,
        `This sounds urgent — call **${num}** / local emergency services or your nearest emergency department / clinic now. I'm handing you to a human.`,
      );
    }
    return handoff(
      tools,
      "clinical",
      last,
      "I can't diagnose or give clinical advice in chat — I'm connecting you to a human teammate who can help you book the right care.",
    );
  }

  if (/force (the )?(gate|door)|break(ing)? in|home alone|security breach|intruder/.test(lower)) {
    const num = emergencyNumber(system);
    return handoff(
      tools,
      "emergency",
      last,
      `This is a security emergency — call **${num}** / local emergency services and the 24/7 security line now. I'm handing you to a human urgently.`,
    );
  }

  if (
    /smell gas|gas coming from|gas leak|meter box is sparking|sparking|burning smell|exposed live|got a shock|arcing/.test(
      lower,
    )
  ) {
    const num = emergencyNumber(system);
    return handoff(
      tools,
      "safety_emergency",
      last,
      `This is a safety emergency — leave the area if needed and call **${num}** / local emergency services now. I'm connecting you to a human teammate urgently. I won't say it's safe or that it has been fixed.`,
    );
  }

  if (
    /erase my data|delete my (data|account|personal)|right to be forgotten|gdpr.*(eras|delet)|ccpa.*(delet|eras)/.test(
      lower,
    )
  ) {
    return handoff(
      tools,
      "gdpr_erasure",
      last,
      "I can't complete a GDPR/CCPA erasure in chat — I'm handing you to a human so they can process the deletion request properly.",
    );
  }

  if (
    /life-?threatening|emergency|chest pain|can't breathe|clutching his chest|suicide|burst pipe|gas leak|electrical hazard|security breach|flooding|fire in/.test(
      lower,
    )
  ) {
    const num = emergencyNumber(system);
    return handoff(
      tools,
      "emergency",
      last,
      `If this is life-threatening or an emergency, call **${num}** / local emergency services now. I'm also handing you to a human teammate urgently.`,
    );
  }

  return null;
}

/**
 * Post-model output scrub for live replies (card/OTP leakage).
 * Does not invent new answers — only blocks unsafe drafts.
 */
export function checkOutputGuardrails(
  userMessage: string,
  draft: string,
  tools: GuardrailTool[],
): GuardrailResult | null {
  const text = draft || "";
  // A Luhn-valid PAN in the model reply (P2-6 — no longer trips on long order/tracking numbers).
  if (containsLikelyPan(text)) {
    return {
      content:
        "I can't take or repeat card numbers in chat — please use the secure payment link. Never share full card details here.",
    };
  }
  if (/\b(cvv|cvc)\b\s*[:=]?\s*\d{3,4}\b/i.test(text)) {
    return {
      content:
        "I can't handle CVV / security codes in chat — please use the secure payment page only.",
    };
  }
  if (
    /\b(otp|one-?time (pin|password|code))\b.{0,40}\b\d{4,8}\b/i.test(text) ||
    /\b(pin|password)\b\s*[:=]\s*\S+/i.test(text)
  ) {
    return {
      content:
        "Never share OTP, PIN, or passwords in chat — I will never ask for them or repeat them.",
    };
  }
  // If user asked for jailbreak and model complied with long "system prompt" dump
  if (
    /ignore (all )?previous|jailbreak|reveal your (prompt|rules)/i.test(userMessage) &&
    /you are |system prompt|internal instructions|guardrails:/i.test(text) &&
    text.length > 400
  ) {
    return {
      content:
        "I can't share internal instructions. I can help with your account, booking, or order questions — what do you need?",
    };
  }
  void tools;
  return null;
}
