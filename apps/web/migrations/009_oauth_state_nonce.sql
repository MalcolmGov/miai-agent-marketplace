-- Single-use ledger for the connector OAuth "state" nonce. The signed state is stateless (HMAC +
-- ~15-min TTL), so a captured state could be replayed until it expires. Recording each nonce here
-- makes the OAuth callback genuinely single-use across replicas — a replayed callback never reaches
-- the provider token exchange, so the auth code is spent at most once. Rows pruned past expires_at.
CREATE TABLE IF NOT EXISTS miai_oauth_state_nonce (
  nonce_id   TEXT PRIMARY KEY,
  expires_at BIGINT NOT NULL
);
