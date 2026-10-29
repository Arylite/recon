import { signUp } from '../../../flow';
import { route } from '../../../route';
import { credentials } from '../../../schemas';
import { APP_TGT_MS } from '../../../session';

export const POST = route({ auth: 'app', body: credentials }, async ({ req, deps, body }) => ({ tgt: await signUp(deps, req, body.name, body.password, APP_TGT_MS) }));
