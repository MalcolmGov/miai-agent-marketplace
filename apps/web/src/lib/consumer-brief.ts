import { DEFAULT_CONSUMER_AGENT } from "@/lib/consumer";
import { runConsumerTurn } from "@/lib/consumer-turn";
import {
  getBriefRecord,
  listBriefRecords,
  recordBriefSent,
  type BriefConfig,
} from "@/lib/consumer-brief-store";

/** The synthetic message that produces a morning brief. Kept here so on-demand and scheduled
 *  runs are identical. */
const BRIEF_PROMPT = [
  "Give me my morning brief for today.",
  "Pull it together from what's actually on my plate: today's calendar, anything time-sensitive",
  "or needing a reply in my inbox, and any tasks or reminders that are due.",
  "Keep it short and scannable — a few lines, most useful first — and end with the single best",
  "next action. If a connected account isn't linked yet, just say so briefly and skip it.",
].join(" ");

/** The consumer's local calendar date (YYYY-MM-DD) and hour (0–23) for an instant. Throws on an
 *  invalid timezone — callers treat that as "not due". */
export function localDateHour(nowUtc: Date, timezone: string): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(nowUtc);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hourRaw = get("hour");
  // hour12:false yields "24" at local midnight in some ICU builds — normalise to 0.
  const hour = hourRaw === "24" ? 0 : Number.parseInt(hourRaw, 10);
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour };
}

/** Whether a consumer's brief should fire at this instant: enabled, it's their chosen local hour,
 *  and it hasn't already gone out today (in their timezone). */
export function isBriefDue(config: BriefConfig, lastSentOn: string | null, nowUtc: Date): boolean {
  if (!config.enabled) return false;
  let local: { date: string; hour: number };
  try {
    local = localDateHour(nowUtc, config.timezone);
  } catch {
    return false; // invalid timezone → never due (rather than throwing in the sweep)
  }
  if (local.hour !== config.hour) return false;
  return lastSentOn !== local.date;
}

export type BriefRunResult = { ok: true; text: string } | { ok: false; error: string };

/** Generate (and store) a consumer's brief now, metering the turn to their own wallet. */
export async function generateDailyBrief(consumerId: string, nowUtc: Date): Promise<BriefRunResult> {
  const record = await getBriefRecord(consumerId);
  let localDate: string;
  try {
    localDate = localDateHour(nowUtc, record.config.timezone).date;
  } catch {
    localDate = localDateHour(nowUtc, "UTC").date;
  }

  const result = await runConsumerTurn({
    consumerId,
    walletId: consumerId,
    agentId: DEFAULT_CONSUMER_AGENT,
    message: BRIEF_PROMPT,
    sessionId: "daily-brief",
    rateLimitOk: true,
  });

  if (!result.ok) return { ok: false, error: result.error };

  await recordBriefSent(
    consumerId,
    { text: result.assistantMessage, generatedAt: nowUtc.toISOString(), tokensDebited: result.tokensDebited },
    localDate,
  );
  return { ok: true, text: result.assistantMessage };
}

/** Sweep: run the brief for every consumer whose schedule is due right now. Invoked by the cron
 *  endpoint. Returns which consumers ran so the caller can log volume. */
export async function runDueBriefs(nowUtc: Date): Promise<{ ran: string[]; considered: number; failed: number }> {
  const all = await listBriefRecords();
  const ran: string[] = [];
  let failed = 0;
  for (const { consumerId, record } of all) {
    if (!isBriefDue(record.config, record.lastSentOn, nowUtc)) continue;
    const res = await generateDailyBrief(consumerId, nowUtc);
    if (res.ok) ran.push(consumerId);
    else failed += 1;
  }
  return { ran, considered: all.length, failed };
}
