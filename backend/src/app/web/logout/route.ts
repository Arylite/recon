import { json, route } from '../../../route';
import { readSession, sessionCookie } from '../../../session';

export const POST = route({ auth: 'web' }, async ({ req, deps }) => {
  await deps.db.revoke(readSession(req));
  return json({}, 200, { 'Set-Cookie': sessionCookie('', 0) });
});
