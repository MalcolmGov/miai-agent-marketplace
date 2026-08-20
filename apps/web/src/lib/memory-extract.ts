/**
 * Passive memory extraction — pull durable self-facts out of a user message that they revealed but
 * didn't explicitly ask the assistant to remember. Conservative and high-precision on purpose:
 * only a handful of clear "this is a lasting fact about me" patterns, so auto-memory stays trustworthy
 * rather than noisy. Pure + deterministic (no LLM call, no cost) so it's cheap and unit-testable.
 *
 * consumer-turn.ts runs this after each turn and stores the results with source "auto"; the store's
 * dedupe means anything the user also saved explicitly won't double up.
 */

export type ExtractedFact = { content: string; category: string };

const DIET =
  /\b(vegetarian|vegan|pescatarian|pescetarian|halal|kosher|gluten-?free|lactose[-\s]?intolerant|dairy-?free|nut-?free)\b/i;

/** Nouns after "my …" that are opinions/rhetoric, not durable attributes. */
const MY_X_STOP = new Set([
  "point", "guess", "question", "problem", "issue", "concern", "plan", "idea",
  "thought", "hope", "fear", "understanding", "bet", "take", "bad", "apologies",
  "only", "main", "best", "worry", "goal",
]);

/** Value starts that signal a clause, not a fact. */
const VALUE_LEAD_STOP = /^(that|to|because|going|gonna|not|so|just|still|really|actually)\b/i;

/** Looks like a secret we must never store. */
function isSensitive(s: string): boolean {
  if (/\b(password|passcode|pin|otp|cvv|card number|account number|secret)\b/i.test(s)) return true;
  if (/\d{6,}/.test(s.replace(/[\s-]/g, ""))) return true; // long digit run → card/account/OTP
  return false;
}

function tidy(s: string): string {
  return s.trim().replace(/\s+/g, " ").replace(/[\s,.;:!?]+$/, "").trim();
}

/**
 * Return 0–2 durable facts worth remembering from a single user message. Precision over recall —
 * misses are fine (the assistant can still use remember_about_me); false positives are not.
 */
export function extractDurableFacts(text: string): ExtractedFact[] {
  const raw = (text ?? "").trim();
  if (!raw || raw.length > 600) return [];

  const out: ExtractedFact[] = [];
  const seen = new Set<string>();
  const add = (content: string, category: string) => {
    const c = tidy(content);
    if (!c || c.length < 3 || c.length > 120 || isSensitive(c)) return;
    const key = c.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ content: c, category });
  };

  // Dietary preference — a clear, lasting fact.
  const diet = raw.match(DIET);
  if (diet) add(diet[1].toLowerCase(), "preferences");

  // Name — "my name is Sam" / "call me Sam" (capitalised to avoid "call me later").
  const name = raw.match(/\b(?:my name is|call me)\s+([A-Z][a-zA-Z'’-]{1,24})\b/);
  if (name) add(`name is ${name[1]}`, "profile");

  // Where they live — "I live/stay in <Place>". Capture only capitalised tokens so a trailing
  // lowercase word ("Lisbon now") doesn't get swallowed into the place name.
  const lives = raw.match(/\bI (?:live|stay)\s+in\s+([A-Z][\w'’-]*(?:\s+[A-Z][\w'’&.-]*){0,3})/);
  if (lives) add(`lives in ${tidy(lives[1])}`, "profile");

  // Where they work — "I work at/for <Org>" (capitalised org tokens).
  const work = raw.match(/\bI work\s+(?:at|for)\s+([A-Z][\w'’-]*(?:\s+[A-Z][\w'’&.,-]*){0,4})/);
  if (work) add(`works at ${tidy(work[1])}`, "work");

  // Allergies — "I'm allergic to <x>".
  const allergy = raw.match(/\bI(?:'m| am)\s+allergic\s+to\s+([a-zA-Z][\w'’ -]{1,30}?)(?=[.,!?]|$)/i);
  if (allergy) add(`allergic to ${tidy(allergy[1]).toLowerCase()}`, "health");

  // Attribute — "my <thing> is/are <value>", guarded against rhetoric and clauses.
  const myX = raw.match(/\bmy\s+([a-z][a-z ]{1,24}?)\s+(?:is|are)\s+([\w'’.,&()\/ -]{2,60}?)(?=[.!?]|$)/i);
  if (myX) {
    const noun = tidy(myX[1]).toLowerCase();
    const value = tidy(myX[2]);
    const firstNoun = noun.split(" ")[0];
    if (!MY_X_STOP.has(firstNoun) && !VALUE_LEAD_STOP.test(value)) {
      add(`my ${noun} is ${value}`, "profile");
    }
  }

  return out.slice(0, 2);
}
