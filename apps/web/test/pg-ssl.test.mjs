import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { sslFor, databaseUrl, pgSslVerifyEnabled } from "../src/lib/pg.ts";

const ENV_KEYS = [
  "DATABASE_URL",
  "MIAI_DATABASE_URL",
  "PG_SSL_REJECT_UNAUTHORIZED",
  "PGSSLROOTCERT",
  "NODE_EXTRA_CA_CERTS",
];

/** @type {Record<string, string | undefined>} */
let savedEnv = {};

function snapshotEnv() {
  savedEnv = {};
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
  }
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const val = savedEnv[key];
    if (val === undefined) delete process.env[key];
    else process.env[key] = val;
  }
}

function setEnv(/** @type {Record<string, string | undefined>} */ overrides) {
  for (const key of ENV_KEYS) {
    if (!(key in overrides)) continue;
    const val = overrides[key];
    if (val === undefined) delete process.env[key];
    else process.env[key] = val;
  }
}

describe("pg helpers (no Postgres required)", () => {
  beforeEach(() => snapshotEnv());
  afterEach(() => restoreEnv());

  it("databaseUrl prefers DATABASE_URL then MIAI_DATABASE_URL", () => {
    delete process.env.DATABASE_URL;
    delete process.env.MIAI_DATABASE_URL;
    assert.equal(databaseUrl(), undefined);

    setEnv({ MIAI_DATABASE_URL: "postgresql://miai@localhost/db" });
    assert.equal(databaseUrl(), "postgresql://miai@localhost/db");

    setEnv({ DATABASE_URL: "postgresql://primary@localhost/db" });
    assert.equal(databaseUrl(), "postgresql://primary@localhost/db");
  });

  it("databaseUrl trims whitespace", () => {
    setEnv({ DATABASE_URL: "  postgresql://localhost/app  " });
    assert.equal(databaseUrl(), "postgresql://localhost/app");
  });

  it("sslFor disables SSL for localhost", () => {
    assert.equal(sslFor("postgresql://user:pass@localhost:5432/db"), false);
    assert.equal(sslFor("postgresql://user:pass@127.0.0.1:5432/db"), false);
  });

  it("sslFor defaults to verified SSL for remote hosts", () => {
    delete process.env.PG_SSL_REJECT_UNAUTHORIZED;
    delete process.env.PGSSLROOTCERT;
    delete process.env.NODE_EXTRA_CA_CERTS;
    assert.equal(pgSslVerifyEnabled("postgresql://user:pass@db.example.com:5432/db"), true);
    assert.deepEqual(sslFor("postgresql://user:pass@db.example.com:5432/db"), {
      rejectUnauthorized: true,
    });
  });

  it("sslFor allows explicit insecure opt-out", () => {
    setEnv({ PG_SSL_REJECT_UNAUTHORIZED: "0" });
    assert.equal(pgSslVerifyEnabled("postgresql://user:pass@db.example.com:5432/db"), false);
    assert.deepEqual(sslFor("postgresql://user:pass@db.example.com:5432/db"), {
      rejectUnauthorized: false,
    });
  });
});
