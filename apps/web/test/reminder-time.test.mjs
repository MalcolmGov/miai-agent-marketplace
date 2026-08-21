/**
 * Reminder time parsing — natural-language "when" → a concrete fire time + recurrence. Pure and
 * deterministic. Uses a locally-constructed `now` and local getters (getHours/getDate) so the
 * assertions hold regardless of the machine timezone.
 */
import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

let rt;
before(async () => {
  rt = await import("../src/lib/reminder-time.ts");
});

// Local Aug 21 2026 (a Friday) at 10:00.
const NOW = new Date(2026, 7, 21, 10, 0, 0, 0);
const p = (text) => rt.parseWhen(text, NOW);
const at = (iso) => new Date(iso);

describe("parseWhen — relative offsets (exact ms)", () => {
  it("in N hours / minutes / days", () => {
    assert.equal(at(p("remind me in 2 hours to stretch").firesAt).getTime(), NOW.getTime() + 2 * 3600_000);
    assert.equal(at(p("in 30 minutes").firesAt).getTime(), NOW.getTime() + 30 * 60_000);
    assert.equal(at(p("in 3 days").firesAt).getTime(), NOW.getTime() + 3 * 86400_000);
  });
});

describe("parseWhen — day + time anchors", () => {
  it("tomorrow 8am", () => {
    const d = at(p("tomorrow 8am").firesAt);
    assert.equal(d.getHours(), 8);
    assert.equal(d.getMinutes(), 0);
    assert.equal(d.getDate(), 22); // next day
  });
  it("tomorrow with no time defaults to 9am", () => {
    const d = at(p("remind me tomorrow to call the dentist").firesAt);
    assert.equal(d.getHours(), 9);
    assert.equal(d.getDate(), 22);
  });
  it("tonight → 8pm today", () => {
    const d = at(p("remind me tonight").firesAt);
    assert.equal(d.getHours(), 20);
    assert.equal(d.getDate(), 21);
  });
  it("at 6pm today (time still ahead)", () => {
    const d = at(p("at 6pm").firesAt);
    assert.equal(d.getHours(), 18);
    assert.equal(d.getDate(), 21);
  });
  it("a past time-only phrase rolls to tomorrow", () => {
    const d = at(p("at 8am").firesAt); // 8am already passed at 10am now
    assert.equal(d.getHours(), 8);
    assert.equal(d.getDate(), 22);
  });
});

describe("parseWhen — recurrence", () => {
  it("every day at 7am → daily", () => {
    const r = p("every day at 7am take meds");
    assert.equal(r.recurring, "daily");
    assert.equal(at(r.firesAt).getHours(), 7);
  });
  it("every Sunday evening → weekly, Sunday, 6pm", () => {
    const r = p("every Sunday evening plan the week");
    assert.equal(r.recurring, "weekly");
    const d = at(r.firesAt);
    assert.equal(d.getDay(), 0); // Sunday
    assert.equal(d.getHours(), 18);
  });
  it("hourly", () => {
    assert.equal(p("every hour").recurring, "hourly");
  });
});

describe("parseWhen — fallback", () => {
  it("an unparseable phrase falls back to one hour out, one-off", () => {
    const r = p("whenever you get a chance");
    assert.equal(at(r.firesAt).getTime(), NOW.getTime() + 3600_000);
    assert.equal(r.recurring, "");
  });
});

describe("nextOccurrence", () => {
  it("daily advances past `from`, keeping the time of day", () => {
    const first = p("every day at 7am").firesAt;
    const next = rt.nextOccurrence(first, "daily", new Date(at(first).getTime() + 60_000));
    const d = at(next);
    assert.equal(d.getHours(), 7);
    assert.ok(d.getTime() > at(first).getTime());
  });
  it("returns null for one-offs", () => {
    assert.equal(rt.nextOccurrence(p("tomorrow 8am").firesAt, "", NOW), null);
  });
});
