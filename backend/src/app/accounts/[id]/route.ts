import { route } from '../../../route';

export const DELETE = route({ auth: 'user' }, async ({ deps, user, params }) => {
  await deps.db.update(user.id, (u) => void (u.accounts = u.accounts.filter((a) => a.id !== params.id)));
  return {};
});
