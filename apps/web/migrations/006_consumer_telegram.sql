-- Telegram ↔ consumer account binding.
--
-- A consumer who signs in on the web app (OIDC consumer_id) can reach the same assistant from
-- Telegram via the deep-link flow (`/start setup_<consumerId>`). This table maps a Telegram
-- chat_id to that consumer account so inbound Telegram messages debit the consumer's own wallet
-- and memory — not an auto-provisioned `telegram:<chat_id>` identity.
CREATE TABLE IF NOT EXISTS miai_consumer_telegram (
  chat_id      TEXT PRIMARY KEY,
  consumer_id  TEXT NOT NULL,
  bound_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Reverse lookup: what chats is a consumer bound to (for the "disconnect" UI).
CREATE INDEX IF NOT EXISTS idx_consumer_telegram_consumer
  ON miai_consumer_telegram (consumer_id);
