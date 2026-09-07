import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

const TMP_CREDS = path.join(os.tmpdir(), `miai-test-creds-${process.pid}.json`);
let userCreds;

before(async () => {
  process.env.USER_CREDENTIALS_PATH = TMP_CREDS;
  delete process.env.DATABASE_URL;
  userCreds = await import("../src/lib/user-credentials.ts");
});

after(async () => {
  delete process.env.USER_CREDENTIALS_PATH;
  await fs.rm(TMP_CREDS, { force: true });
});

describe("user credentials (hashing & security)", () => {
  it("generates 32-character random hex salts", () => {
    const s1 = userCreds.generateSalt();
    const s2 = userCreds.generateSalt();
    assert.equal(s1.length, 32);
    assert.equal(s2.length, 32);
    assert.notEqual(s1, s2);
  });

  it("produces deterministic PBKDF2 hashes for identical salt & password", () => {
    const salt = userCreds.generateSalt();
    const h1 = userCreds.hashPassword("SuperSecret123!", salt);
    const h2 = userCreds.hashPassword("SuperSecret123!", salt);
    assert.equal(h1, h2);
    assert.equal(h1.length, 64); // 32 bytes hex = 64 chars
  });

  it("produces different hashes for different salts", () => {
    const s1 = userCreds.generateSalt();
    const s2 = userCreds.generateSalt();
    const h1 = userCreds.hashPassword("SuperSecret123!", s1);
    const h2 = userCreds.hashPassword("SuperSecret123!", s2);
    assert.notEqual(h1, h2);
  });
});

describe("user credentials (creation & verification)", () => {
  it("creates a new user and persists credentials", async () => {
    const email = "alice@myinstantai.com";
    const res = await userCreds.createUserCredential(email, "Password123!");
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.cred.email, email);
      assert.ok(res.cred.userId.startsWith("cred_"));
      assert.ok(res.cred.passwordHash);
      assert.ok(res.cred.passwordSalt);
    }

    const fetched = await userCreds.getUserCredential(email);
    assert.ok(fetched);
    assert.equal(fetched.email, email);
  });

  it("rejects password shorter than 8 characters", async () => {
    const res = await userCreds.createUserCredential("bob@myinstantai.com", "short");
    assert.equal(res.ok, false);
  });

  it("prevents duplicate user registration", async () => {
    const email = "alice@myinstantai.com";
    const res = await userCreds.createUserCredential(email, "AnotherPassword123!");
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.ok(res.error.includes("already exists"));
    }
  });

  it("verifies correct password and returns userId", async () => {
    const email = "alice@myinstantai.com";
    const verified = await userCreds.verifyUserPassword(email, "Password123!");
    assert.equal(verified.ok, true);
    assert.ok(verified.userId?.startsWith("cred_"));
  });

  it("rejects incorrect password", async () => {
    const email = "alice@myinstantai.com";
    const verified = await userCreds.verifyUserPassword(email, "WrongPassword!");
    assert.equal(verified.ok, false);
    assert.equal(verified.error, "Incorrect password");
  });

  it("returns appropriate error when email is not found", async () => {
    const verified = await userCreds.verifyUserPassword("nonexistent@myinstantai.com", "Password123!");
    assert.equal(verified.ok, false);
    assert.ok(verified.error?.includes("No account found"));
  });
});
