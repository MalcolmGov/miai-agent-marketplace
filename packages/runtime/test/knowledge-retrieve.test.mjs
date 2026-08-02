import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  LocalHashEmbedder,
  clearEmbeddingCache,
  cosineSimilarity,
  retrieveKnowledgeChunks,
  retrieveKnowledgeChunksHybrid,
  selectKnowledgeForPrompt,
  selectKnowledgeForPromptAsync,
  createEmbedderFromEnv,
  semanticRetrievalEnabled,
} from "../dist/index.js";

const KB = `
## Key facts
- Company: Acme Retail
- Region: Europe

## Store hours
We are open Monday to Friday 09:00-18:00 and Saturday 10:00-14:00. Closed Sunday.

## Return policy
Customers may return unused items within 30 days with a receipt for a full refund or exchange.

## Hiring — warehouse associate
Looking for a warehouse associate in Rotterdam. Competitive pay, night shift available.

## Guardrails
Stay in role. Do not invent policies.
`.trim();

describe("lexical retrieveKnowledgeChunks", () => {
  it("ranks hours chunk for an hours question", () => {
    const chunks = retrieveKnowledgeChunks(KB, "What time do you open on Saturday?");
    assert.ok(chunks.length >= 1);
    assert.match(chunks.join("\n"), /Store hours/i);
  });

  it("ranks refund chunk for return questions", () => {
    const chunks = retrieveKnowledgeChunks(KB, "Can I get a refund if I return something?");
    assert.ok(chunks.some((c) => /Return policy/i.test(c)));
  });

  it("demotes meta guardrails chunks", () => {
    const chunks = retrieveKnowledgeChunks(KB, "What are your store hours please?");
    assert.ok(!chunks.some((c) => /^## Guardrails/i.test(c)));
  });
});

describe("hybrid semantic retrieve", () => {
  beforeEach(() => clearEmbeddingCache());

  it("surfaces paraphrase matches that lexical may miss", async () => {
    const embedder = new LocalHashEmbedder();
    // "operating schedule" avoids exact "hours"/"open" lexical boosts
    const hybrid = await retrieveKnowledgeChunksHybrid(
      KB,
      "Tell me the operating schedule for the weekend",
      embedder,
      { topK: 4 },
    );
    assert.ok(hybrid.length >= 1, "expected at least one hybrid chunk");
    assert.match(hybrid.join("\n"), /Store hours|09:00|Saturday/i);
  });

  it("falls back to lexical when embedder throws", async () => {
    const broken = {
      id: "broken",
      async embed() {
        throw new Error("upstream down");
      },
    };
    const chunks = await retrieveKnowledgeChunksHybrid(
      KB,
      "What is your return policy for unused items?",
      broken,
    );
    assert.ok(chunks.some((c) => /Return policy/i.test(c)));
  });

  it("selectKnowledgeForPromptAsync includes key facts with hybrid", async () => {
    const text = await selectKnowledgeForPromptAsync(
      KB,
      "weekend operating schedule",
      8_000,
      new LocalHashEmbedder(),
    );
    assert.match(text, /Key facts|Acme Retail/i);
    assert.match(text, /hours|Saturday|09:00/i);
  });

  it("selectKnowledgeForPrompt sync remains lexical", () => {
    const text = selectKnowledgeForPrompt(KB, "refund unused items", 4_000);
    assert.match(text, /Return policy|30 days/i);
  });
});

describe("embeddings helpers", () => {
  beforeEach(() => clearEmbeddingCache());

  it("local embedder yields unit vectors with stable cosine", async () => {
    const e = new LocalHashEmbedder(128);
    const [a, b, c] = await e.embed([
      "store opening hours weekend saturday",
      "weekend operating schedule saturday",
      "warehouse night shift hiring rotterdam",
    ]);
    const near = cosineSimilarity(a, b);
    const far = cosineSimilarity(a, c);
    assert.ok(near > far, `expected paraphrase closer than unrelated (${near} vs ${far})`);
  });
});

describe("env gating", () => {
  const prev = { ...process.env };

  function restore() {
    for (const k of Object.keys(process.env)) {
      if (!(k in prev)) delete process.env[k];
    }
    Object.assign(process.env, prev);
  }

  it("semanticRetrievalEnabled auto when OPENAI_API_KEY set", () => {
    delete process.env.RUNTIME_SEMANTIC_RETRIEVAL;
    process.env.OPENAI_API_KEY = "sk-test";
    assert.equal(semanticRetrievalEnabled(), true);
    const emb = createEmbedderFromEnv();
    assert.ok(emb);
    assert.match(emb.id, /openai-compat/);
    restore();
  });

  it("forces local embedder when RUNTIME_SEMANTIC_RETRIEVAL=local", () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.EMBEDDING_API_KEY;
    process.env.RUNTIME_SEMANTIC_RETRIEVAL = "local";
    assert.equal(semanticRetrievalEnabled(), true);
    assert.equal(createEmbedderFromEnv()?.id, "local-hash-v1");
    restore();
  });

  it("disabled when RUNTIME_SEMANTIC_RETRIEVAL=0", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.RUNTIME_SEMANTIC_RETRIEVAL = "0";
    assert.equal(semanticRetrievalEnabled(), false);
    assert.equal(createEmbedderFromEnv(), null);
    restore();
  });
});
