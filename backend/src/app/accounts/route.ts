import crypto from 'node:crypto';
import { ApiError } from '../../guard';
import { route } from '../../route';
import { accountBody } from '../../schemas';
import { encrypt } from '../../vault';

// The new account is checked in the background right after the response.
export const maxDuration = 60;

export const GET = route({ auth: 'user' }, async ({ user }) => user.accounts.map(({ id, name, shard, offers, error }) => ({ id, name, shard, offers, error })));

export const POST = route({ auth: 'user', body: accountBody }, async ({ deps, user, body }) => {
  // Each one is a Riot login: slow down someone who feeds the endpoint.
  if ((await deps.kv.hit(`rl:accounts:${user.id}`, 3600)) > 20) throw new ApiError(429, 'too many attempts, try again later');
  let v;
  try {
    v = await deps.verify(body.cookies);
  } catch (e) {
    throw new ApiError(400, e instanceof Error ? e.message : 'Riot login failed');
  }
  const cookies = encrypt(v.cookies, deps.secret);
  const fresh = crypto.randomUUID().slice(0, 8);
  // The same Riot account added again just refreshes its session.
  const id = await deps.db.update(user.id, (u) => {
    const known = u.accounts.find((a) => a.puuid === v.puuid);
    if (known) {
      Object.assign(known, { cookies, shard: v.shard, error: null });
      return known.id;
    }
    const label = body.name ?? v.name ?? `Account ${u.accounts.length + 1}`;
    u.accounts.push({ id: fresh, puuid: v.puuid, name: label, shard: v.shard, cookies, offers: [], notified: [], error: null });
    return fresh;
  });
  deps.onChange(user.id);
  return { id };
});
