import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getPool, query } from "@/lib/pg";
import { ensureMigrations } from "@/lib/migrate";

/**
 * Durable per-consumer memory for the personal assistant.
 *
 * The `remember_about_me` tool promises the user their facts and preferences are kept "across
 * conversations"; this is where that promise is actually honoured. Facts are stored per consumer
 * (keyed by their account id — the same id the wallet and connector tokens use) and injected back
 * into the system prompt on later turns, so the assistant feels like *theirs*, not a generic bot.
 *
 * Design mirrors consumer-brief-store: Postgres when DATABASE_URL is set, else a JSON file
 * fallback for dev/test. Nothing here reaches the model directly — consumer-turn.ts composes the
 * memory block into the turn and persists tool-emitted facts after it.
 */

export type MemoryRecord = {
  id: string;
  /** Free-form grouping the tool may pass, e.g. "preferences", "contacts", "travel". */
  category: string;
  /** The remembered thing, stated plainly. */
  content: string;
  /** Where it came from — "assistant" (a remember_about_me tool call) by default. */
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type RememberInput = {
  content: string;
  category?: string;
  source?: string;
};

const DEFAULT_CATEGORY = "general";
const DEFAULT_SOURCE = "assistant";

/** How much remembered content we're willing to store per item (keeps a stray essay out). */
const MAX_CONTENT_CHARS = 500;
/** Never inject more than this many memory bullets into a single turn. */
const MAX_BLOCK_ITEMS = 30;
/** Character budget for the injected bullet lines (excludes the header). */
const MAX_BLOCK_CHARS = 1600;

const STOP_WORDS = new Set([
  "that", "this", "with", "from", "what", "when", "where", "have", "will", "your", "about",
  "there", "their", "which", "also", "just", "like", "more", "some", "than", "then", "them",
  "they", "been", "into", "over", "such", "each", "were", "very", "even", "most", "would",
  "could", "should", "please", "tell", "know", "want", "need", "make", "does",
]);

/** Normalized dedupe key: lowercased, whitespace-collapsed prefix of the content. */
export function contentKey(content: string): string {
  return content.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80);
}

function normalizeContent(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, MAX_CONTENT_CHARS);
}

/** Meaningful query words (>= 4 chars, not stopwords) used for keyword relevance. */
export function keywordsOf(query: string): string[] {
  const seen = new Set<string>();
  for (const w of query.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? []) {
    if (!STOP_WORDS.has(w)) seen.add(w);
    if (seen.size >= 8) break;
  }
  return [...seen];
}

/**
 * Rank + trim remembered items into a system-prompt block for one turn. Pure (no I/O) so it can
 * be unit-tested. Items relevant to the current message surface first; the rest fill by recency,
 * all under a bounded item/char budget so long histories can't blow the context.
 */
export function buildMemoryBlock(memories: MemoryRecord[], userMessage: string): string {
  if (!memories.length) return "";
  const words = keywordsOf(userMessage);

  const scored = memories.map((m) => {
    const hay = m.content.toLowerCase();
    let relevance = 0;
    for (const w of words) if (hay.includes(w)) relevance += 1;
    return { m, relevance, ts: Date.parse(m.updatedAt) || 0 };
  });
  scored.sort((a, b) => b.relevance - a.relevance || b.ts - a.ts);

  const lines: string[] = [];
  let used = 0;
  for (const { m } of scored) {
    if (lines.length >= MAX_BLOCK_ITEMS) break;
    const label = m.category && m.category !== DEFAULT_CATEGORY ? `[${m.category}] ` : "";
    const line = `- ${label}${m.content}`;
    if (used + line.length > MAX_BLOCK_CHARS && lines.length > 0) break;
    lines.push(line);
    used += line.length + 1;
  }
  if (!lines.length) return "";

  return [
    "## What you remember about this person",
    "These are durable facts and preferences they've asked you to keep across conversations.",
    "Use them naturally to personalise your help — don't recite the list back, and don't mention",
    "that you stored them.",
    "",
    ...lines,
  ].join("\n");
}

// ---- file fallback (dev/test; no DATABASE_URL) ----

type FileShape = Record<string, MemoryRecord[]>;
const g = globalThis as typeof globalThis & {
  __miaiMemoryMem?: Map<string, MemoryRecord[]>;
  __miaiMemoryHydrated?: boolean;
};

function fileStorePath(): string {
  if (process.env.CONSUMER_MEMORY_STORE_PATH) {
    return path.resolve(process.env.CONSUMER_MEMORY_STORE_PATH);
  }
  return path.resolve(process.cwd(), "../../data/consumer-memory.json");
}

async function fileMem(): Promise<Map<string, MemoryRecord[]>> {
  if (g.__miaiMemoryMem && g.__miaiMemoryHydrated) return g.__miaiMemoryMem;
  const map = g.__miaiMemoryMem ?? new Map<string, MemoryRecord[]>();
  try {
    const raw = await fs.readFile(fileStorePath(), "utf8");
    for (const [k, v] of Object.entries(JSON.parse(raw) as FileShape)) map.set(k, v);
  } catch {
    /* no file yet */
  }
  g.__miaiMemoryMem = map;
  g.__miaiMemoryHydrated = true;
  return map;
}

async function fileWrite(map: Map<string, MemoryRecord[]>): Promise<void> {
  const obj: FileShape = {};
  for (const [k, v] of map) obj[k] = v;
  await fs.writeFile(fileStorePath(), JSON.stringify(obj, null, 2), "utf8");
}

// ---- public API (pg when DATABASE_URL, else file) ----

export type RememberResult = { remembered: boolean; id: string };

/**
 * Store one remembered fact/preference for a consumer. Deduplicates on the normalized content
 * prefix: re-remembering the same thing refreshes it (bumps updated_at, keeps the id) rather than
 * piling up duplicates. Empty content is a no-op. Best-effort — callers should not fail a turn on
 * a memory write error.
 */
export async function rememberFact(
  consumerId: string,
  input: RememberInput,
): Promise<RememberResult> {
  const content = normalizeContent(input.content ?? "");
  if (!consumerId || !content) return { remembered: false, id: "" };
  const category = (input.category?.trim() || DEFAULT_CATEGORY).slice(0, 60);
  const source = (input.source?.trim() || DEFAULT_SOURCE).slice(0, 40);
  const key = contentKey(content);

  if (getPool()) {
    await ensureMigrations();
    // Upsert by (consumer_id, content_key): refresh content/category and bump updated_at, keeping
    // the original id on conflict so re-remembering is idempotent.
    const id = randomUUID();
    const res = await query<{ id: string }>(
      `INSERT INTO miai_consumer_memory (consumer_id, id, category, content, content_key, source)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (consumer_id, content_key)
       DO UPDATE SET content = EXCLUDED.content, category = EXCLUDED.category,
                     source = EXCLUDED.source, updated_at = NOW()
       RETURNING id`,
      [consumerId, id, category, content, key, source],
    );
    return { remembered: true, id: res.rows[0]?.id ?? id };
  }

  const map = await fileMem();
  const list = map.get(consumerId) ?? [];
  const now = new Date().toISOString();
  const existing = list.find((m) => contentKey(m.content) === key);
  let id: string;
  if (existing) {
    existing.content = content;
    existing.category = category;
    existing.source = source;
    existing.updatedAt = now;
    id = existing.id;
  } else {
    id = randomUUID();
    list.push({ id, category, content, source, createdAt: now, updatedAt: now });
  }
  map.set(consumerId, list);
  await fileWrite(map);
  return { remembered: true, id };
}

/** All remembered items for a consumer, most-recently-updated first. */
export async function listMemories(consumerId: string): Promise<MemoryRecord[]> {
  if (!consumerId) return [];
  if (getPool()) {
    await ensureMigrations();
    const res = await query<{
      id: string;
      category: string;
      content: string;
      source: string;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, category, content, source, created_at, updated_at
       FROM miai_consumer_memory WHERE consumer_id = $1 ORDER BY updated_at DESC`,
      [consumerId],
    );
    return res.rows.map((r) => ({
      id: r.id,
      category: r.category,
      content: r.content,
      source: r.source,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    }));
  }
  const map = await fileMem();
  const list = [...(map.get(consumerId) ?? [])];
  list.sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0));
  return list;
}

/** Delete one remembered item by id. Returns whether a row was removed. */
export async function forgetMemory(consumerId: string, id: string): Promise<boolean> {
  if (!consumerId || !id) return false;
  if (getPool()) {
    await ensureMigrations();
    const res = await query(
      "DELETE FROM miai_consumer_memory WHERE consumer_id = $1 AND id = $2",
      [consumerId, id],
    );
    return (res.rowCount ?? 0) > 0;
  }
  const map = await fileMem();
  const list = map.get(consumerId) ?? [];
  const next = list.filter((m) => m.id !== id);
  if (next.length === list.length) return false;
  map.set(consumerId, next);
  await fileWrite(map);
  return true;
}

/**
 * The memory block to append to a turn's system prompt, relevance-ranked against the user's
 * message. Returns "" when the consumer has no memory (nothing to inject). Never throws — a
 * memory read must not break a chat turn.
 */
export async function getMemoryContext(consumerId: string, userMessage: string): Promise<string> {
  if (!consumerId) return "";
  try {
    const memories = await listMemories(consumerId);
    return buildMemoryBlock(memories, userMessage ?? "");
  } catch {
    return "";
  }
}
