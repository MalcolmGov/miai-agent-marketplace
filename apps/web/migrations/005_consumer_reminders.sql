-- In-app reminders for the personal assistant (Phase 1).
--
-- Same B2B2C tenancy as memory: the owner is (tenant_id, consumer_id), never consumer_id alone —
-- the same phone number can be a Vodacom AND an MTN customer. A reminder is a timed nudge the
-- assistant saved via set_reminder. Phase 1 surfaces them in-app (a Reminders list + the daily
-- brief); the `channel` column is stored for the later push / SMS / WhatsApp phases but not yet
-- used for delivery.
CREATE TABLE IF NOT EXISTS miai_consumer_reminder (
  tenant_id    TEXT NOT NULL DEFAULT 'demo-workspace',
  consumer_id  TEXT NOT NULL,
  id           TEXT NOT NULL,
  text         TEXT NOT NULL,
  fires_at     TIMESTAMPTZ NOT NULL,
  recurring    TEXT NOT NULL DEFAULT '',
  channel      TEXT NOT NULL DEFAULT 'app',
  status       TEXT NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (consumer_id, id)
);
-- List a person's pending reminders (soonest first), scoped to their brand.
CREATE INDEX IF NOT EXISTS idx_consumer_reminder_owner
  ON miai_consumer_reminder (tenant_id, consumer_id, status, fires_at);
-- Cross-tenant due scan for the future cron (push / SMS / WhatsApp).
CREATE INDEX IF NOT EXISTS idx_consumer_reminder_due
  ON miai_consumer_reminder (status, fires_at);
