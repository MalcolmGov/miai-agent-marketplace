-- Per-chat Telegram state for the consumer channel:
--   tenant_id / consumer_id — identity binding from the "/start setup_<nonce>" deep link,
--     so a linked chat shares the web consumer's memory / wallet; unbound chats fall back
--     to a standalone telegram:<chat_id> identity (both columns null).
--   agent_id — which consumer agent this chat is currently talking to (switched via /agents);
--     null means the default personal-assistant.
CREATE TABLE IF NOT EXISTS miai_telegram_binding (
  chat_id     TEXT PRIMARY KEY,
  tenant_id   TEXT,
  consumer_id TEXT,
  agent_id    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
