import { reauth } from './riot';
import { fetchOffers } from './store';
import { encrypt, decrypt } from './vault';
import type { Catalog } from './catalog';
import type { Db } from './db';
import type { Offer } from './types';

/** Offers matching the wishlist (case-insensitive substring); `fresh` are not yet alerted today. */
export function findNew(names: string[], wishlist: string[], notified: string[], day: string) {
  const hits = names.filter((n) => wishlist.some((w) => n.toLowerCase().includes(w.toLowerCase())));
  const keys = hits.map((n) => `${day}|${n}`);
  return { fresh: hits.filter((_, i) => !notified.includes(keys[i] ?? '')), notified: keys };
}

interface Outcome {
  id: string;
  /** The cookies read at the start: the result is dropped if the account was added again meanwhile. */
  was: string;
  cookies?: string;
  offers?: Offer[];
  notified?: string[];
  fresh?: string[];
  error: string | null;
}

/**
 * Reads the store of every account of one user. The Riot calls run unlocked, then the result is
 * merged into the current document, so a change the user made meanwhile is never lost.
 */
export async function checkUser(db: Db, secret: string, catalog: Catalog, id: string): Promise<void> {
  // Riot rotates the session cookie on every login: two parallel checks would break the account.
  const unlock = await db.tryLock(`check:${id}`, 120);
  if (!unlock) return;
  try {
    const user = await db.user(id);
    if (!user) return;
    const day = new Date().toISOString().slice(0, 10);
    const outcomes: Outcome[] = [];
    for (const acc of user.accounts) {
      try {
        const creds = await reauth(decrypt(acc.cookies, secret));
        const offers = await Promise.all((await fetchOffers(creds, acc.shard)).map(async (o) => ({ ...(await catalog.lookup(o.uuid)), cost: o.cost })));
        const { fresh, notified } = findNew(offers.map((o) => o.name), user.wishlist, acc.notified, day);
        console.log(`check ${user.name}/${acc.name}: ${offers.length} offers, ${fresh.length} new wishlist hits`);
        outcomes.push({ id: acc.id, was: acc.cookies, cookies: encrypt(creds.cookies, secret), offers, notified, fresh, error: null });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        console.error(`check ${user.name}/${acc.name} failed: ${error}`);
        outcomes.push({ id: acc.id, was: acc.cookies, error });
      }
    }
    await db.update(id, (u) => {
      for (const o of outcomes) {
        const acc = u.accounts.find((a) => a.id === o.id);
        if (!acc || acc.cookies !== o.was) continue;
        acc.error = o.error;
        if (o.error !== null) continue;
        Object.assign(acc, { cookies: o.cookies, offers: o.offers, notified: o.notified });
        for (const skin of o.fresh ?? []) u.alerts.push({ id: ++u.lastAlertId, ts: Date.now(), account: acc.name, skin });
      }
      u.alerts = u.alerts.slice(-200);
    });
  } finally {
    await unlock();
  }
}

/** Checks every user, a few at a time so one slow account does not hold the others back. */
export async function checkAll(db: Db, secret: string, catalog: Catalog): Promise<void> {
  const queue = await db.ids();
  const worker = async () => {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      await checkUser(db, secret, catalog, id).catch((e: unknown) => console.error('check failed:', e));
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
}
