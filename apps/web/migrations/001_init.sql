-- Core rentals + audit (Phase 2 persistence)
CREATE TABLE IF NOT EXISTS miai_rentals (
  workspace_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, agent_id)
);

CREATE TABLE IF NOT EXISTS miai_audit (
  id TEXT PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL,
  workspace_id TEXT NOT NULL,
  agent_id TEXT,
  type TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS miai_audit_ws_at ON miai_audit (workspace_id, at DESC);

-- Turn transcripts (matches traceability.ts)
CREATE TABLE IF NOT EXISTS miai_turns (
  id TEXT PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL,
  correlation_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS miai_turns_ws_at ON miai_turns (workspace_id, at DESC);
CREATE INDEX IF NOT EXISTS miai_turns_corr ON miai_turns (correlation_id);

-- Stub tables for later agents (empty schema only)
CREATE TABLE IF NOT EXISTS miai_oauth_tokens (
  workspace_id TEXT NOT NULL,
  connector TEXT NOT NULL,
  sealed JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, connector)
);

CREATE TABLE IF NOT EXISTS miai_knowledge_sources (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS miai_workspace_members (
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS miai_ask_leads (
  id TEXT PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS miai_custom_requests (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
