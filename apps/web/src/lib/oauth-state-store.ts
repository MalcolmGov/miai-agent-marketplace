import { getPool, query } from "@/lib/pg";
import { ensureMigrations } from "@/lib/migrate";

/**
 * Single-use ledger for the connector OAuth state nonce. The signed OAuth state is stateless (HMAC +
 * short TTL), so a captured state could be replayed until it expires. Recording each nonce here makes
 * the callback genuinely single-use across replicas — a replayed state is rejected before the provider
 * token exchange runs, so the authorization code is spent at most once. Mirrors consumeSetupNonce
 * (migration 007). Postgres when DATABASE_URL is set, else an in-process Map.
 */

const g = globalThis as typeof globalThis & { __miaiOauthConsumedNonce?: Map<string, number> };
function nonceMem(): Map<string, number> {
  if (!g.__miaiOauthConsumedNonce) g.__miaiOauthConsumedNonce = new Map();
  return g.__miaiOauthConsumedNonce;
}

/** Record `nonceId` as consumed. Returns true on FIRST use, false on a replay. `expiresAt` is epoch ms. */
export async function consumeOAuthStateNonce(nonceId: string, expiresAt: number): Promise<boolean> {
  if (!nonceId) return false;
  const now = Date.now();
  if (getPool()) {
    await ensureMigrations();
    await query(`DELETE FROM miai_oauth_state_nonce WHERE expires_at < $1`, [now]);
    const res = await query<{ nonce_id: string }>(
      `INSERT INTO miai_oauth_state_nonce (nonce_id, expires_at) VALUES ($1, $2)
       ON CONFLICT (nonce_id) DO NOTHING RETURNING nonce_id`,
      [nonceId, expiresAt],
    );
    return res.rows.length > 0; // a returned row means we inserted → first use
  }
  const seen = nonceMem();
  for (const [k, exp] of seen) if (exp < now) seen.delete(k);
  if (seen.has(nonceId)) return false;
  seen.set(nonceId, expiresAt);
  return true;
}
