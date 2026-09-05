import { promises as fs } from "node:fs";
import path from "node:path";
import { getPool, query } from "@/lib/pg";
import { ensureMigrations } from "@/lib/migrate";

/**
 * Per-wallet pause marker for the consumer line — the individual-facing equivalent of the B2B
 * channel's `paused_no_tokens` rental state.
 *
 * The runtime only auto-pauses at balance <= 0, but a prepaid wallet settles at a positive-but-
 * insufficient "dust" balance where each turn's debit fails (deducting nothing) yet the answer is
 * still served once. Without a memory of that, the consumer line served unlimited free answers.
 *
 * We remember the balance at which we paused. The next turn hard-pauses while the balance is still
 * at or below that mark, and a top-up (balance strictly greater) lifts it — no token-cost estimate,
 * no false pause. Keyed by wallet_id alone (the wallet is per-person, not tenant-scoped).
 *
 * Postgres when DATABASE_URL is set, else a JSON file / in-process fallback. Every function is
 * best-effort and never throws: a store outage fails OPEN (serve) rather than blocking a paying
 * customer, mirroring the runtime's `debitOrServe` fail-open.
 */

const g = globalThis as typeof globalThis & {
  __miaiWalletPause?: Map<string, number>;
  __miaiWalletPauseHydrated?: boolean;
};

function storePath(): string {
  return process.env.CONSUMER_WALLET_PAUSE_STORE_PATH
    ? path.resolve(process.env.CONSUMER_WALLET_PAUSE_STORE_PATH)
    : path.resolve(process.cwd(), "../../data/consumer-wallet-pause.json");
}

async function mem(): Promise<Map<string, number>> {
  if (g.__miaiWalletPause && g.__miaiWalletPauseHydrated) return g.__miaiWalletPause;
  const map = g.__miaiWalletPause ?? new Map<string, number>();
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, number>)) {
      if (typeof v === "number") map.set(k, v);
    }
  } catch {
    /* no file yet */
  }
  g.__miaiWalletPause = map;
  g.__miaiWalletPauseHydrated = true;
  return map;
}

async function writeMem(map: Map<string, number>): Promise<void> {
  const obj: Record<string, number> = {};
  for (const [k, v] of map) obj[k] = v;
  await fs.writeFile(storePath(), JSON.stringify(obj, null, 2), "utf8");
}

/** The balance at which this wallet was paused, or null if it is not paused. Never throws. */
export async function getWalletPausedBalance(walletId: string): Promise<number | null> {
  if (!walletId) return null;
  try {
    if (getPool()) {
      await ensureMigrations();
      const res = await query<{ paused_at_balance: string | number }>(
        "SELECT paused_at_balance FROM miai_consumer_wallet_pause WHERE wallet_id = $1",
        [walletId],
      );
      if (!res.rows.length) return null;
      const n = Number(res.rows[0].paused_at_balance);
      return Number.isFinite(n) ? n : null;
    }
    const map = await mem();
    return map.has(walletId) ? (map.get(walletId) as number) : null;
  } catch {
    // Fail open: treat an unreadable marker as "not paused" so an outage never blocks a customer.
    return null;
  }
}

/** Record that this wallet paused at `balance`. Next turn hard-pauses until a top-up lifts it. */
export async function markWalletPaused(walletId: string, balance: number): Promise<void> {
  if (!walletId || !Number.isFinite(balance)) return;
  const bal = Math.max(0, Math.floor(balance));
  try {
    if (getPool()) {
      await ensureMigrations();
      await query(
        `INSERT INTO miai_consumer_wallet_pause (wallet_id, paused_at_balance, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (wallet_id) DO UPDATE SET paused_at_balance = EXCLUDED.paused_at_balance, updated_at = NOW()`,
        [walletId, bal],
      );
      return;
    }
    const map = await mem();
    map.set(walletId, bal);
    await writeMem(map);
  } catch {
    /* best-effort — never fail a turn on the pause marker */
  }
}

/** Lift the pause (e.g. after a top-up). Never throws. */
export async function clearWalletPause(walletId: string): Promise<void> {
  if (!walletId) return;
  try {
    if (getPool()) {
      await ensureMigrations();
      await query("DELETE FROM miai_consumer_wallet_pause WHERE wallet_id = $1", [walletId]);
      return;
    }
    const map = await mem();
    if (map.delete(walletId)) await writeMem(map);
  } catch {
    /* best-effort */
  }
}
