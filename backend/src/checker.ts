import { reauth } from './riot.js';
import { fetchOffers } from './store.js';
import { encrypt, decrypt } from './vault.js';
import type { Catalog } from './catalog.js';
import type { Db } from './types.js';

/** Offers matching the wishlist (case-insensitive substring); `fresh` are not yet alerted today. */
export function findNew(names: string[], wishlist: string[], notified: string[], day: string) {
  const hits = names.filter((n) => wishlist.some((w) => n.toLowerCase().includes(w.toLowerCase())));
  const keys = hits.map((n) => `${day}|${n}`);
  return { fresh: hits.filter((_, i) => !notified.includes(keys[i] ?? '')), notified: keys };
}

let busy = false;

export async function checkAll(db: Db, secret: string, catalog: Catalog): Promise<void> {
  if (busy) return;
  busy = true;
  const { state } = db;
  const day = new Date().toISOString().slice(0, 10);
  try {
    for (const user of state.users) {
      for (const acc of [...user.accounts]) {
        try {
          const creds = await reauth(decrypt(acc.cookies, secret));
          acc.cookies = encrypt(creds.cookies, secret);
          const offers = await Promise.all(
            (await fetchOffers(creds, acc.shard)).map(async (o) => ({ ...(await catalog.lookup(o.uuid)), cost: o.cost })),
          );
          const { fresh, notified } = findNew(offers.map((o) => o.name), user.wishlist, acc.notified, day);
          Object.assign(acc, { offers, notified, error: null });
          console.log(`check ${user.name}/${acc.name}: ${offers.length} offers, ${fresh.length} new wishlist hits`);
          for (const skin of fresh) user.alerts.push({ id: ++user.lastAlertId, ts: Date.now(), account: acc.name, skin });
        } catch (e) {
          acc.error = e instanceof Error ? e.message : String(e);
          console.error(`check ${user.name}/${acc.name} failed: ${acc.error}`);
        }
      }
      user.alerts = user.alerts.slice(-200);
    }
    db.save();
  } finally {
    busy = false;
  }
}
