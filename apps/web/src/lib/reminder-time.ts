/**
 * Turn a reminder's natural-language "when" (e.g. "in 2 hours", "tomorrow 8am", "every Sunday
 * evening") into a concrete fire time plus an optional recurrence rule. Deterministic and pure so
 * it's cheap and unit-testable: the model hands us words, this hands back a timestamp. Conservative
 * by design — when it can't understand the phrase it falls back to one hour out rather than guessing
 * wildly, and it never returns a time in the past for a one-off.
 */

export type RecurrenceRule = "" | "hourly" | "daily" | "weekly" | "monthly";
export type ParsedWhen = { firesAt: string; recurring: RecurrenceRule };

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const WEEK = 604_800_000;

const UNIT_MS: Record<string, number> = {
  min: MINUTE, mins: MINUTE, minute: MINUTE, minutes: MINUTE,
  hr: HOUR, hrs: HOUR, hour: HOUR, hours: HOUR,
  day: DAY, days: DAY,
  week: WEEK, weeks: WEEK,
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5, saturday: 6, sat: 6,
};

/** Named parts of the day → [hour, minute]. */
const NAMED_TIMES: Record<string, [number, number]> = {
  morning: [9, 0], noon: [12, 0], midday: [12, 0], afternoon: [14, 0],
  evening: [18, 0], tonight: [20, 0], night: [20, 0], midnight: [0, 0],
};

const DEFAULT_HOUR = 9; // a day with no stated time → 9am

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

/** Extract a clock time from a phrase: "at 8", "8am", "8:30 pm", "18:00", or a named part of day. */
export function extractTimeOfDay(t: string): [number, number] | null {
  // Explicit clock: "at 8", "at 8:30pm", "8am", "8:30 pm", "18:00".
  const at = t.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  const ampm = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  const hm = t.match(/\b(\d{1,2}):(\d{2})\b/);
  const m = at ?? ampm ?? hm;
  if (m) {
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const ap = m[3];
    if (h <= 23 && min <= 59) {
      if (ap === "pm" && h < 12) h += 12;
      if (ap === "am" && h === 12) h = 0;
      return [h, min];
    }
  }
  for (const [word, hm2] of Object.entries(NAMED_TIMES)) {
    if (new RegExp(`\\b${word}\\b`).test(t)) return hm2;
  }
  return null;
}

function detectRecurrence(t: string): RecurrenceRule {
  if (/\b(hourly|every\s+hour)\b/.test(t)) return "hourly";
  if (/\b(daily|every\s+day|each\s+day|every\s+morning|every\s+evening|every\s+night)\b/.test(t))
    return "daily";
  if (/\b(weekly|every\s+week|every\s+(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat))/.test(t))
    return "weekly";
  if (/\b(monthly|every\s+month)\b/.test(t)) return "monthly";
  return "";
}

/** The next date (>= now) whose weekday is `wd` (0=Sun). Same-day counts only if still ahead. */
function nextWeekday(now: Date, wd: number): Date {
  const d = new Date(now.getTime());
  const delta = (wd - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + (delta === 0 ? 7 : delta));
  return d;
}

function matchWeekday(t: string): number | null {
  for (const [word, n] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`\\b${word}\\b`).test(t)) return n;
  }
  return null;
}

/**
 * Parse a "when" phrase relative to `now` into a fire timestamp + recurrence.
 * Precedence: "in N units" → day anchor (tomorrow/today/weekday) + time-of-day → explicit date →
 * one-hour fallback.
 */
export function parseWhen(text: string, now: Date): ParsedWhen {
  const raw = (text ?? "").trim();
  const t = raw.toLowerCase();
  const recurring = detectRecurrence(t);

  // 1. Relative offset: "in 2 hours", "in 30 minutes", "in 3 days".
  const rel = t.match(/\bin\s+(\d+)\s*(minutes?|mins?|hours?|hrs?|days?|weeks?)\b/);
  if (rel) {
    const n = parseInt(rel[1], 10);
    const ms = UNIT_MS[rel[2]] ?? HOUR;
    return { firesAt: iso(now.getTime() + n * ms), recurring };
  }

  // 2. Day anchor + optional time of day.
  const base = new Date(now.getTime());
  let haveDay = false;
  if (/\btomorrow\b/.test(t)) {
    base.setDate(base.getDate() + 1);
    haveDay = true;
  } else if (/\b(today|tonight|this\s+(morning|afternoon|evening|night))\b/.test(t)) {
    haveDay = true;
  } else {
    const wd = matchWeekday(t);
    if (wd !== null) {
      base.setTime(nextWeekday(now, wd).getTime());
      haveDay = true;
    } else if (/\bnext\s+week\b/.test(t)) {
      base.setTime(now.getTime() + WEEK);
      haveDay = true;
    }
  }

  const tod = extractTimeOfDay(t);
  if (haveDay || tod) {
    const [h, m] = tod ?? [DEFAULT_HOUR, 0];
    base.setHours(h, m, 0, 0);
    // A time-only phrase ("at 6pm") that's already past today rolls to tomorrow.
    if (!haveDay && base.getTime() <= now.getTime()) base.setDate(base.getDate() + 1);
    return { firesAt: iso(base.getTime()), recurring };
  }

  // 3. An explicit machine date ("2026-09-10", "9/10 3pm") if present.
  if (/\d{4}-\d{2}-\d{2}/.test(raw) || /\b\d{1,2}\/\d{1,2}\b/.test(raw)) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return { firesAt: iso(d.getTime()), recurring };
  }

  // 4. Fallback — an hour out. Better a sane default than a wrong guess.
  return { firesAt: iso(now.getTime() + HOUR), recurring };
}

/** Advance a recurring reminder to its next fire after `from`. Returns null for one-offs. */
export function nextOccurrence(firesAt: string, recurring: RecurrenceRule, from: Date): string | null {
  if (!recurring) return null;
  const prev = new Date(firesAt);
  if (Number.isNaN(prev.getTime())) return null;
  const next = new Date(prev.getTime());
  // Step forward by the rule until we're strictly after `from`, preserving the time of day.
  let guard = 0;
  do {
    if (recurring === "hourly") next.setTime(next.getTime() + HOUR);
    else if (recurring === "daily") next.setDate(next.getDate() + 1);
    else if (recurring === "weekly") next.setDate(next.getDate() + 7);
    else if (recurring === "monthly") next.setMonth(next.getMonth() + 1);
    guard += 1;
  } while (next.getTime() <= from.getTime() && guard < 1000);
  return next.toISOString();
}
