import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { cosineSimilarity, createEmbedderFromEnv, semanticRetrievalEnabled } from "@miai/runtime";
import { getPool, query } from "@/lib/pg";
import { ensureMigrations } from "@/lib/migrate";

/**
 * Durable per-consumer memory for the personal assistant.
 *
 * The `remember_about_me` tool promises the user their facts and preferences are kept "across
 * conversations"; this is where that promise is actually honoured. Facts are injected back into the
 * system prompt on later turns, so the assistant feels like *theirs*, not a generic bot.
 *
 * Multi-tenant (B2B2C): the assistant is white-labelled to brands/carriers and to
 * MyInstantAI-direct consumers. The same person's account id can exist under more than one brand,
 * so the memory OWNER is (tenantId, consumerId) — never consumerId alone. Every read, dedupe and
 * write is scoped to both, so one brand's users can never see another brand's.
 *
 * Design mirrors consumer-brief-store: Postgres when DATABASE_URL is set, else a JSON file fallback
 * for dev/test. Nothing here reaches the model directly — consumer-turn.ts composes the memory
 * block into the turn and persists tool-emitted facts after it.
 */

/** Who a piece of memory belongs to: a person (consumerId) within a brand/workspace (tenantId). */
export type MemoryOwner = { tenantId: string; consumerId: string };

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

/** True when both halves of the owner are present — a memory op with a missing half is a no-op. */
export function validOwner(owner: MemoryOwner | null | undefined): owner is MemoryOwner {
  return Boolean(owner && owner.tenantId && owner.consumerId);
}

/** File-store map key for an owner — keeps every (tenant, consumer) pair in its own bucket. */
export function ownerFileKey(owner: MemoryOwner): string {
  return `${owner.tenantId}::${owner.consumerId}`;
}

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
/** Format an already-ranked memory list into the system-prompt block, under the item/char budget. */
function renderMemoryBlock(ranked: MemoryRecord[]): string {
  const lines: string[] = [];
  let used = 0;
  for (const m of ranked) {
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

/** Keyword-relevance ranking — the fallback when embeddings aren't available. */
function rankKeyword(memories: MemoryRecord[], userMessage: string): MemoryRecord[] {
  const words = keywordsOf(userMessage);
  return memories
    .map((m) => {
      const hay = m.content.toLowerCase();
      let relevance = 0;
      for (const w of words) if (hay.includes(w)) relevance += 1;
      return { m, relevance, ts: Date.parse(m.updatedAt) || 0 };
    })
    .sort((a, b) => b.relevance - a.relevance || b.ts - a.ts)
    .map((x) => x.m);
}

/**
 * Rank + trim remembered items into a system-prompt block for one turn, by keyword relevance to the
 * current message. Pure (no I/O), unit-testable, and the fallback when semantic retrieval is off.
 */
export function buildMemoryBlock(memories: MemoryRecord[], userMessage: string): string {
  if (!memories.length) return "";
  return renderMemoryBlock(rankKeyword(memories, userMessage));
}

/**
 * Rank memories by embedding similarity to the message (recall by meaning, not shared words), or
 * null when semantic retrieval isn't enabled / no embedder is configured.
 */
async function rankSemantic(
  memories: MemoryRecord[],
  userMessage: string,
): Promise<MemoryRecord[] | null> {
  if (!semanticRetrievalEnabled()) return null;
  const embedder = createEmbedderFromEnv();
  if (!embedder) return null;
  const vecs = await embedder.embed([userMessage, ...memories.map((m) => m.content)]);
  const query = vecs[0];
  if (!query) return null;
  return memories
    .map((m, i) => ({
      m,
      score: cosineSimilarity(query, vecs[i + 1] ?? []),
      ts: Date.parse(m.updatedAt) || 0,
    }))
    .sort((a, b) => b.score - a.score || b.ts - a.ts)
    .map((x) => x.m);
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
 * Store one remembered fact/preference for an owner. Deduplicates on the normalized content prefix
 * (within the owner): re-remembering the same thing refreshes it rather than piling up duplicates.
 * Empty content or an incomplete owner is a no-op. Best-effort — callers should not fail a turn on
 * a memory write error.
 */
export async function rememberFact(
  owner: MemoryOwner,
  input: RememberInput,
): Promise<RememberResult> {
  const content = normalizeContent(input.content ?? "");
  if (!validOwner(owner) || !content) return { remembered: false, id: "" };
  const category = (input.category?.trim() || DEFAULT_CATEGORY).slice(0, 60);
  const source = (input.source?.trim() || DEFAULT_SOURCE).slice(0, 40);
  const key = contentKey(content);

  if (getPool()) {
    await ensureMigrations();
    // Upsert by (tenant_id, consumer_id, content_key): refresh and bump updated_at, keeping the
    // original id on conflict so re-remembering is idempotent — scoped to this owner only.
    const id = randomUUID();
    const res = await query<{ id: string }>(
      `INSERT INTO miai_consumer_memory (tenant_id, consumer_id, id, category, content, content_key, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id, consumer_id, content_key)
       DO UPDATE SET content = EXCLUDED.content, category = EXCLUDED.category,
                     source = EXCLUDED.source, updated_at = NOW()
       RETURNING id`,
      [owner.tenantId, owner.consumerId, id, category, content, key, source],
    );
    return { remembered: true, id: res.rows[0]?.id ?? id };
  }

  const map = await fileMem();
  const bucket = ownerFileKey(owner);
  const list = map.get(bucket) ?? [];
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
  map.set(bucket, list);
  await fileWrite(map);
  return { remembered: true, id };
}

/** All remembered items for an owner, most-recently-updated first. */
export async function listMemories(owner: MemoryOwner): Promise<MemoryRecord[]> {
  if (!validOwner(owner)) return [];
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
       FROM miai_consumer_memory WHERE tenant_id = $1 AND consumer_id = $2 ORDER BY updated_at DESC`,
      [owner.tenantId, owner.consumerId],
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
  const list = [...(map.get(ownerFileKey(owner)) ?? [])];
  list.sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0));
  return list;
}

/** Delete one remembered item by id, within the owner. Returns whether a row was removed. */
export async function forgetMemory(owner: MemoryOwner, id: string): Promise<boolean> {
  if (!validOwner(owner) || !id) return false;
  if (getPool()) {
    await ensureMigrations();
    const res = await query(
      "DELETE FROM miai_consumer_memory WHERE tenant_id = $1 AND consumer_id = $2 AND id = $3",
      [owner.tenantId, owner.consumerId, id],
    );
    return (res.rowCount ?? 0) > 0;
  }
  const map = await fileMem();
  const bucket = ownerFileKey(owner);
  const list = map.get(bucket) ?? [];
  const next = list.filter((m) => m.id !== id);
  if (next.length === list.length) return false;
  map.set(bucket, next);
  await fileWrite(map);
  return true;
}

/**
 * The memory block to append to a turn's system prompt, relevance-ranked against the user's
 * message. Returns "" when the owner has no memory (nothing to inject). Never throws — a memory
 * read must not break a chat turn.
 */
export async function getMemoryContext(owner: MemoryOwner, userMessage: string): Promise<string> {
  if (!validOwner(owner)) return "";
  try {
    const memories = await listMemories(owner);
    if (!memories.length) return "";
    try {
      const semantic = await rankSemantic(memories, userMessage ?? "");
      if (semantic) return renderMemoryBlock(semantic);
    } catch {
      /* embeddings unavailable/failed — fall back to keyword relevance below */
    }
    return buildMemoryBlock(memories, userMessage ?? "");
  } catch {
    return "";
  }
}
