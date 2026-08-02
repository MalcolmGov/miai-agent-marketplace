import pg, { type Pool, type QueryResult, type QueryResultRow } from "pg";

const g = globalThis as typeof globalThis & {
  __miaiPgPool?: Pool | null;
};

/** Resolved Postgres URL from DATABASE_URL or MIAI_DATABASE_URL. */
export function databaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL || process.env.MIAI_DATABASE_URL;
  return url?.trim() || undefined;
}

/** SSL options for managed Postgres (Railway, Azure, etc.). */
export function sslFor(url: string): boolean | { rejectUnauthorized: boolean } {
  if (/localhost|127\.0\.0\.1/.test(url)) return false;
  // Prefer cert verification when a CA is available (PGSSLROOTCERT / NODE_EXTRA_CA_CERTS)
  // or when PG_SSL_REJECT_UNAUTHORIZED=1. Default remains permissive for managed Postgres
  // that presents non-public CAs until ops mounts a bundle (Phase 2).
  const forceVerify =
    process.env.PG_SSL_REJECT_UNAUTHORIZED === "1" ||
    Boolean(process.env.PGSSLROOTCERT) ||
    Boolean(process.env.NODE_EXTRA_CA_CERTS);
  return { rejectUnauthorized: forceVerify };
}

/** Shared connection pool (singleton on globalThis for HMR). Returns null when no DATABASE_URL. */
export function getPool(): Pool | null {
  if (g.__miaiPgPool !== undefined) return g.__miaiPgPool;
  const url = databaseUrl();
  if (!url) {
    g.__miaiPgPool = null;
    return null;
  }
  g.__miaiPgPool = new pg.Pool({
    connectionString: url,
    ssl: sslFor(url),
    max: 10,
  });
  return g.__miaiPgPool;
}

/** Run a parameterized query against the shared pool. */
export async function query<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<R>> {
  const pool = getPool();
  if (!pool) throw new Error("[pg] query called without DATABASE_URL");
  return pool.query<R>(text, params);
}

/** Lightweight readiness probe — does not hydrate data. */
export async function pingPool(): Promise<{ ok: boolean; error?: string }> {
  const pool = getPool();
  if (!pool) return { ok: false, error: "no database url configured" };
  try {
    await pool.query("SELECT 1");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "postgres ping failed",
    };
  }
}
