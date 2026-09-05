-- Per-wallet pause marker for the consumer line.
--
-- The runtime only auto-pauses a turn at balance <= 0. A prepaid wallet's natural end-state is a
-- positive-but-insufficient "dust" balance (e.g. 300 tokens with the next turn costing ~2000): the
-- debit fails, deducts nothing, and the answer is still served once. The B2B channel bounds that to
-- a single free answer by persisting `paused_no_tokens` on the rental and re-feeding it. The consumer
-- line had no equivalent, so every subsequent turn at that dust balance was served free forever.
--
-- This table is that missing marker. `paused_at_balance` records the wallet balance at the moment we
-- paused, so a top-up (new balance strictly greater) cleanly lifts the pause without any token-cost
-- estimate. The wallet is per-person (wallet_id = the consumer's auth user id), not tenant-scoped, so
-- the key is wallet_id alone — matching how the wallet itself is keyed.
CREATE TABLE IF NOT EXISTS miai_consumer_wallet_pause (
  wallet_id          TEXT PRIMARY KEY,
  paused_at_balance  BIGINT NOT NULL,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
