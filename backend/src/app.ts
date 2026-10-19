import crypto from 'node:crypto';
import { Hono } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z, type ZodType } from 'zod';
import { encrypt } from './vault.js';
import type { Db } from './types.js';
import type { Catalog } from './catalog.js';
import type { Verified } from './profile.js';

export interface Deps {
  db: Db;
  token: string;
  secret: string;
  catalog: Catalog;
  /** Logs in with the cookies and finds the region; throws when the session is not valid. */
  verify: (cookies: string) => Promise<Verified>;
  /** Called after a change that deserves an immediate store check. */
  onChange: () => void;
}

const name = z.string().trim().min(1).max(64);
const accountBody = z.object({ name: name.optional(), cookies: z.string().max(8000).includes('ssid=') });
const wishBody = z.object({ name });
const alertsQuery = z.object({ since: z.coerce.number().int().min(0).default(0) });

// The Android client reads {"error": "..."} from every failure.
const validate = <T extends ZodType>(target: 'json' | 'query', schema: T) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const fields = [...new Set(result.error.issues.map((i) => i.path.join('.') || 'body'))].join(', ');
      return c.json({ error: `invalid: ${fields}` }, 400);
    }
  });

export function createApp({ db, token, secret, catalog, verify, onChange }: Deps) {
  const { state } = db;

  return new Hono()
    .onError((e, c) => c.json({ error: e.message }, e instanceof HTTPException ? e.status : 500))
    .notFound((c) => c.json({ error: 'not found' }, 404))
    .get('/health', (c) => c.json({ ok: true }))
    .use(bearerAuth({ token }))
    .get('/accounts', (c) =>
      c.json(state.accounts.map(({ id, name, shard, offers, error }) => ({ id, name, shard, offers, error }))),
    )
    .post('/accounts', validate('json', accountBody), async (c) => {
      const body = c.req.valid('json');
      let v;
      try {
        v = await verify(body.cookies);
      } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : 'Riot login failed' }, 400);
      }
      const cookies = encrypt(v.cookies, secret);
      // The same Riot account added again just refreshes its session.
      const known = state.accounts.find((a) => a.puuid === v.puuid);
      const id = known?.id ?? crypto.randomUUID().slice(0, 8);
      if (known) {
        Object.assign(known, { cookies, shard: v.shard, error: null });
      } else {
        const label = body.name ?? v.name ?? `Account ${state.accounts.length + 1}`;
        state.accounts.push({ id, puuid: v.puuid, name: label, shard: v.shard, cookies, offers: [], notified: [], error: null });
      }
      db.save();
      onChange();
      return c.json({ id });
    })
    .delete('/accounts/:id', (c) => {
      state.accounts = state.accounts.filter((a) => a.id !== c.req.param('id'));
      db.save();
      return c.json({});
    })
    .get('/wishlist', (c) => c.json(state.wishlist))
    .post('/wishlist', validate('json', wishBody), (c) => {
      const { name } = c.req.valid('json');
      if (!state.wishlist.includes(name)) state.wishlist.push(name);
      db.save();
      onChange();
      return c.json({});
    })
    .delete('/wishlist/:name', (c) => {
      state.wishlist = state.wishlist.filter((w) => w !== c.req.param('name'));
      db.save();
      return c.json({});
    })
    .get('/catalog', (c) => c.json(catalog.data))
    .get('/alerts', validate('query', alertsQuery), (c) => {
      const { since } = c.req.valid('query');
      return c.json(state.alerts.filter((a) => a.id > since));
    });
}
