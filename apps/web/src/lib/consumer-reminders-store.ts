import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getPool, query } from "@/lib/pg";
import { ensureMigrations } from "@/lib/migrate";
import { ownerFileKey, validOwner, type MemoryOwner } from "@/lib/consumer-memory-store";
import { parseWhen, nextOccurrence, type RecurrenceRule } from "@/lib/reminder-time";

/**
 * In-app reminders for the personal assistant (Phase 1). Same B2B2C tenancy as the memory stores —
 * everything is owned by (tenantId, consumerId), so one brand's users never see another's. Postgres
 * when DATABASE_URL is set, else a JSON file fallback.
 *
 * A reminder is created when the assistant calls set_reminder (persisted from the turn, see
 * consumer-turn.ts) and surfaced in the user's app. Delivery today is in-app only; the honest copy
 * in the manifest reflects that. Out-of-app channels (push / SMS / WhatsApp) are a later phase, which
 * is why `channel` is captured but not acted on yet.
 */

const MAX_TEXT = 300;
const MAX_LIST = 100;

export type ReminderStatus = "pending" | "done";

export type ReminderRecord = {
  id: string;
  text: string;
  firesAt: string;
  recurring: RecurrenceRule;
  channel: string;
  status: ReminderStatus;
  createdAt: string;
};

export type ReminderInput = {
  /** What to nudge about, phrased to stand on its own later. */
  text: string;
  /** Natural-language time from the user ("in 2 hours", "tomorrow 8am", "every Sunday evening"). */
  when: string;
  /** Where they asked to be reached, if stated. Stored for later phases; app-only for now. */
  channel?: string;
};

export type SaveReminderResult = { saved: boolean; id: string; firesAt: string; recurring: RecurrenceRule };

function trimTo(raw: string | undefined, max = MAX_TEXT): string {
  return (raw ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function normalizeChannel(raw: string | undefined): string {
  const c = (raw ?? "").trim().toLowerCase();
  return /whatsapp|sms|push|email|voice/.test(c) ? c : "app";
}

// ---- file fallback ----

type ReminderFile = Record<string, ReminderRecord[]>;
const g = globalThis as typeof globalThis & {
  __miaiReminders?: Map<string, ReminderRecord[]>;
  __miaiRemindersHydrated?: boolean;
};

function storePath(): string {
  return process.env.CONSUMER_REMINDERS_STORE_PATH
    ? path.resolve(process.env.CONSUMER_REMINDERS_STORE_PATH)
    : path.resolve(process.cwd(), "../../data/consumer-reminders.json");
}

async function remindersMem(): Promise<Map<string, ReminderRecord[]>> {
  if (g.__miaiReminders && g.__miaiRemindersHydrated) return g.__miaiReminders;
  const map = g.__miaiReminders ?? new Map<string, ReminderRecord[]>();
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    for (const [k, v] of Object.entries(JSON.parse(raw) as ReminderFile)) map.set(k, v);
  } catch {
    /* no file yet */
  }
  g.__miaiReminders = map;
  g.__miaiRemindersHydrated = true;
  return map;
}

async function writeReminders(map: Map<string, ReminderRecord[]>): Promise<void> {
  const obj: ReminderFile = {};
  for (const [k, v] of map) obj[k] = v;
  await fs.writeFile(storePath(), JSON.stringify(obj, null, 2), "utf8");
}

function byFiresAt(a: ReminderRecord, b: ReminderRecord): number {
  return (Date.parse(a.firesAt) || 0) - (Date.parse(b.firesAt) || 0);
}

/** Create a reminder from the assistant's set_reminder args, resolving the fire time. */
export async function setReminder(
  owner: MemoryOwner,
  input: ReminderInput,
  now: Date = new Date(),
): Promise<SaveReminderResult> {
  const text = trimTo(input.text);
  if (!validOwner(owner) || !text) return { saved: false, id: "", firesAt: "", recurring: "" };
  const { firesAt, recurring } = parseWhen(input.when, now);
  const channel = normalizeChannel(input.channel);
  const id = randomUUID();

  if (getPool()) {
    await ensureMigrations();
    await query(
      `INSERT INTO miai_consumer_reminder
         (tenant_id, consumer_id, id, text, fires_at, recurring, channel, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',NOW())`,
      [owner.tenantId, owner.consumerId, id, text, firesAt, recurring, channel],
    );
    return { saved: true, id, firesAt, recurring };
  }

  const map = await remindersMem();
  const bucket = ownerFileKey(owner);
  const list = map.get(bucket) ?? [];
  list.push({ id, text, firesAt, recurring, channel, status: "pending", createdAt: now.toISOString() });
  map.set(bucket, list);
  await writeReminders(map);
  return { saved: true, id, firesAt, recurring };
}

/** A person's pending reminders, soonest first. */
export async function listReminders(owner: MemoryOwner): Promise<ReminderRecord[]> {
  if (!validOwner(owner)) return [];
  if (getPool()) {
    await ensureMigrations();
    const res = await query<{
      id: string; text: string; fires_at: string; recurring: string; channel: string;
      status: string; created_at: string;
    }>(
      `SELECT id, text, fires_at, recurring, channel, status, created_at
       FROM miai_consumer_reminder
       WHERE tenant_id = $1 AND consumer_id = $2 AND status = 'pending'
       ORDER BY fires_at ASC LIMIT ${MAX_LIST}`,
      [owner.tenantId, owner.consumerId],
    );
    return res.rows.map((r) => ({
      id: r.id, text: r.text, firesAt: new Date(r.fires_at).toISOString(),
      recurring: (r.recurring || "") as RecurrenceRule, channel: r.channel,
      status: r.status as ReminderStatus, createdAt: new Date(r.created_at).toISOString(),
    }));
  }
  const map = await remindersMem();
  return [...(map.get(ownerFileKey(owner)) ?? [])]
    .filter((r) => r.status === "pending")
    .sort(byFiresAt)
    .slice(0, MAX_LIST);
}

/**
 * Dismiss a reminder. A one-off is marked done; a recurring one rolls forward to its next
 * occurrence so the standing nudge survives. Returns false if nothing matched.
 */
export async function dismissReminder(
  owner: MemoryOwner,
  id: string,
  now: Date = new Date(),
): Promise<boolean> {
  if (!validOwner(owner) || !id) return false;

  if (getPool()) {
    await ensureMigrations();
    const cur = await query<{ fires_at: string; recurring: string }>(
      `SELECT fires_at, recurring FROM miai_consumer_reminder
       WHERE tenant_id = $1 AND consumer_id = $2 AND id = $3 AND status = 'pending'`,
      [owner.tenantId, owner.consumerId, id],
    );
    const row = cur.rows[0];
    if (!row) return false;
    const next = nextOccurrence(new Date(row.fires_at).toISOString(), (row.recurring || "") as RecurrenceRule, now);
    if (next) {
      await query(
        `UPDATE miai_consumer_reminder SET fires_at = $4
         WHERE tenant_id = $1 AND consumer_id = $2 AND id = $3`,
        [owner.tenantId, owner.consumerId, id, next],
      );
    } else {
      await query(
        `UPDATE miai_consumer_reminder SET status = 'done'
         WHERE tenant_id = $1 AND consumer_id = $2 AND id = $3`,
        [owner.tenantId, owner.consumerId, id],
      );
    }
    return true;
  }

  const map = await remindersMem();
  const bucket = ownerFileKey(owner);
  const list = map.get(bucket) ?? [];
  const row = list.find((r) => r.id === id && r.status === "pending");
  if (!row) return false;
  const next = nextOccurrence(row.firesAt, row.recurring, now);
  if (next) row.firesAt = next;
  else row.status = "done";
  map.set(bucket, list);
  await writeReminders(map);
  return true;
}

/** Erase ALL reminders for a person (DSAR) — every status, not just pending. Returns the count. */
export async function eraseAllReminders(owner: MemoryOwner): Promise<number> {
  if (!validOwner(owner)) return 0;
  if (getPool()) {
    await ensureMigrations();
    const res = await query(
      "DELETE FROM miai_consumer_reminder WHERE tenant_id = $1 AND consumer_id = $2",
      [owner.tenantId, owner.consumerId],
    );
    return res.rowCount ?? 0;
  }
  const map = await remindersMem();
  const bucket = ownerFileKey(owner);
  const n = (map.get(bucket) ?? []).length;
  if (map.delete(bucket)) await writeReminders(map);
  return n;
}
