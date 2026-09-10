/**
 * P0 regression: the migration runner must not emit invalid SQL. Migration 008's comment contained a
 * semicolon, and the old splitter split on `;` BEFORE stripping comments, so the comment's tail leaked
 * in front of the CREATE TABLE ("the consumer CREATE TABLE ...") — invalid SQL. On Postgres that made
 * ensureMigrations throw, so migration 008 never applied and the consumer dust-balance pause fix
 * silently no-op'd on every DATABASE_URL-backed deployment (and, with the fail-closed store, 503'd
 * health). This locks the splitter: comments are stripped first, so a `;` in a comment is harmless.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { splitStatements, MIGRATIONS as MIGRATION_ENTRIES } from "../src/lib/migrate.ts";

const MIGRATIONS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
const LEADING_KEYWORDS = new Set([
  "CREATE", "ALTER", "INSERT", "UPDATE", "DELETE", "DROP", "COMMENT", "GRANT", "WITH", "DO",
]);

test("a semicolon inside a comment does not leak into the SQL", () => {
  const sql = [
    "-- header line one; with a semicolon mid-comment",
    "-- header line two",
    "CREATE TABLE IF NOT EXISTS t (id TEXT PRIMARY KEY);",
  ].join("\n");
  const stmts = splitStatements(sql);
  assert.equal(stmts.length, 1, "one statement");
  assert.ok(stmts[0].startsWith("CREATE TABLE"), `must start with CREATE TABLE, got: ${stmts[0].slice(0, 40)}`);
  assert.ok(!/the consumer|with a semicolon|header line/.test(stmts[0]), "no comment text leaked into the statement");
});

test("every committed migration produces only valid statements", () => {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
  assert.ok(files.length >= 8, "found the migration files");
  for (const file of files) {
    const stmts = splitStatements(readFileSync(path.join(MIGRATIONS, file), "utf8"));
    assert.ok(stmts.length >= 1, `${file}: at least one statement`);
    for (const s of stmts) {
      const first = s.split(/\s+/)[0]?.toUpperCase();
      assert.ok(LEADING_KEYWORDS.has(first), `${file}: statement starts with a SQL keyword, got "${s.slice(0, 48)}"`);
    }
  }
});

test("migration 008 specifically yields a single clean CREATE TABLE", () => {
  const stmts = splitStatements(readFileSync(path.join(MIGRATIONS, "008_consumer_wallet_pause.sql"), "utf8"));
  assert.equal(stmts.length, 1);
  assert.ok(stmts[0].startsWith("CREATE TABLE IF NOT EXISTS miai_consumer_wallet_pause"));
});

// Regression for the orphaned-migration bug: 010_user_credentials.sql shipped but was never added to
// the MIGRATIONS array, so ensureMigrations() never created miai_user_credentials on Postgres and
// email/password auth silently fell back to an ephemeral file. Lock every *.sql file to a registered
// entry (and vice-versa) so a future orphaned migration fails CI instead of shipping dormant.
test("every migration .sql file is registered in the MIGRATIONS array (and vice-versa)", () => {
  const filesOnDisk = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const registeredFiles = MIGRATION_ENTRIES.map((m) => m.file).sort();
  assert.deepEqual(
    registeredFiles,
    filesOnDisk,
    "MIGRATIONS must list exactly the .sql files on disk — a file present on disk but missing here never runs",
  );
  // ids must be unique and match their file's stem so ordering/recording stays coherent.
  const ids = MIGRATION_ENTRIES.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length, "migration ids are unique");
  for (const m of MIGRATION_ENTRIES) {
    assert.equal(`${m.id}.sql`, m.file, `migration id "${m.id}" must match its file "${m.file}"`);
  }
});
