-- Consumer line: per-consumer daily-brief schedule + the last generated brief.
-- Keyed by the consumer's account id (the same id their wallet and connector tokens use).
CREATE TABLE IF NOT EXISTS miai_consumer_brief (
  consumer_id TEXT PRIMARY KEY,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  latest JSONB,
  last_sent_on TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
