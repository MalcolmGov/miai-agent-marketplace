-- Consumer line: durable per-consumer memory — the facts and preferences the personal
-- assistant is told the user wants kept "across conversations" (the remember_about_me tool),
-- injected back into the system prompt on later turns so the assistant feels like *theirs*.
-- Keyed by the consumer's account id (the same id their wallet + connector tokens use).
CREATE TABLE IF NOT EXISTS miai_consumer_memory (
  consumer_id TEXT NOT NULL,
  id          TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'general',
  content     TEXT NOT NULL,
  content_key TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'assistant',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (consumer_id, id)
);
-- One row per distinct remembered thing (dedupe on a normalized prefix of the content).
CREATE UNIQUE INDEX IF NOT EXISTS idx_consumer_memory_dedupe
  ON miai_consumer_memory (consumer_id, content_key);
-- Recency scan for the "what I remember about you" block.
CREATE INDEX IF NOT EXISTS idx_consumer_memory_recent
  ON miai_consumer_memory (consumer_id, updated_at DESC);
