-- B2B2C tenancy + memory depth for the personal assistant.
--
-- The assistant is white-labelled to brands/carriers (Vodafone, MTN, Airtel, …) and to
-- MyInstantAI-direct consumers. The same person's account id (e.g. a phone number) can exist under
-- more than one brand, so the memory OWNER is (tenant_id, consumer_id) — never consumer_id alone.
-- tenant_id is the brand/workspace; consumer_id is the person within it. Every read, dedupe and
-- write is scoped to both, so one brand's users can never see another brand's.

-- Retrofit the existing facts table: add the tenant column and re-scope its indexes.
ALTER TABLE miai_consumer_memory ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'demo-workspace';
DROP INDEX IF EXISTS idx_consumer_memory_dedupe;
CREATE UNIQUE INDEX IF NOT EXISTS idx_consumer_memory_dedupe
  ON miai_consumer_memory (tenant_id, consumer_id, content_key);
DROP INDEX IF EXISTS idx_consumer_memory_recent;
CREATE INDEX IF NOT EXISTS idx_consumer_memory_recent
  ON miai_consumer_memory (tenant_id, consumer_id, updated_at DESC);

-- Goals — objectives the assistant helps track over time (progress, deadline, status).
CREATE TABLE IF NOT EXISTS miai_consumer_goal (
  tenant_id   TEXT NOT NULL DEFAULT 'demo-workspace',
  consumer_id TEXT NOT NULL,
  id          TEXT NOT NULL,
  title       TEXT NOT NULL,
  title_key   TEXT NOT NULL,
  detail      TEXT NOT NULL DEFAULT '',
  target      TEXT NOT NULL DEFAULT '',
  progress    INTEGER NOT NULL DEFAULT 0,
  deadline    TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (consumer_id, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_consumer_goal_dedupe
  ON miai_consumer_goal (tenant_id, consumer_id, title_key);
CREATE INDEX IF NOT EXISTS idx_consumer_goal_recent
  ON miai_consumer_goal (tenant_id, consumer_id, updated_at DESC);

-- People — the important people in the user's life and their relationship, so the assistant knows
-- who "my wife" or "my manager" is.
CREATE TABLE IF NOT EXISTS miai_consumer_person (
  tenant_id    TEXT NOT NULL DEFAULT 'demo-workspace',
  consumer_id  TEXT NOT NULL,
  id           TEXT NOT NULL,
  name         TEXT NOT NULL,
  name_key     TEXT NOT NULL,
  relationship TEXT NOT NULL DEFAULT '',
  notes        TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (consumer_id, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_consumer_person_dedupe
  ON miai_consumer_person (tenant_id, consumer_id, name_key);
CREATE INDEX IF NOT EXISTS idx_consumer_person_recent
  ON miai_consumer_person (tenant_id, consumer_id, updated_at DESC);
