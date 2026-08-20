import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getPool, query } from "@/lib/pg";
import { ensureMigrations } from "@/lib/migrate";
import {
  contentKey,
  ownerFileKey,
  validOwner,
  type MemoryOwner,
} from "@/lib/consumer-memory-store";

/**
 * The "life graph" layer of durable memory: goals and the people in the user's life. Same B2B2C
 * tenancy as the facts store — everything is owned by (tenantId, consumerId), so one brand's users
 * can never see another's. Postgres when DATABASE_URL is set, else a JSON file fallback.
 *
 * Like facts, these are injected back into each turn's system prompt (via consumer-turn.ts) and
 * written by the assistant's tools (set_goal, remember_person).
 */

const MAX_GOALS_IN_BLOCK = 10;
const MAX_PEOPLE_IN_BLOCK = 15;
const MAX_TEXT = 400;

function clampProgress(n: number | undefined): number | undefined {
  if (typeof n !== "number" || Number.isNaN(n)) return undefined;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function trimTo(raw: string | undefined, max = MAX_TEXT): string {
  return (raw ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

// ---- file fallback ----

type GoalFile = Record<string, GoalRecord[]>;
type PersonFile = Record<string, PersonRecord[]>;
const g = globalThis as typeof globalThis & {
  __miaiGoals?: Map<string, GoalRecord[]>;
  __miaiGoalsHydrated?: boolean;
  __miaiPeople?: Map<string, PersonRecord[]>;
  __miaiPeopleHydrated?: boolean;
};

function goalPath(): string {
  return process.env.CONSUMER_GOALS_STORE_PATH
    ? path.resolve(process.env.CONSUMER_GOALS_STORE_PATH)
    : path.resolve(process.cwd(), "../../data/consumer-goals.json");
}
function peoplePath(): string {
  return process.env.CONSUMER_PEOPLE_STORE_PATH
    ? path.resolve(process.env.CONSUMER_PEOPLE_STORE_PATH)
    : path.resolve(process.cwd(), "../../data/consumer-people.json");
}

async function goalsMem(): Promise<Map<string, GoalRecord[]>> {
  if (g.__miaiGoals && g.__miaiGoalsHydrated) return g.__miaiGoals;
  const map = g.__miaiGoals ?? new Map<string, GoalRecord[]>();
  try {
    const raw = await fs.readFile(goalPath(), "utf8");
    for (const [k, v] of Object.entries(JSON.parse(raw) as GoalFile)) map.set(k, v);
  } catch {
    /* no file yet */
  }
  g.__miaiGoals = map;
  g.__miaiGoalsHydrated = true;
  return map;
}
async function peopleMem(): Promise<Map<string, PersonRecord[]>> {
  if (g.__miaiPeople && g.__miaiPeopleHydrated) return g.__miaiPeople;
  const map = g.__miaiPeople ?? new Map<string, PersonRecord[]>();
  try {
    const raw = await fs.readFile(peoplePath(), "utf8");
    for (const [k, v] of Object.entries(JSON.parse(raw) as PersonFile)) map.set(k, v);
  } catch {
    /* no file yet */
  }
  g.__miaiPeople = map;
  g.__miaiPeopleHydrated = true;
  return map;
}

// ---------------------------------------------------------------- goals

export type GoalRecord = {
  id: string;
  title: string;
  detail: string;
  target: string;
  progress: number;
  deadline: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type GoalInput = {
  title: string;
  detail?: string;
  target?: string;
  progress?: number;
  deadline?: string;
  status?: string;
};

export type SaveResult = { saved: boolean; id: string };

/** Merge a partial update onto an existing goal (or blank defaults for a new one). */
function mergeGoal(existing: GoalRecord | undefined, input: GoalInput, now: string): GoalRecord {
  const progress = clampProgress(input.progress);
  return {
    id: existing?.id ?? randomUUID(),
    title: trimTo(input.title, 160) || existing?.title || "",
    detail: input.detail !== undefined ? trimTo(input.detail) : existing?.detail ?? "",
    target: input.target !== undefined ? trimTo(input.target, 120) : existing?.target ?? "",
    progress: progress ?? existing?.progress ?? 0,
    deadline: input.deadline !== undefined ? trimTo(input.deadline, 60) : existing?.deadline ?? "",
    status: (input.status?.trim() || existing?.status || "active").slice(0, 20),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

/** Create or update a goal, deduped on the normalized title within the owner. */
export async function setGoal(owner: MemoryOwner, input: GoalInput): Promise<SaveResult> {
  const title = trimTo(input.title, 160);
  if (!validOwner(owner) || !title) return { saved: false, id: "" };
  const key = contentKey(title);
  const now = new Date().toISOString();

  if (getPool()) {
    await ensureMigrations();
    const existing = (await listGoals(owner)).find((x) => contentKey(x.title) === key);
    const row = mergeGoal(existing, input, now);
    await query(
      `INSERT INTO miai_consumer_goal
         (tenant_id, consumer_id, id, title, title_key, detail, target, progress, deadline, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
       ON CONFLICT (tenant_id, consumer_id, title_key)
       DO UPDATE SET title = EXCLUDED.title, detail = EXCLUDED.detail, target = EXCLUDED.target,
                     progress = EXCLUDED.progress, deadline = EXCLUDED.deadline,
                     status = EXCLUDED.status, updated_at = NOW()`,
      [owner.tenantId, owner.consumerId, row.id, row.title, key, row.detail, row.target,
       row.progress, row.deadline, row.status],
    );
    return { saved: true, id: row.id };
  }

  const map = await goalsMem();
  const bucket = ownerFileKey(owner);
  const list = map.get(bucket) ?? [];
  const idx = list.findIndex((x) => contentKey(x.title) === key);
  const row = mergeGoal(idx >= 0 ? list[idx] : undefined, input, now);
  if (idx >= 0) list[idx] = row;
  else list.push(row);
  map.set(bucket, list);
  await writeGoals(map);
  return { saved: true, id: row.id };
}

async function writeGoals(map: Map<string, GoalRecord[]>): Promise<void> {
  const obj: GoalFile = {};
  for (const [k, v] of map) obj[k] = v;
  await fs.writeFile(goalPath(), JSON.stringify(obj, null, 2), "utf8");
}

/** All goals for an owner, active first, then most-recently-updated. */
export async function listGoals(owner: MemoryOwner): Promise<GoalRecord[]> {
  if (!validOwner(owner)) return [];
  if (getPool()) {
    await ensureMigrations();
    const res = await query<{
      id: string; title: string; detail: string; target: string; progress: number;
      deadline: string; status: string; created_at: string; updated_at: string;
    }>(
      `SELECT id, title, detail, target, progress, deadline, status, created_at, updated_at
       FROM miai_consumer_goal WHERE tenant_id = $1 AND consumer_id = $2 ORDER BY updated_at DESC`,
      [owner.tenantId, owner.consumerId],
    );
    return res.rows.map((r) => ({
      id: r.id, title: r.title, detail: r.detail, target: r.target, progress: r.progress,
      deadline: r.deadline, status: r.status,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    })).sort(byActiveThenRecent);
  }
  const map = await goalsMem();
  return [...(map.get(ownerFileKey(owner)) ?? [])].sort(byActiveThenRecent);
}

function byActiveThenRecent(a: GoalRecord, b: GoalRecord): number {
  const av = a.status === "active" ? 0 : 1;
  const bv = b.status === "active" ? 0 : 1;
  return av - bv || (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0);
}

/** Delete one goal by id, within the owner. */
export async function forgetGoal(owner: MemoryOwner, id: string): Promise<boolean> {
  if (!validOwner(owner) || !id) return false;
  if (getPool()) {
    await ensureMigrations();
    const res = await query(
      "DELETE FROM miai_consumer_goal WHERE tenant_id = $1 AND consumer_id = $2 AND id = $3",
      [owner.tenantId, owner.consumerId, id],
    );
    return (res.rowCount ?? 0) > 0;
  }
  const map = await goalsMem();
  const bucket = ownerFileKey(owner);
  const list = map.get(bucket) ?? [];
  const next = list.filter((x) => x.id !== id);
  if (next.length === list.length) return false;
  map.set(bucket, next);
  await writeGoals(map);
  return true;
}

/** Render active goals as a system-prompt block. Pure. */
export function buildGoalsBlock(goals: GoalRecord[]): string {
  const active = goals.filter((x) => x.status === "active").slice(0, MAX_GOALS_IN_BLOCK);
  if (!active.length) return "";
  const lines = active.map((x) => {
    const bits: string[] = [];
    if (x.progress > 0) bits.push(`${x.progress}%`);
    if (x.target) bits.push(`target: ${x.target}`);
    if (x.deadline) bits.push(`by ${x.deadline}`);
    const meta = bits.length ? ` (${bits.join(", ")})` : "";
    return `- ${x.title}${meta}`;
  });
  return [
    "## Their goals",
    "Objectives they're working toward. Bring them up when relevant and help them make progress.",
    "",
    ...lines,
  ].join("\n");
}

export async function getGoalsContext(owner: MemoryOwner): Promise<string> {
  if (!validOwner(owner)) return "";
  try {
    return buildGoalsBlock(await listGoals(owner));
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------- people

export type PersonRecord = {
  id: string;
  name: string;
  relationship: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type PersonInput = { name: string; relationship?: string; notes?: string };

function mergePerson(existing: PersonRecord | undefined, input: PersonInput, now: string): PersonRecord {
  return {
    id: existing?.id ?? randomUUID(),
    name: trimTo(input.name, 120) || existing?.name || "",
    relationship:
      input.relationship !== undefined ? trimTo(input.relationship, 60) : existing?.relationship ?? "",
    notes: input.notes !== undefined ? trimTo(input.notes) : existing?.notes ?? "",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

/** Create or update a person, deduped on the normalized name within the owner. */
export async function rememberPerson(owner: MemoryOwner, input: PersonInput): Promise<SaveResult> {
  const name = trimTo(input.name, 120);
  if (!validOwner(owner) || !name) return { saved: false, id: "" };
  const key = contentKey(name);
  const now = new Date().toISOString();

  if (getPool()) {
    await ensureMigrations();
    const existing = (await listPeople(owner)).find((x) => contentKey(x.name) === key);
    const row = mergePerson(existing, input, now);
    await query(
      `INSERT INTO miai_consumer_person
         (tenant_id, consumer_id, id, name, name_key, relationship, notes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
       ON CONFLICT (tenant_id, consumer_id, name_key)
       DO UPDATE SET name = EXCLUDED.name, relationship = EXCLUDED.relationship,
                     notes = EXCLUDED.notes, updated_at = NOW()`,
      [owner.tenantId, owner.consumerId, row.id, row.name, key, row.relationship, row.notes],
    );
    return { saved: true, id: row.id };
  }

  const map = await peopleMem();
  const bucket = ownerFileKey(owner);
  const list = map.get(bucket) ?? [];
  const idx = list.findIndex((x) => contentKey(x.name) === key);
  const row = mergePerson(idx >= 0 ? list[idx] : undefined, input, now);
  if (idx >= 0) list[idx] = row;
  else list.push(row);
  map.set(bucket, list);
  await writePeople(map);
  return { saved: true, id: row.id };
}

async function writePeople(map: Map<string, PersonRecord[]>): Promise<void> {
  const obj: PersonFile = {};
  for (const [k, v] of map) obj[k] = v;
  await fs.writeFile(peoplePath(), JSON.stringify(obj, null, 2), "utf8");
}

/** All people for an owner, most-recently-updated first. */
export async function listPeople(owner: MemoryOwner): Promise<PersonRecord[]> {
  if (!validOwner(owner)) return [];
  if (getPool()) {
    await ensureMigrations();
    const res = await query<{
      id: string; name: string; relationship: string; notes: string;
      created_at: string; updated_at: string;
    }>(
      `SELECT id, name, relationship, notes, created_at, updated_at
       FROM miai_consumer_person WHERE tenant_id = $1 AND consumer_id = $2 ORDER BY updated_at DESC`,
      [owner.tenantId, owner.consumerId],
    );
    return res.rows.map((r) => ({
      id: r.id, name: r.name, relationship: r.relationship, notes: r.notes,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    }));
  }
  const map = await peopleMem();
  return [...(map.get(ownerFileKey(owner)) ?? [])].sort(
    (a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0),
  );
}

/** Delete one person by id, within the owner. */
export async function forgetPerson(owner: MemoryOwner, id: string): Promise<boolean> {
  if (!validOwner(owner) || !id) return false;
  if (getPool()) {
    await ensureMigrations();
    const res = await query(
      "DELETE FROM miai_consumer_person WHERE tenant_id = $1 AND consumer_id = $2 AND id = $3",
      [owner.tenantId, owner.consumerId, id],
    );
    return (res.rowCount ?? 0) > 0;
  }
  const map = await peopleMem();
  const bucket = ownerFileKey(owner);
  const list = map.get(bucket) ?? [];
  const next = list.filter((x) => x.id !== id);
  if (next.length === list.length) return false;
  map.set(bucket, next);
  await writePeople(map);
  return true;
}

/** Render the people graph as a system-prompt block. Pure. */
export function buildPeopleBlock(people: PersonRecord[]): string {
  if (!people.length) return "";
  const lines = people.slice(0, MAX_PEOPLE_IN_BLOCK).map((p) => {
    const rel = p.relationship ? ` (${p.relationship})` : "";
    const note = p.notes ? ` — ${p.notes}` : "";
    return `- ${p.name}${rel}${note}`;
  });
  return [
    "## People in their life",
    "Who matters to them and how they're related. Use this to know who they mean by a name or role.",
    "",
    ...lines,
  ].join("\n");
}

export async function getPeopleContext(owner: MemoryOwner): Promise<string> {
  if (!validOwner(owner)) return "";
  try {
    return buildPeopleBlock(await listPeople(owner));
  } catch {
    return "";
  }
}
