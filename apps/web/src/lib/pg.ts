import type { Pool, QueryResult, QueryResultRow } from "pg";

const g = globalThis as typeof globalThis & {
  __miaiPgPool?: Pool | null;
  __miaiPgModule?: typeof import("pg");
};

/** Resolved Postgres URL from DATABASE_URL or MIAI_DATABASE_URL. */
export function databaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL || process.env.MIAI_DATABASE_URL;
  return url?.trim() || undefined;
}

/** True when remote Postgres SSL will verify the server certificate. */
export function pgSslVerifyEnabled(url: string): boolean {
  if (/localhost|127\.0\.0\.1/.test(url)) return false;
  // Explicit opt-out for managed CAs that need a custom trust store first.
  if (process.env.PG_SSL_REJECT_UNAUTHORIZED === "0") return false;
  return true;
}

/** SSL options for managed Postgres (Railway, Azure, etc.). */
export function sslFor(url: string): boolean | { rejectUnauthorized: boolean } {
  if (/localhost|127\.0\.0\.1/.test(url)) return false;
  // Default: verify certs. Opt out with PG_SSL_REJECT_UNAUTHORIZED=0 (+ boot ACK in prod).
  return { rejectUnauthorized: pgSslVerifyEnabled(url) };
}

function loadPgSync(): typeof import("pg") {
  if (g.__miaiPgModule) return g.__miaiPgModule;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("pg") as typeof import("pg") & { default?: typeof import("pg") };
  g.__miaiPgModule = mod.default ?? mod;
  return g.__miaiPgModule;
}

/** Shared connection pool (singleton on globalThis for HMR). Returns null when no DATABASE_URL. */
export function getPool(): Pool | null {
  if (g.__miaiPgPool !== undefined) return g.__miaiPgPool;
  const url = databaseUrl();
  if (!url) {
    g.__miaiPgPool = null;
    return null;
  }
  const pg = loadPgSync();
  const pool = new pg.Pool({
    connectionString: url,
    ssl: sslFor(url),
    max: 10,
  });
  // node-postgres emits 'error' on IDLE clients when managed Postgres (Neon/Railway/Azure) drops or
  // fails over an idle connection — routine behaviour. With NO listener, Node treats the EventEmitter
  // 'error' as unhandled and re-throws it, crashing the whole process. Log it and let the pool evict
  // and recreate the connection instead.
  pool.on("error", (err: Error) => {
    console.error(
      JSON.stringify({ level: "error", event: "miai.pg_pool_error", message: err.message }),
    );
  });
  g.__miaiPgPool = pool;
  return pool;
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
