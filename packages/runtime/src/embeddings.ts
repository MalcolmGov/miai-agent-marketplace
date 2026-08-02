/**
 * Embedding providers for semantic knowledge retrieval.
 *
 * Prefer OpenAI-compatible `/v1/embeddings` when configured; otherwise a
 * deterministic local hashing embedder keeps hybrid retrieval testable offline.
 */

export interface Embedder {
  readonly id: string;
  embed(texts: string[]): Promise<number[][]>;
}

const CACHE_MAX = 2_048;
const vectorCache = new Map<string, number[]>();

function env(name: string): string | undefined {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

function cacheKey(model: string, text: string): string {
  // FNV-1a 32-bit — good enough for cache keys; collision just re-embeds.
  let h = 0x811c9dc5;
  const s = `${model}\0${text}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${model}:${(h >>> 0).toString(16)}:${text.length}`;
}

function remember(key: string, vec: number[]): number[] {
  if (vectorCache.size >= CACHE_MAX) {
    const first = vectorCache.keys().next().value;
    if (first !== undefined) vectorCache.delete(first);
  }
  vectorCache.set(key, vec);
  return vec;
}

/** L2-normalize in place and return. */
export function l2Normalize(v: number[]): number[] {
  let sum = 0;
  for (const x of v) sum += x * x;
  const norm = Math.sqrt(sum) || 1;
  for (let i = 0; i < v.length; i++) v[i]! /= norm;
  return v;
}

/** Cosine similarity for L2-normalized vectors (dot product). */
export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) dot += a[i]! * b[i]!;
  return dot;
}

/**
 * Deterministic bag-of-features embedder (hashing trick).
 * Not a substitute for neural embeddings in production, but enables hybrid
 * retrieval + unit tests without an API key.
 */
export class LocalHashEmbedder implements Embedder {
  readonly id = "local-hash-v1";
  constructor(private readonly dims = 384) {}

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => {
      const key = cacheKey(this.id, t);
      const hit = vectorCache.get(key);
      if (hit) return hit;
      const v = new Array<number>(this.dims).fill(0);
      const lower = t.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
      const tokens = lower.split(/\s+/).filter((w) => w.length > 1);
      for (const tok of tokens) {
        this.addFeature(v, `w:${tok}`, 1);
        if (tok.length >= 3) {
          for (let i = 0; i < tok.length - 2; i++) {
            this.addFeature(v, `t:${tok.slice(i, i + 3)}`, 0.5);
          }
        }
      }
      // Char bigrams for short paraphrases / typos
      const compact = lower.replace(/\s+/g, " ").slice(0, 2_000);
      for (let i = 0; i < compact.length - 1; i++) {
        this.addFeature(v, `c:${compact.slice(i, i + 2)}`, 0.15);
      }
      return remember(key, l2Normalize(v));
    });
  }

  private addFeature(v: number[], feature: string, weight: number): void {
    let h = 2166136261;
    for (let i = 0; i < feature.length; i++) {
      h ^= feature.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const idx = (h >>> 0) % this.dims;
    const sign = h & 0x80000000 ? -1 : 1;
    v[idx]! += sign * weight;
  }
}

/** OpenAI-compatible embeddings client (`POST /v1/embeddings`). */
export class OpenAiCompatibleEmbedder implements Embedder {
  readonly id: string;

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
  ) {
    this.id = `openai-compat:${model}`;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const out: number[][] = new Array(texts.length);
    const pending: { index: number; text: string }[] = [];
    for (let i = 0; i < texts.length; i++) {
      const key = cacheKey(this.id, texts[i]!);
      const hit = vectorCache.get(key);
      if (hit) out[i] = hit;
      else pending.push({ index: i, text: texts[i]! });
    }
    if (pending.length === 0) return out;

    // Batch in chunks of 64 to stay under provider limits
    const batchSize = 64;
    for (let start = 0; start < pending.length; start += batchSize) {
      const batch = pending.slice(start, start + batchSize);
      const endpoint = `${this.baseUrl.replace(/\/$/, "")}/embeddings`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          input: batch.map((b) => b.text.slice(0, 8_000)),
        }),
      });
      const json = (await res.json()) as {
        data?: Array<{ embedding: number[]; index: number }>;
        error?: { message?: string };
      };
      if (!res.ok || !json.data) {
        throw new Error(json.error?.message ?? `Embeddings API ${res.status}`);
      }
      const ordered = [...json.data].sort((a, b) => a.index - b.index);
      for (let i = 0; i < batch.length; i++) {
        const vec = l2Normalize(ordered[i]!.embedding.slice());
        const item = batch[i]!;
        out[item.index] = remember(cacheKey(this.id, item.text), vec);
      }
    }
    return out;
  }
}

/** Clear in-process embedding cache (tests). */
export function clearEmbeddingCache(): void {
  vectorCache.clear();
}

/**
 * Resolve embedder from env.
 * - Prefer EMBEDDING_API_KEY / OPENAI_API_KEY + OpenAI-compatible base URL
 * - Fall back to local hash when `RUNTIME_EMBEDDING_FALLBACK=local` or semantic
 *   mode is forced without a remote key
 */
export function createEmbedderFromEnv(): Embedder | null {
  const mode = (env("RUNTIME_SEMANTIC_RETRIEVAL") ?? "").toLowerCase();
  if (mode === "0" || mode === "false" || mode === "off") return null;

  const apiKey = env("EMBEDDING_API_KEY") || env("OPENAI_API_KEY");
  const baseUrl =
    env("EMBEDDING_BASE_URL") ||
    env("OPENAI_BASE_URL") ||
    "https://api.openai.com/v1";
  const model = env("EMBEDDING_MODEL") || "text-embedding-3-small";

  if (apiKey) {
    return new OpenAiCompatibleEmbedder(baseUrl, apiKey, model);
  }

  // auto: only use local when explicitly allowed or forced on
  if (mode === "1" || mode === "true" || mode === "on" || mode === "local") {
    return new LocalHashEmbedder();
  }
  if ((env("RUNTIME_EMBEDDING_FALLBACK") ?? "").toLowerCase() === "local") {
    return new LocalHashEmbedder();
  }
  return null;
}

/** Whether semantic retrieval should be attempted for live turns. */
export function semanticRetrievalEnabled(): boolean {
  const mode = (env("RUNTIME_SEMANTIC_RETRIEVAL") ?? "").toLowerCase();
  if (mode === "0" || mode === "false" || mode === "off") return false;
  if (mode === "1" || mode === "true" || mode === "on" || mode === "local") return true;
  // auto (default when unset): on when a remote embedding key exists
  if (!mode || mode === "auto") {
    return Boolean(env("EMBEDDING_API_KEY") || env("OPENAI_API_KEY"));
  }
  return false;
}
