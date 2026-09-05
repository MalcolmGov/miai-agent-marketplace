import { redisAvailable, redisGet, redisScanDel, redisSet } from "@/lib/redis";

/** A stored chat message — the shared shape used by every channel's rolling session history. */
export type StoredMessage = {
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
};

const DEFAULT_MAX_SESSIONS = 500;
const MAX_TURNS_KEPT = 24;
const SESSION_TTL_SEC = 24 * 60 * 60;

export type SessionStore<T extends StoredMessage> = {
  get(sessionKey: string): Promise<T[]>;
  set(sessionKey: string, messages: T[]): Promise<void>;
};

/**
 * Rolling per-session chat history: Redis-backed when available, else an in-process Map with a
 * turn cap, TTL, and simple eviction. Shared by the B2B channel path and the consumer path so
 * memory behaviour stays identical across surfaces. `redisPrefix` namespaces the Redis keys and
 * `bag` is the in-process fallback the caller owns (so a caller can keep per-channel bags).
 */
export function createSessionStore<T extends StoredMessage>(opts: {
  redisPrefix: string;
  bag: Map<string, T[]>;
  maxSessions?: number;
}): SessionStore<T> {
  const { redisPrefix, bag } = opts;
  const maxSessions = opts.maxSessions ?? DEFAULT_MAX_SESSIONS;
  return {
    async get(sessionKey) {
      if (redisAvailable()) {
        const raw = await redisGet(`${redisPrefix}${sessionKey}`);
        if (!raw) return [];
        try {
          return JSON.parse(raw) as T[];
        } catch {
          return [];
        }
      }
      return bag.get(sessionKey) ?? [];
    },
    async set(sessionKey, messages) {
      const trimmed = messages.slice(-MAX_TURNS_KEPT);
      if (redisAvailable()) {
        await redisSet(`${redisPrefix}${sessionKey}`, JSON.stringify(trimmed), SESSION_TTL_SEC);
        return;
      }
      if (!bag.has(sessionKey) && bag.size >= maxSessions) {
        const oldest = bag.keys().next().value;
        if (oldest) bag.delete(oldest);
      }
      bag.set(sessionKey, trimmed);
    },
  };
}

/**
 * DSAR: erase every rolling session for one owner across all agents/sessions. Session keys are
 * `${ownerId}::${agentId}::${sessionId}`; Redis namespaces them under `redisPrefix`. Clears both
 * the Redis copy (SCAN + DEL) and the in-process bag. Returns the number of sessions removed.
 */
export async function eraseOwnerSessions<T>(opts: {
  redisPrefix: string;
  bag: Map<string, T[]>;
  ownerId: string;
}): Promise<number> {
  const { redisPrefix, bag, ownerId } = opts;
  if (!ownerId) return 0;
  let cleared = 0;
  for (const k of [...bag.keys()]) {
    if (k.startsWith(`${ownerId}::`)) {
      bag.delete(k);
      cleared++;
    }
  }
  const viaRedis = await redisScanDel(`${redisPrefix}${ownerId}::*`);
  return cleared + viaRedis;
}
