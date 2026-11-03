import { route } from '../../../route';
import { refreshQuery } from '../../../schemas';

// Reading every store from Riot can take a while.
export const maxDuration = 60;

/**
 * Checks the user's stores: the phone calls it on its own schedule, so the server does not have to.
 * Today's store comes from the cache; `force=1` (the refresh button) reads Riot again, a few times
 * an hour at most, past that it quietly falls back to the cache.
 */
export const POST = route({ auth: 'user', query: refreshQuery }, async ({ deps, user, query }) => {
  const force = query.force && (await deps.kv.hit(`rl:refresh:${user.id}`, 3600)) <= 10;
  await deps.checkUser(user.id, force);
  return {};
});
