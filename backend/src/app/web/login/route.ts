import { signIn } from '../../../flow';
import { json, route } from '../../../route';
import { credentials } from '../../../schemas';
import { WEB_TGT_MS, sessionCookie } from '../../../session';

export const POST = route({ auth: 'web', body: credentials }, async ({ req, deps, body }) => {
  const tgt = await signIn(deps, req, body.name, body.password, WEB_TGT_MS);
  return json({ name: body.name }, 200, { 'Set-Cookie': sessionCookie(tgt) });
});
