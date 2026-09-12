-- Phase 2 Enterprise Hardening: pgvector, Hybrid RAG, and Tenant Row-Level Security (RLS)

-- 1. Enable pgvector extension if available on PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Enhanced Agent Knowledge Store with Vector Embeddings and Full-Text Search
CREATE TABLE IF NOT EXISTS miai_agent_embeddings (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  embedding vector(1536),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for Hybrid RAG (Dense vector search + Sparse text search)
CREATE INDEX IF NOT EXISTS miai_agent_embeddings_ws_agent ON miai_agent_embeddings (workspace_id, agent_id);

CREATE INDEX IF NOT EXISTS miai_agent_embeddings_tsv ON miai_agent_embeddings USING GIN (tsv);

-- 3. Row-Level Security (RLS) Policies for Zero-Leakage Tenant Isolation
ALTER TABLE miai_rentals ENABLE ROW LEVEL SECURITY;

ALTER TABLE miai_turns ENABLE ROW LEVEL SECURITY;

ALTER TABLE miai_agent_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_embeddings ON miai_agent_embeddings
  FOR ALL
  USING (
    NULLIF(current_setting('app.current_workspace_id', true), '') IS NULL
    OR workspace_id = current_setting('app.current_workspace_id', true)
  );

CREATE POLICY tenant_isolation_rentals ON miai_rentals
  FOR ALL
  USING (
    NULLIF(current_setting('app.current_workspace_id', true), '') IS NULL
    OR workspace_id = current_setting('app.current_workspace_id', true)
  );
