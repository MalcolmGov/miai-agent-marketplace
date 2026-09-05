import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const keys = ["NODE_ENV", "MIAI_AUTH_MODE", "MIAI_WALLET_MODE", "MIAI_MODEL_MODE", "OPENAI_API_KEY", "SANDBOX_MODE", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "RENTAL_STORE_PATH"];
let saved, dir, GET;
let failMigration = true;
const oldPool = globalThis.__miaiPgPool;
const oldStore = globalThis.__miaiStore;

before(async () => {
  saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  for (const k of keys) delete process.env[k];
  process.env.NODE_ENV = "test";
  dir = await mkdtemp(join(tmpdir(), "miai-health-"));
  process.env.RENTAL_STORE_PATH = join(dir, "rentals.json");
  await writeFile(process.env.RENTAL_STORE_PATH, JSON.stringify({ workspaces: { stale: { agents: {}, embedKeys: {} } }, audit: [] }));
  delete globalThis.__miaiStore;
  globalThis.__miaiPgPool = {
    query: async (sql) => {
      if (sql.includes("CREATE TABLE") && failMigration) throw new Error("database-role-secret: schema permission denied");
      return { rows: [], rowCount: 0 };
    },
  };
  ({ GET } = await import("../src/app/api/health/route.ts"));
});

after(async () => {
  for (const k of keys) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  globalThis.__miaiPgPool = oldPool;
  globalThis.__miaiStore = oldStore;
  await rm(dir, { recursive: true, force: true });
});

test("health returns 503 for missing live-model config, not an HTTP 200 degraded body", async () => {
  process.env.MIAI_MODEL_MODE = "openai";
  const res = await GET();
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.config, "incomplete");
  assert.deepEqual(body.missingConfig, ["OPENAI_API_KEY"]);
  process.env.MIAI_MODEL_MODE = "mock";
});

test("a reachable database with a failed migration is unready, never loads stale files, and retries", async () => {
  const failed = await GET();
  assert.equal(failed.status, 503);
  const body = await failed.json();
  assert.equal(body.storePing, "ok");
  assert.equal(body.store, "error");
  assert.equal(JSON.stringify(body).includes("database-role-secret"), false);
  assert.equal(globalThis.__miaiStore.hydrated, false);
  assert.equal(globalThis.__miaiStore.workspaces.has("stale"), false);
  assert.equal(globalThis.__miaiStore.hydrating, undefined);
  failMigration = false;
  const recovered = await GET();
  assert.equal(recovered.status, 200);
  assert.equal((await recovered.json()).store, "hydrated");
  assert.equal(globalThis.__miaiStore.workspaces.has("stale"), false);
});
