/**
 * Optional Upstash Redis REST client (fetch-only, no ioredis).
 *
 * Env: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
 * REDIS_URL is accepted as a documented alias for a future native client — unused in v1.
 * When not configured, all helpers no-op / return null and callers fall back to in-process state.
 */

type UpstashConfig = { url: string; token: string };

function upstashConfig(): UpstashConfig | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token) return { url: url.replace(/\/$/, ""), token };
  return null;
}

/** True when Upstash REST credentials are present. */
export function redisAvailable(): boolean {
  return upstashConfig() !== null;
}

export type RedisPing =
  | { configured: false; ok: false; backend: "none" }
  | { configured: true; ok: boolean; backend: "upstash-rest"; error?: string };

/** Lightweight readiness probe for /api/health (PING). */
export async function pingRedis(): Promise<RedisPing> {
  if (!upstashConfig()) {
    return { configured: false, ok: false, backend: "none" };
  }
  try {
    const result = await upstashCommand("PING");
    if (result === "PONG" || result === "pong") {
      return { configured: true, ok: true, backend: "upstash-rest" };
    }
    return {
      configured: true,
      ok: false,
      backend: "upstash-rest",
      error: `unexpected PING result: ${String(result)}`,
    };
  } catch (err) {
    return {
      configured: true,
      ok: false,
      backend: "upstash-rest",
      error: err instanceof Error ? err.message : "ping failed",
    };
  }
}

async function upstashCommand(...args: string[]): Promise<unknown> {
  const cfg = upstashConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: unknown };
    return data.result ?? null;
  } catch {
    return null;
  }
}

/** Increment key; sets EXPIRE on first increment when ttlSec > 0. Returns null when Redis unavailable. */
export async function redisIncr(key: string, ttlSec?: number): Promise<number | null> {
  const count = await upstashCommand("INCR", key);
  if (typeof count !== "number") return null;
  if (count === 1 && ttlSec != null && ttlSec > 0) {
    await upstashCommand("EXPIRE", key, String(Math.ceil(ttlSec)));
  }
  return count;
}

/** Remaining TTL in seconds (-1 = no expiry, -2 = missing). Null when Redis unavailable. */
export async function redisTtl(key: string): Promise<number | null> {
  const ttl = await upstashCommand("TTL", key);
  return typeof ttl === "number" ? ttl : null;
}

export async function redisGet(key: string): Promise<string | null> {
  const val = await upstashCommand("GET", key);
  if (val == null) return null;
  return String(val);
}

export async function redisSet(key: string, value: string, ttlSec?: number): Promise<boolean> {
  const args =
    ttlSec != null && ttlSec > 0
      ? (["SET", key, value, "EX", String(Math.ceil(ttlSec))] as string[])
      : (["SET", key, value] as string[]);
  const result = await upstashCommand(...args);
  return result === "OK";
}

export async function redisDel(key: string): Promise<boolean> {
  const result = await upstashCommand("DEL", key);
  return typeof result === "number" && result > 0;
}
