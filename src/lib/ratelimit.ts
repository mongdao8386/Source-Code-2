import 'server-only';

import { loginRateLimit, serverEnv } from '@/lib/env';

/**
 * Fixed-window rate limiter. Uses Redis when REDIS_URL is set (shared across
 * containers), otherwise an in-process Map (fine for a single instance / dev).
 */

type RedisLike = {
  incr(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<unknown>;
  pttl(key: string): Promise<number>;
};

let redis: RedisLike | null = null;
let redisTried = false;

async function getRedis(): Promise<RedisLike | null> {
  if (redisTried) return redis;
  redisTried = true;
  const url = serverEnv().REDIS_URL;
  if (!url) return null;
  try {
    const { default: Redis } = await import('ioredis');
    redis = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: false }) as unknown as RedisLike;
  } catch {
    redis = null;
  }
  return redis;
}

const mem = new Map<string, { count: number; resetAt: number }>();

export type RateResult = { ok: boolean; remaining: number; retryAfterSec: number };

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateResult> {
  const r = await getRedis();
  const namespaced = `rl:${key}`;

  if (r) {
    const count = await r.incr(namespaced);
    if (count === 1) await r.pexpire(namespaced, windowSeconds * 1000);
    const ttl = await r.pttl(namespaced);
    const ok = count <= limit;
    return {
      ok,
      remaining: Math.max(0, limit - count),
      retryAfterSec: ok ? 0 : Math.ceil((ttl > 0 ? ttl : windowSeconds * 1000) / 1000),
    };
  }

  const now = Date.now();
  const entry = mem.get(namespaced);
  if (!entry || entry.resetAt < now) {
    mem.set(namespaced, { count: 1, resetAt: now + windowSeconds * 1000 });
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

/** Convenience wrapper for the login endpoint using env-configured limits. */
export function loginLimiter(ipOrEmail: string) {
  const { attempts, windowSeconds } = loginRateLimit();
  return rateLimit(`login:${ipOrEmail}`, attempts, windowSeconds);
}
