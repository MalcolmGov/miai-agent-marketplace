/**
 * Lexical chunk retrieval for live knowledge prompts (Phase 3 D4).
 * Prefer top-scoring ## chunks over stuffing the first N chars of the KB.
 */

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

/** Rank knowledge chunks by lexical overlap with the user query. */
export function retrieveKnowledgeChunks(
  knowledge: string,
  query: string,
  opts?: { topK?: number; maxChars?: number },
): string[] {
  const topK = opts?.topK ?? 6;
  const maxChars = opts?.maxChars ?? 12_000;
  const kb = knowledge.slice(0, 80_000);
  const q = query.toLowerCase().replace(/##[\s\S]*$/g, " ");
  const terms = q
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));

  const chunks = kb.split(/\n(?=#+ )/);
  const ranked = chunks
    .map((chunk) => ({ chunk: chunk.trim(), score: scoreChunk(chunk, terms, q) }))
    .filter((r) => r.score >= 2 && r.chunk.length >= 30)
    .sort((a, b) => b.score - a.score);

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

/**
 * Build the knowledge section for the system prompt.
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
  if (chunks.length === 0) {
    return trimmed.slice(0, budget);
  }
  const assembled = chunks.join("\n\n");
  // Always keep a small head of Key facts if present and not already included
  const facts = trimmed.match(/## Key facts[\s\S]*?(?=\n## |$)/i)?.[0]?.trim();
  if (facts && !assembled.includes(facts.slice(0, 80))) {
    return `${facts}\n\n${assembled}`.slice(0, budget);
  }
  return assembled.slice(0, budget);
}
