/**
 * Knowledge chunk retrieval for live prompts.
 *
 * Default path is lexical (keyword overlap). When an Embedder is available
 * (see `RUNTIME_SEMANTIC_RETRIEVAL`), hybrid semantic + lexical ranking is used,
 * with automatic fallback to pure lexical on embed failures.
 *
 * Do not treat MockModel eval pass-rate as live retrieval quality; use `pnpm eval:live`.
 */

import {
  cosineSimilarity,
  type Embedder,
} from "./embeddings.js";

const META_CHUNK =
  /grounding|honesty|how this file works|template vs tenant|market operations|compliance notes|response rules|guardrails|stay in role|prompt-injection|what the agent does not know|citation policy|record format — what/i;

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "have",
  "from",
  "your",
  "what",
  "when",
  "where",
  "how",
  "can",
  "please",
  "just",
  "about",
  "would",
  "could",
  "into",
  "been",
  "they",
  "them",
  "will",
  "does",
  "dont",
  "don't",
  "need",
  "want",
  "like",
  "some",
  "more",
  "than",
  "then",
  "also",
  "only",
]);

function scoreChunk(chunk: string, terms: string[], q: string): number {
  const lower = chunk.toLowerCase();
  const head = chunk.split("\n")[0] || "";
  if (META_CHUNK.test(head) && !/levy schedule|payslip|leave|price|treatment|service|amenity|po-|purchase/i.test(chunk.slice(0, 80))) {
    return -1;
  }
  if (
    /single source of truth|chunked by|indexed for retrieval|example values are fictional|replace per tenant|how this file works|template vs tenant/i.test(
      chunk.slice(0, 280),
    )
  ) {
    return -1;
  }
  if (/^## (guardrails|response rules|us compliance|eu compliance|market operations)/i.test(chunk)) return -1;

  let score = 0;
  for (const t of terms) if (lower.includes(t)) score += t.length > 4 ? 2 : 1;

  if (/job|hiring|role|opening|leave|pto|holiday|benefit|wifi|check-?in|price|order|service|treatment|levy|payslip|amenity|course|po-|stock/.test(lower)) {
    for (const t of ["job", "leave", "role", "wifi", "order", "price", "stock", "benefit", "hours"]) {
      if (q.includes(t) && lower.includes(t)) score += 4;
    }
  }
  if (/hours|open|monday|tuesday|wednesday|thursday|friday|saturday|sunday|am|pm|closed/.test(q) && /hours|open|monday|closed|\d{1,2}:\d{2}/.test(lower)) {
    score += 12;
  }
  if (/refund|return|exchange/.test(q) && /refund|return|exchange|window/.test(lower)) score += 14;
  if (/pto|annual leave|leave (do i|days)|how many days/.test(q) && /leave|pto|21 days|annual|holiday/.test(lower)) score += 18;
  if (/poem|essay|joke|homework|recipe|weather in|write me/.test(q)) score -= 20;

  return score;
}

function splitChunks(knowledge: string): string[] {
  return knowledge
    .slice(0, 80_000)
    .split(/\n(?=#+ )/)
    .map((c) => c.trim())
    .filter((c) => c.length >= 30);
}

function queryTerms(query: string): { q: string; terms: string[] } {
  const q = query.toLowerCase().replace(/##[\s\S]*$/g, " ");
  const terms = q
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
  return { q, terms };
}

function packChunks(
  ranked: Array<{ chunk: string; score: number }>,
  topK: number,
  maxChars: number,
): string[] {
  const out: string[] = [];
  let used = 0;
  for (const r of ranked.slice(0, topK * 2)) {
    if (out.length >= topK) break;
    if (used + r.chunk.length > maxChars) {
      const room = maxChars - used;
      if (room > 200) out.push(r.chunk.slice(0, room));
      break;
    }
    out.push(r.chunk.slice(0, 1600));
    used += Math.min(r.chunk.length, 1600);
  }
  return out;
}

/** Rank knowledge chunks by lexical overlap with the user query. */
export function retrieveKnowledgeChunks(
  knowledge: string,
  query: string,
  opts?: { topK?: number; maxChars?: number },
): string[] {
  const topK = opts?.topK ?? 6;
  const maxChars = opts?.maxChars ?? 12_000;
  const { q, terms } = queryTerms(query);
  const ranked = splitChunks(knowledge)
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, terms, q) }))
    .filter((r) => r.score >= 2)
    .sort((a, b) => b.score - a.score);
  return packChunks(ranked, topK, maxChars);
}

/**
 * Hybrid semantic + lexical ranking.
 * Falls back to lexical-only when the embedder throws or returns empty.
 */
export async function retrieveKnowledgeChunksHybrid(
  knowledge: string,
  query: string,
  embedder: Embedder,
  opts?: { topK?: number; maxChars?: number; semanticWeight?: number },
): Promise<string[]> {
  const topK = opts?.topK ?? 6;
  const maxChars = opts?.maxChars ?? 12_000;
  const semanticWeight = opts?.semanticWeight ?? 0.6;
  const lexicalWeight = 1 - semanticWeight;
  const { q, terms } = queryTerms(query);
  const chunks = splitChunks(knowledge);
  if (chunks.length === 0) return [];

  let queryVec: number[];
  let chunkVecs: number[][];
  try {
    const embedded = await embedder.embed([query.slice(0, 4_000), ...chunks.map((c) => c.slice(0, 4_000))]);
    queryVec = embedded[0]!;
    chunkVecs = embedded.slice(1);
  } catch {
    return retrieveKnowledgeChunks(knowledge, query, opts);
  }

  const lexicalRaw = chunks.map((chunk) => Math.max(0, scoreChunk(chunk, terms, q)));
  const lexMax = Math.max(1, ...lexicalRaw);
  const semanticRaw = chunkVecs.map((v) => Math.max(0, cosineSimilarity(queryVec, v)));
  const semMax = Math.max(1e-6, ...semanticRaw);

  const ranked = chunks
    .map((chunk, i) => {
      const lex = lexicalRaw[i]! / lexMax;
      const sem = semanticRaw[i]! / semMax;
      // Soft-ban meta chunks the same way lexical does (scoreChunk returns -1)
      const rawLex = scoreChunk(chunk, terms, q);
      if (rawLex < 0) return { chunk, score: -1 };
      const score = semanticWeight * sem + lexicalWeight * lex;
      // Require a little signal from either side
      if (sem < 0.15 && lex < 0.15) return { chunk, score: 0 };
      return { chunk, score };
    })
    .filter((r) => r.score > 0.12)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return retrieveKnowledgeChunks(knowledge, query, opts);
  }
  return packChunks(ranked, topK, maxChars);
}

function assemblePrompt(trimmed: string, chunks: string[], budget: number): string {
  if (chunks.length === 0) {
    return trimmed.slice(0, budget);
  }
  const assembled = chunks.join("\n\n");
  const facts = trimmed.match(/## Key facts[\s\S]*?(?=\n## |$)/i)?.[0]?.trim();
  if (facts && !assembled.includes(facts.slice(0, 80))) {
    return `${facts}\n\n${assembled}`.slice(0, budget);
  }
  return assembled.slice(0, budget);
}

/**
 * Build the knowledge section for the system prompt (lexical).
 * Falls back to a prefix slice when retrieval finds nothing useful.
 */
export function selectKnowledgeForPrompt(
  knowledge: string,
  query: string,
  budget: number,
): string {
  const trimmed = knowledge.trim();
  if (!trimmed) return "";
  const chunks = retrieveKnowledgeChunks(trimmed, query, {
    topK: 8,
    maxChars: Math.min(budget, 24_000),
  });
  return assemblePrompt(trimmed, chunks, budget);
}

/**
 * Async knowledge selection — hybrid when embedder provided, else lexical.
 */
export async function selectKnowledgeForPromptAsync(
  knowledge: string,
  query: string,
  budget: number,
  embedder?: Embedder | null,
): Promise<string> {
  const trimmed = knowledge.trim();
  if (!trimmed) return "";
  const opts = { topK: 8, maxChars: Math.min(budget, 24_000) };
  if (!embedder) {
    return assemblePrompt(trimmed, retrieveKnowledgeChunks(trimmed, query, opts), budget);
  }
  const chunks = await retrieveKnowledgeChunksHybrid(trimmed, query, embedder, opts);
  return assemblePrompt(trimmed, chunks, budget);
}
