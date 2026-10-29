import { Redis } from '@upstash/redis';

/** The few Redis commands the backend needs; values are JSON. */
export interface Kv {
  get: <T>(key: string) => Promise<T | null>;
  /** Resolves false when `nx` is set and the key already exists. */
  set: (key: string, value: unknown, opts?: { ex?: number; nx?: boolean }) => Promise<boolean>;
  del: (key: string) => Promise<void>;
  /** Fixed-window counter: adds one and returns the count; the window starts on the first hit. */
  hit: (key: string, windowSec: number) => Promise<number>;
  add: (set: string, member: string) => Promise<void>;
  members: (set: string) => Promise<string[]>;
}

export function memoryKv(): Kv {
  const map = new Map<string, { v: string; exp: number }>();
  const sets = new Map<string, Set<string>>();
  const live = (key: string) => {
    const e = map.get(key);
    if (e && e.exp <= Date.now()) map.delete(key);
    return map.get(key);
  };
  return {
    get: async <T>(key: string) => {
      const e = live(key);
      return e ? (JSON.parse(e.v) as T) : null;
    },
    set: async (key, value, { ex, nx } = {}) => {
      if (nx && live(key)) return false;
      map.set(key, { v: JSON.stringify(value), exp: ex ? Date.now() + ex * 1000 : Infinity });
      return true;
    },
    del: async (key) => void map.delete(key),
    hit: async (key, windowSec) => {
      const n = Number(live(key)?.v ?? 0) + 1;
      map.set(key, { v: String(n), exp: live(key)?.exp ?? Date.now() + windowSec * 1000 });
      return n;
    },
    add: async (set, member) => void sets.set(set, (sets.get(set) ?? new Set()).add(member)),
    members: async (set) => [...(sets.get(set) ?? [])],
  };
}

export function redisKv(redis: Redis): Kv {
  return {
    get: async <T>(key: string) => {
      const raw = await redis.get<string>(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    },
    set: async (key, value, { ex, nx } = {}) => {
      const opts = { ...(ex ? { ex } : {}), ...(nx ? { nx: true } : {}) } as { ex: number; nx: true };
      return (await redis.set(key, JSON.stringify(value), opts)) === 'OK';
    },
    del: async (key) => void (await redis.del(key)),
    // MULTI so a crash between the two commands never leaves a counter that does not expire.
    hit: async (key, windowSec) => {
      const [n] = await redis.multi().incr(key).expire(key, windowSec, 'NX').exec<[number, number]>();
      return n;
    },
    add: async (set, member) => void (await redis.sadd(set, member)),
    members: (set) => redis.smembers(set),
  };
}

/** Upstash Redis from the Vercel integration (KV_REST_API_*) or Upstash itself (UPSTASH_REDIS_REST_*). */
export function kvFromEnv(env = process.env): Kv | null {
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN;
  // Our own JSON encoding: automatic deserialization would turn an all-digit id into a number.
  return url && token ? redisKv(new Redis({ url, token, automaticDeserialization: false })) : null;
}
