import { route } from '../../route';
import { wishBody } from '../../schemas';

// A new wish triggers a store check right after the response.
export const maxDuration = 60;

export const GET = route({ auth: 'user' }, async ({ user }) => user.wishlist);

export const POST = route({ auth: 'user', body: wishBody }, async ({ deps, user, body }) => {
  await deps.db.update(user.id, (u) => void (u.wishlist.includes(body.name) || u.wishlist.push(body.name)));
  deps.onChange(user.id);
  return {};
});
