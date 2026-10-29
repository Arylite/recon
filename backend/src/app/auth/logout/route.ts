import { bearer } from '../../../guard';
import { route } from '../../../route';

export const POST = route({ auth: 'app' }, async ({ req, deps }) => {
  await deps.db.revoke(bearer(req.headers.get('Authorization')));
  return {};
});
