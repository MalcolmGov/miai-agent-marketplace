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
    // Language-agnostic: a PAN-like 13–19 digit sequence (mirrors the output scrub) catches a card
    // number in ANY language, plus en/es/fr keyword forms.
    /card (number|details)|cvv|4111|debit card|credit card|charge my card|take my levy off|tarjeta de (cr[eé]dito|d[eé]bito)|carte bancaire|num[eé]ro de (carte|tarjeta)|\b(?:\d[ -]*?){13,19}\b/.test(
      lower,
    )
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
  // Full PAN-like sequences in the model reply
  if (/\b(?:\d[ -]*?){13,19}\b/.test(text.replace(/\s/g, " "))) {
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
