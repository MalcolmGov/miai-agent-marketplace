/** Best-effort PII redaction for persisted chat transcripts. */

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

/** US / ZA / generic intl phone-like sequences (10+ digits with optional + prefix). */
const PHONE_RE =
  /(?:\+?(?:1|27)[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}\b|(?:\+\d{1,3}[\s.-]?)?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{1,4})?/g;

const CARD_CANDIDATE_RE = /\b(?:\d[\s-]?){12,24}\d\b/g;

const OTP_RE =
  /\b((?:OTP|PIN|code|verification\s+code)\s*(?:is|:)?\s*)(\d{4,8})\b/gi;

function redactCards(text: string): string {
  return text.replace(CARD_CANDIDATE_RE, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length >= 13 && digits.length <= 19) return "[CARD]";
    return match;
  });
}

export function redactPii(text: string): string {
  if (!text) return text;
  let out = text.replace(EMAIL_RE, "[EMAIL]");
  // Cards before phones — PANs are longer digit runs that otherwise match PHONE_RE.
  out = redactCards(out);
  out = out.replace(PHONE_RE, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15) return "[PHONE]";
    return match;
  });
  out = out.replace(OTP_RE, "$1[CODE]");
  return out;
}
