-- Single-use ledger for the "/start setup_<nonce>" Telegram deep-link. The signed nonce is
-- stateless (HMAC + short TTL) and cannot prevent replay on its own; recording each nonce here makes
-- the account bind genuinely single-use across replicas, closing the deep-link replay -> Telegram
-- account-takeover window. Rows are pruned once past expires_at (epoch ms).
CREATE TABLE IF NOT EXISTS miai_telegram_setup_nonce (
  nonce_id   TEXT PRIMARY KEY,
  expires_at BIGINT NOT NULL
);
