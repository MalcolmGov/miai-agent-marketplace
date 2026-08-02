import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { sslFor, databaseUrl } from "../src/lib/pg.ts";

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

  it("sslFor defaults to permissive SSL for remote hosts", () => {
    delete process.env.PG_SSL_REJECT_UNAUTHORIZED;
    delete process.env.PGSSLROOTCERT;
    delete process.env.NODE_EXTRA_CA_CERTS;
    assert.deepEqual(sslFor("postgresql://user:pass@db.example.com:5432/db"), {
      rejectUnauthorized: false,
    });
  });

  it("sslFor enables verification when PG_SSL_REJECT_UNAUTHORIZED=1", () => {
    setEnv({ PG_SSL_REJECT_UNAUTHORIZED: "1" });
    assert.deepEqual(sslFor("postgresql://user:pass@db.example.com:5432/db"), {
      rejectUnauthorized: true,
    });
  });

  it("sslFor enables verification when PGSSLROOTCERT is set", () => {
    delete process.env.PG_SSL_REJECT_UNAUTHORIZED;
    setEnv({ PGSSLROOTCERT: "/etc/ssl/certs/ca.pem" });
    assert.deepEqual(sslFor("postgresql://user:pass@db.example.com:5432/db"), {
      rejectUnauthorized: true,
    });
  });

  it("sslFor enables verification when NODE_EXTRA_CA_CERTS is set", () => {
    delete process.env.PG_SSL_REJECT_UNAUTHORIZED;
    delete process.env.PGSSLROOTCERT;
    setEnv({ NODE_EXTRA_CA_CERTS: "/etc/ssl/certs/extra.pem" });
    assert.deepEqual(sslFor("postgresql://user:pass@db.example.com:5432/db"), {
      rejectUnauthorized: true,
    });
  });
});
