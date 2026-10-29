import { newTgt, sha256 } from './auth';
import type { Kv } from './kv';
import type { User } from './types';

const MAX_TGTS = 10;
const LOCK_SEC = 5;

export type Db = ReturnType<typeof openDb>;

/**
 * Users live in Redis, one document each, so serverless instances share them. Every write goes
 * through `update`, a locked read-modify-write: two requests never overwrite each other.
 */
export function openDb(kv: Kv) {
  const user = (id: string) => kv.get<User>(`user:${id}`);
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /** Takes a lock once; resolves the function that releases it, or null when it is held. */
  async function tryLock(name: string, sec: number) {
    return (await kv.set(`lock:${name}`, 1, { nx: true, ex: sec })) ? () => kv.del(`lock:${name}`) : null;
  }

  async function update<T>(id: string, fn: (u: User) => T): Promise<T | undefined> {
    for (let i = 0; i < 60; i++) {
      const unlock = await tryLock(`user:${id}`, LOCK_SEC);
      if (!unlock) {
        await wait(30 + Math.random() * 70);
        continue;
      }
      try {
        const u = await user(id);
        if (!u) return undefined;
        const out = fn(u);
        await kv.set(`user:${id}`, u);
        return out;
      } finally {
        await unlock();
      }
    }
    throw new Error('the database is busy, try again');
  }

  return {
    user,
    tryLock,
    update,
    ids: () => kv.members('users'),
    async byName(name: string) {
      const id = await kv.get<string>(`name:${name}`);
      return id ? user(id) : null;
    },
    async byTgt(tgt: string) {
      const id = await kv.get<string>(`tgt:${sha256(tgt)}`);
      return id ? user(id) : null;
    },
    /** False when the name is already taken. */
    async create(u: User) {
      await kv.set(`user:${u.id}`, u);
      if (!(await kv.set(`name:${u.name}`, u.id, { nx: true }))) {
        await kv.del(`user:${u.id}`);
        return false;
      }
      await kv.add('users', u.id);
      return true;
    },
    /** A new ticket-granting ticket; only its hash is stored, and the oldest ones beyond ten are dropped. */
    async grant(id: string, ttlMs: number) {
      const { tgt, stored } = newTgt(ttlMs);
      const dropped = await update(id, (u) => {
        const all = [...u.tgts.filter((t) => t.exp > Date.now()), stored];
        u.tgts = all.slice(-MAX_TGTS);
        return all.slice(0, -MAX_TGTS);
      });
      if (!dropped) throw new Error('unknown user');
      await Promise.all(dropped.map((t) => kv.del(`tgt:${t.hash}`)));
      await kv.set(`tgt:${stored.hash}`, id, { ex: Math.ceil(ttlMs / 1000) });
      return tgt;
    },
    async revoke(tgt: string) {
      const hash = sha256(tgt);
      const id = await kv.get<string>(`tgt:${hash}`);
      if (!id) return;
      await kv.del(`tgt:${hash}`);
      await update(id, (u) => void (u.tgts = u.tgts.filter((t) => t.hash !== hash)));
    },
  };
}
