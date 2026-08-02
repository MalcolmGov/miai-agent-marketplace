import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool, query } from "@/lib/pg";

const MIGRATION_ID = "001_init";

let ensuring: Promise<void> | undefined;
let applied = false;

/** Split migration SQL on semicolons (ignores blank lines and line comments). */
function splitStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((chunk) =>
      chunk
        .split("\n")
        .filter((line) => !/^\s*--/.test(line))
        .join("\n")
        .trim(),
    )
    .filter(Boolean);
}

/** Resolve 001_init.sql whether cwd is apps/web or the monorepo root. */
async function readMigrationSql(): Promise<string> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(process.cwd(), "migrations", "001_init.sql"),
    path.resolve(process.cwd(), "apps/web/migrations", "001_init.sql"),
    path.resolve(here, "../../migrations/001_init.sql"),
  ];
  for (const file of candidates) {
    try {
      return await fs.readFile(file, "utf8");
    } catch {
      /* try next */
    }
  }
  throw new Error(
    `[migrate] could not find migrations/001_init.sql (cwd=${process.cwd()})`,
  );
}

/** Apply pending schema migrations when a Postgres pool is available. Idempotent. */
export async function ensureMigrations(): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  if (applied) return;
  if (ensuring) return ensuring;

  ensuring = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS miai_schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const existing = await query<{ id: string }>(
      "SELECT id FROM miai_schema_migrations WHERE id = $1",
      [MIGRATION_ID],
    );
    if (existing.rows.length > 0) {
      applied = true;
      return;
    }

    const sql = await readMigrationSql();
    for (const stmt of splitStatements(sql)) {
      await query(stmt);
    }

    await query("INSERT INTO miai_schema_migrations (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [
      MIGRATION_ID,
    ]);
    applied = true;
  })();

  try {
    await ensuring;
  } catch (err) {
    applied = false;
    throw err;
  } finally {
    ensuring = undefined;
  }
}
