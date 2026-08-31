import 'server-only';

import { loginRateLimit, serverEnv } from '@/lib/env';

/**
 * Fixed-window rate limiter.
 *
 * Redis is used when REDIS_URL is reachable so the window is shared across
 * containers; otherwise it falls back to an in-process Map. The fallback is
 * deliberate: a limiter that throws when its backing store is down would take
 * sign-in and the public click beacon down with it. Redis failures degrade to
 * per-instance counting instead of erroring.
 */

type RedisLike = {
  incr(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<unknown>;
  pttl(key: string): Promise<number>;
};

let redis: RedisLike | null = null;
let redisInit: Promise<RedisLike | null> | null = null;
// After a failure, stop hammering a dead Redis for this long.
let redisDisabledUntil = 0;
const REDIS_COOLDOWN_MS = 30_000;

async function getRedis(): Promise<RedisLike | null> {
  if (Date.now() < redisDisabledUntil) return null;
  if (redis) return redis;
  if (redisInit) return redisInit;

  const url = serverEnv().REDIS_URL;
  if (!url) return null;

  redisInit = (async () => {
    try {
      const { default: Redis } = await import('ioredis');
      const client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        // Fail commands immediately rather than queueing them while down.
        enableOfflineQueue: false,
        connectTimeout: 1500,
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
      });
      // ioredis emits 'error' on every reconnect attempt; without a listener
      // Node treats it as an unhandled error event.
      client.on('error', () => {
        redisDisabledUntil = Date.now() + REDIS_COOLDOWN_MS;
      });
      await client.connect();
      redis = client as unknown as RedisLike;
      return redis;
    } catch {
      redisDisabledUntil = Date.now() + REDIS_COOLDOWN_MS;
      return null;
    } finally {
      redisInit = null;
    }
  })();

  return redisInit;
}

const mem = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, limit: number, windowSeconds: number): RateResult {
  const now = Date.now();

  // Opportunistic sweep so the map cannot grow without bound.
  if (mem.size > 5000) {
    for (const [k, v] of mem) if (v.resetAt < now) mem.delete(k);
  }

  const entry = mem.get(key);
  if (!entry || entry.resetAt < now) {
    mem.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  entry.count += 1;
  const ok = entry.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - entry.count),
    retryAfterSec: ok ? 0 : Math.ceil((entry.resetAt - now) / 1000),
  };
}

export type RateResult = { ok: boolean; remaining: number; retryAfterSec: number };

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateResult> {
  const namespaced = `rl:${key}`;

  let client: RedisLike | null = null;
  try {
    client = await getRedis();
  } catch {
    client = null;
  }

  if (client) {
    try {
      const count = await client.incr(namespaced);
      if (count === 1) await client.pexpire(namespaced, windowSeconds * 1000);
      const ttl = await client.pttl(namespaced);
      const ok = count <= limit;
      return {
        ok,
        remaining: Math.max(0, limit - count),
        retryAfterSec: ok
          ? 0
          : Math.ceil((ttl > 0 ? ttl : windowSeconds * 1000) / 1000),
      };
    } catch {
      redisDisabledUntil = Date.now() + REDIS_COOLDOWN_MS;
      // fall through to the in-memory window
    }
  }

  return memoryLimit(namespaced, limit, windowSeconds);
}

/** Convenience wrapper for the login endpoint using env-configured limits. */
export function loginLimiter(ipOrEmail: string) {
  const { attempts, windowSeconds } = loginRateLimit();
  return rateLimit(`login:${ipOrEmail}`, attempts, windowSeconds);
}
