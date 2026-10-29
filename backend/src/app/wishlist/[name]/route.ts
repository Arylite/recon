import { route } from '../../../route';

export const DELETE = route({ auth: 'user' }, async ({ deps, user, params }) => {
  await deps.db.update(user.id, (u) => void (u.wishlist = u.wishlist.filter((w) => w !== params.name)));
  return {};
});
