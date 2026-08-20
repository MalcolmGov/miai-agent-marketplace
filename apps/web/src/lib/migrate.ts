import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool, query } from "@/lib/pg";

type Migration = { id: string; file: string };

/** Ordered schema migrations. Each is applied once and recorded in miai_schema_migrations. */
const MIGRATIONS: Migration[] = [
  { id: "001_init", file: "001_init.sql" },
  { id: "002_consumer_brief", file: "002_consumer_brief.sql" },
  { id: "003_consumer_memory", file: "003_consumer_memory.sql" },
  { id: "004_memory_tenant_and_graph", file: "004_memory_tenant_and_graph.sql" },
];

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

/** Resolve a migration file whether cwd is apps/web or the monorepo root. */
async function readMigrationSql(file: string): Promise<string> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(process.cwd(), "migrations", file),
    path.resolve(process.cwd(), "apps/web/migrations", file),
    path.resolve(here, "../../migrations", file),
  ];
  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate, "utf8");
    } catch {
      /* try next */
    }
  }
  throw new Error(`[migrate] could not find migrations/${file} (cwd=${process.cwd()})`);
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

    const existing = await query<{ id: string }>("SELECT id FROM miai_schema_migrations");
    const done = new Set(existing.rows.map((r) => r.id));

    for (const migration of MIGRATIONS) {
      if (done.has(migration.id)) continue;
      const sql = await readMigrationSql(migration.file);
      for (const stmt of splitStatements(sql)) {
        await query(stmt);
      }
      await query(
        "INSERT INTO miai_schema_migrations (id) VALUES ($1) ON CONFLICT (id) DO NOTHING",
        [migration.id],
      );
    }
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
