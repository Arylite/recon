import crypto from 'node:crypto';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { validate } from './validate.js';
import { encrypt } from './vault.js';
import { checkPassword, hashPassword, issueTicket, newTgt, readTicket, sha256 } from './auth.js';
import type { Db, User } from './types.js';
import type { Catalog } from './catalog.js';
import type { Verified } from './profile.js';

export interface Deps {
  db: Db;
  /** App key baked into the APK; it only keeps scanners out, the user tickets guard the data. */
  token: string;
  secret: string;
  catalog: Catalog;
  /** Logs in with the cookies and finds the region; throws when the session is not valid. */
  verify: (cookies: string) => Promise<Verified>;
  /** Called after a change that deserves an immediate store check. */
  onChange: () => void;
}

const name = z.string().trim().min(1).max(64);
const credentials = z.object({
  name: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,32}$/, '3 to 32 letters, digits or _'),
  password: z.string().regex(/^[0-9a-f]{64}$/), // a pbkdf2 hash from the app, never the password
});
const accountBody = z.object({ name: name.optional(), cookies: z.string().max(8000).includes('ssid=') });
const wishBody = z.object({ name });
const alertsQuery = z.object({ since: z.coerce.number().int().min(0).default(0) });
const MAX_TGTS = 10;

const bearer = (h: string | undefined) => h?.match(/^Bearer (.+)$/)?.[1] ?? '';

export function createApp({ db, token, secret, catalog, verify, onChange }: Deps) {
  const { state } = db;
  const now = () => Date.now();

  const grant = (user: User) => {
    const { tgt, stored } = newTgt();
    user.tgts = [...user.tgts.filter((t) => t.exp > now()), stored].slice(-MAX_TGTS);
    db.save();
    return { tgt };
  };
  const byTgt = (tgt: string) => {
    const hash = sha256(tgt);
    return state.users.find((u) => u.tgts.some((t) => t.hash === hash && t.exp > now()));
  };

  return new Hono<{ Variables: { user: User } }>()
    .onError((e, c) => (console.error(`${c.req.method} ${c.req.path} failed:`, e), c.json({ error: e.message }, e instanceof HTTPException ? e.status : 500)))
    .notFound((c) => c.json({ error: 'not found' }, 404))
    .get('/health', (c) => c.json({ ok: true }))
    .use(async (c, next) => {
      if (c.req.header('X-App-Key') !== token) return c.json({ error: 'unknown app' }, 401);
      await next();
    })
    .post('/auth/register', validate('json', credentials), (c) => {
      const { name, password } = c.req.valid('json');
      if (state.users.some((u) => u.name === name)) return c.json({ error: 'this name is taken' }, 409);
      const user: User = { id: crypto.randomUUID().slice(0, 8), name, password: hashPassword(password), tgts: [], accounts: [], wishlist: [], alerts: [], lastAlertId: 0 };
      state.users.push(user);
      return c.json(grant(user));
    })
    .post('/auth/login', validate('json', credentials), (c) => {
      const { name, password } = c.req.valid('json');
      const user = state.users.find((u) => u.name === name);
      if (!user || !checkPassword(password, user.password)) return c.json({ error: 'wrong name or password' }, 401);
      return c.json(grant(user));
    })
    // Trades the ticket-granting ticket for a short service ticket used on every other call.
    .post('/auth/ticket', (c) => {
      const user = byTgt(bearer(c.req.header('Authorization')));
      if (!user) return c.json({ error: 'signed out, sign in again' }, 401);
      return c.json({ name: user.name, ...issueTicket(user.id, secret) });
    })
    .post('/auth/logout', (c) => {
      const hash = sha256(bearer(c.req.header('Authorization')));
      for (const u of state.users) u.tgts = u.tgts.filter((t) => t.hash !== hash);
      db.save();
      return c.json({});
    })
    .use(async (c, next) => {
      const id = readTicket(bearer(c.req.header('Authorization')), secret);
      const user = id && state.users.find((u) => u.id === id);
      if (!user) return c.json({ error: 'ticket expired' }, 401);
      c.set('user', user);
      await next();
    })
    .get('/accounts', (c) =>
      c.json(c.var.user.accounts.map(({ id, name, shard, offers, error }) => ({ id, name, shard, offers, error }))),
    )
    .post('/accounts', validate('json', accountBody), async (c) => {
      const body = c.req.valid('json');
      const { user } = c.var;
      let v;
      try {
        v = await verify(body.cookies);
      } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : 'Riot login failed' }, 400);
      }
      const cookies = encrypt(v.cookies, secret);
      // The same Riot account added again just refreshes its session.
      const known = user.accounts.find((a) => a.puuid === v.puuid);
      const id = known?.id ?? crypto.randomUUID().slice(0, 8);
      if (known) {
        Object.assign(known, { cookies, shard: v.shard, error: null });
      } else {
        const label = body.name ?? v.name ?? `Account ${user.accounts.length + 1}`;
        user.accounts.push({ id, puuid: v.puuid, name: label, shard: v.shard, cookies, offers: [], notified: [], error: null });
      }
      db.save();
      onChange();
      return c.json({ id });
    })
    .delete('/accounts/:id', (c) => {
      c.var.user.accounts = c.var.user.accounts.filter((a) => a.id !== c.req.param('id'));
      db.save();
      return c.json({});
    })
    .get('/wishlist', (c) => c.json(c.var.user.wishlist))
    .post('/wishlist', validate('json', wishBody), (c) => {
      const { name } = c.req.valid('json');
      if (!c.var.user.wishlist.includes(name)) c.var.user.wishlist.push(name);
      db.save();
      onChange();
      return c.json({});
    })
    .delete('/wishlist/:name', (c) => {
      c.var.user.wishlist = c.var.user.wishlist.filter((w) => w !== c.req.param('name'));
      db.save();
      return c.json({});
    })
    .get('/catalog', (c) => c.json(catalog.data))
    // A fake alert for "Send a test notification"; the app picks it up like a real one.
    .post('/alerts/test', (c) => {
      const u = c.var.user;
      u.alerts.push({ id: ++u.lastAlertId, ts: Date.now(), account: u.accounts[0]?.name ?? 'Recon', skin: 'Reaver Vandal (test)' });
      db.save();
      return c.json({ id: u.lastAlertId });
    })
    .get('/alerts', validate('query', alertsQuery), (c) => {
      const { since } = c.req.valid('query');
      return c.json(c.var.user.alerts.filter((a) => a.id > since));
    });
}
