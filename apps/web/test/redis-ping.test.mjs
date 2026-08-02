import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";

describe("redis ping (B+ health)", () => {
  const keys = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];
  /** @type {Record<string, string | undefined>} */
  let saved = {};

  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("pingRedis reports not configured when env missing", async () => {
    saved = {};
    for (const k of keys) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    const { pingRedis, redisAvailable } = await import("../src/lib/redis.ts");
    assert.equal(redisAvailable(), false);
    const ping = await pingRedis();
    assert.equal(ping.configured, false);
    assert.equal(ping.backend, "none");
    assert.equal(ping.ok, false);
  });
});
