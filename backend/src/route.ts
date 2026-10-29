import { z, type ZodType } from 'zod';
import { readTicket, safeEqual } from './auth';
import { ApiError, bearer, sameOrigin } from './guard';
import { readSession } from './session';
import { services, type Deps } from './services';
import type { User } from './types';

/**
 * none: open. app: the APK's key. user: a signed-in user, either the app (key + service ticket) or
 * the website (session cookie, same-origin only). web: the website's sign-in, same-origin only.
 * cron: the scheduler's bearer secret.
 */
export type Auth = 'none' | 'app' | 'user' | 'web' | 'cron';

interface Ctx<B, Q> {
  req: Request;
  deps: Deps;
  user: User;
  body: B;
  query: Q;
  params: Record<string, string>;
}

const none = z.undefined();
const reply = (data: unknown, status = 200, headers?: HeadersInit) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
/** A handler result: a Response as it is, anything else as JSON. */
export const json = reply;

async function authenticate(auth: Auth, req: Request, deps: Deps): Promise<User> {
  const unsafe = !['GET', 'HEAD'].includes(req.method);
  const key = req.headers.get('X-App-Key');
  if (auth === 'cron') {
    if (!deps.cronSecret || !safeEqual(bearer(req.headers.get('Authorization')), deps.cronSecret)) throw new ApiError(401, 'unauthorized');
  } else if (auth === 'web') {
    if (!sameOrigin(req)) throw new ApiError(403, 'forbidden');
  } else if (auth === 'app' || (auth === 'user' && key !== null)) {
    if (!safeEqual(key ?? '', deps.token)) throw new ApiError(401, 'unknown app');
  } else if (auth === 'user' && unsafe && !sameOrigin(req)) {
    throw new ApiError(403, 'forbidden');
  }
  if (auth !== 'user') return undefined as never;
  const id = key !== null ? readTicket(bearer(req.headers.get('Authorization')), deps.secret) : null;
  const user = key !== null ? id && (await deps.db.user(id)) : await deps.db.byTgt(readSession(req));
  if (!user) throw new ApiError(401, key !== null ? 'ticket expired' : 'signed out');
  return user;
}

/** Wraps a route handler: authentication, validation and errors in one place. */
export const route =
  <B extends ZodType = typeof none, Q extends ZodType = typeof none>(
    opts: { auth: Auth; body?: B; query?: Q },
    fn: (c: Ctx<z.output<B>, z.output<Q>>) => Promise<Response | object>,
  ) =>
  async (req: Request, ctx?: { params: Promise<Record<string, string>> }): Promise<Response> => {
    try {
      const deps = services();
      const user = await authenticate(opts.auth, req, deps);
      const parse = <T extends ZodType>(schema: T | undefined, input: unknown) => {
        const r = (schema ?? none).safeParse(input);
        if (!r.success) throw new ApiError(400, `invalid: ${[...new Set(r.error.issues.map((i) => i.path.join('.') || 'body'))].join(', ')}`);
        return r.data as z.output<T>;
      };
      const body = parse(opts.body, opts.body ? await req.json().catch(() => null) : undefined);
      const query = parse(opts.query, opts.query ? Object.fromEntries(new URL(req.url).searchParams) : undefined);
      const out = await fn({ req, deps, user, body, query, params: (await ctx?.params) ?? {} });
      return out instanceof Response ? out : reply(out);
    } catch (e) {
      if (e instanceof ApiError) return reply({ error: e.message }, e.status);
      console.error(`${req.method} ${new URL(req.url).pathname} failed:`, e);
      return reply({ error: 'server error' }, 500);
    }
  };
