-- Links a Telegram chat to a signed-in consumer's identity so a linked Telegram
-- shares the same memory / wallet as the web app. Populated by the
-- "/start setup_<nonce>" deep link (see api/consumer/telegram/webhook). Unbound
-- chats fall back to a standalone telegram:<chat_id> identity.
CREATE TABLE IF NOT EXISTS miai_telegram_binding (
  chat_id     TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL,
  consumer_id TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
