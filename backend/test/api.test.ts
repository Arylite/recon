import test from 'node:test';
import assert from 'node:assert/strict';
import { GET as accountsGet, POST as accountsPost } from '../src/app/accounts/route';
import { DELETE as accountDelete } from '../src/app/accounts/[id]/route';
import { GET as alertsGet } from '../src/app/alerts/route';
import { POST as alertTest } from '../src/app/alerts/test/route';
import { POST as authLogin } from '../src/app/auth/login/route';
import { POST as authLogout } from '../src/app/auth/logout/route';
import { POST as authRegister } from '../src/app/auth/register/route';
import { POST as authTicket } from '../src/app/auth/ticket/route';
import { GET as catalogGet } from '../src/app/catalog/route';
import { GET as cronCheck } from '../src/app/cron/check/route';
import { GET as health } from '../src/app/health/route';
import { GET as me } from '../src/app/me/route';
import { POST as webLogin } from '../src/app/web/login/route';
import { POST as webLogout } from '../src/app/web/logout/route';
import { POST as webRegister } from '../src/app/web/register/route';
import { GET as wishGet, POST as wishPost } from '../src/app/wishlist/route';
import { DELETE as wishDelete } from '../src/app/wishlist/[name]/route';
import { issueTicket, readTicket } from '../src/auth';
import { createCatalog } from '../src/catalog';
import { openDb } from '../src/db';
import { memoryKv } from '../src/kv';
import { useServices, type Deps } from '../src/services';
import { decrypt } from '../src/vault';

// Stand-ins for the hashes the clients send.
const PW = 'a'.repeat(64);
const OTHER = 'b'.repeat(64);
const CRON = 'c'.repeat(40);

type Handler = (req: Request, ctx?: { params: Promise<Record<string, string>> }) => Promise<Response>;
interface Opts {
  body?: unknown;
  auth?: string;
  key?: string | null;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

function setup(over: Partial<Deps> = {}) {
  const kv = memoryKv();
  const db = openDb(kv);
  const changed: string[] = [];
  let checks = 0;
  const catalog = createCatalog(kv, async () => ({ updated: Date.now(), tiers: [], skins: [] }));
  // Stands in for the Riot login: cookies containing 'bad' are refused.
  const verify = async (cookies: string) => {
    if (cookies.includes('bad')) throw new Error('Riot session expired');
    return { cookies: `${cookies}; rotated=1`, puuid: 'puuid-1', shard: 'eu' as const, name: 'Isaac#EUW' };
  };
  const deps: Deps = { db, kv, token: 'key', secret: 'sec', cronSecret: CRON, catalog, verify, onChange: (id) => changed.push(id), checkAll: async () => void checks++, registration: true, ...over };
  useServices(deps);

  const call = (h: Handler, method: string, url: string, { body, auth = '', key = 'key', headers = {}, params = {} }: Opts = {}) =>
    h(
      new Request(`https://recon.test${url}`, {
        method,
        headers: { ...(key === null ? {} : { 'X-App-Key': key }), ...(auth ? { Authorization: auth } : {}), 'Content-Type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      { params: Promise.resolve(params) },
    );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = async (r: Response): Promise<any> => r.json();
  /** Registers a user and returns a caller that uses its service ticket. */
  const signUp = async (name = 'isaac') => {
    const { tgt } = (await json(await call(authRegister, 'POST', '/auth/register', { body: { name, password: PW } }))) as { tgt: string };
    const { ticket } = (await json(await call(authTicket, 'POST', '/auth/ticket', { auth: `Bearer ${tgt}` }))) as { ticket: string };
    const as = (h: Handler, method: string, url: string, body?: unknown, params?: Record<string, string>) => call(h, method, url, { body, auth: `Bearer ${ticket}`, params });
    return { tgt, ticket, as, user: async () => (await db.byName(name))! };
  };
  /** A browser: the same-origin headers our own page sends. */
  const page = (cookie = '', extra: Record<string, string> = {}) => ({ key: null, headers: { Origin: 'https://recon.test', Host: 'recon.test', 'X-Requested-With': 'recon', ...(cookie ? { Cookie: cookie } : {}), ...extra } });
  return { deps, db, kv, call, json, signUp, page, changed, checks: () => checks };
}

test('health is open, everything else needs the app key then a ticket', async () => {
  const { call, signUp } = setup();
  assert.equal((await call(health, 'GET', '/health', { key: null })).status, 200);
  assert.equal((await call(authLogin, 'POST', '/auth/login', { body: { name: 'isaac', password: PW }, key: 'nope' })).status, 401);
  assert.equal((await call(wishGet, 'GET', '/wishlist', { key: null })).status, 401);
  assert.equal((await call(wishGet, 'GET', '/wishlist')).status, 401);
  const { tgt, as } = await signUp();
  assert.equal((await call(wishGet, 'GET', '/wishlist', { auth: `Bearer ${tgt}` })).status, 401, 'a TGT is not a service ticket');
  assert.equal((await as(wishGet, 'GET', '/wishlist')).status, 200);
});

test('register, duplicate name, login, logout revokes the TGT', async () => {
  const { call, json, signUp, kv } = setup();
  await signUp();
  const reg = (body: unknown) => call(authRegister, 'POST', '/auth/register', { body });
  assert.equal((await reg({ name: 'Isaac', password: OTHER })).status, 409);
  assert.equal((await reg({ name: 'a', password: PW })).status, 400);
  assert.equal((await reg({ name: 'plain', password: 'hunter2hunter2' })).status, 400, 'a plain password is refused');
  assert.equal((await call(authLogin, 'POST', '/auth/login', { body: { name: 'isaac', password: OTHER } })).status, 401);
  const { tgt } = (await json(await call(authLogin, 'POST', '/auth/login', { body: { name: 'isaac', password: PW } }))) as { tgt: string };
  const stored = JSON.stringify([...(await kv.members('users'))]) + JSON.stringify(await kv.get('user:' + (await kv.get('name:isaac'))));
  assert.ok(!stored.includes(tgt), 'the TGT is only stored hashed');
  assert.ok(!stored.includes(PW), 'the client hash is hashed again before it is stored');
  assert.equal((await call(authTicket, 'POST', '/auth/ticket', { auth: `Bearer ${tgt}` })).status, 200);
  await call(authLogout, 'POST', '/auth/logout', { auth: `Bearer ${tgt}` });
  assert.equal((await call(authTicket, 'POST', '/auth/ticket', { auth: `Bearer ${tgt}` })).status, 401);
});

test('tickets expire and cannot be forged', () => {
  const { ticket } = issueTicket('u1', 'sec', 0);
  assert.equal(readTicket(ticket, 'sec', 1000), 'u1');
  assert.equal(readTicket(ticket, 'sec', 3600 * 1000 + 1), null);
  assert.equal(readTicket(ticket, 'other', 1000), null);
  assert.equal(readTicket(ticket.replace('u1', 'u2'), 'sec', 1000), null);
  assert.equal(readTicket('garbage', 'sec'), null);
});

test('only the ten newest ticket-granting tickets stay valid', async () => {
  const { call, json, signUp } = setup();
  const first = (await signUp()).tgt;
  const later: string[] = [];
  for (let i = 0; i < 10; i++) later.push(((await json(await call(authLogin, 'POST', '/auth/login', { body: { name: 'isaac', password: PW } }))) as { tgt: string }).tgt);
  assert.equal((await call(authTicket, 'POST', '/auth/ticket', { auth: `Bearer ${first}` })).status, 401, 'the oldest one was dropped');
  assert.equal((await call(authTicket, 'POST', '/auth/ticket', { auth: `Bearer ${later[9]}` })).status, 200);
});

test('users only see their own wishlist and accounts', async () => {
  const { json, signUp } = setup();
  const a = await signUp('alice');
  const b = await signUp('bob');
  await a.as(wishPost, 'POST', '/wishlist', { name: 'Reaver' });
  await a.as(accountsPost, 'POST', '/accounts', { cookies: 'ssid=abc' });
  assert.deepEqual(await json(await b.as(wishGet, 'GET', '/wishlist')), []);
  assert.deepEqual(await json(await b.as(accountsGet, 'GET', '/accounts')), []);
  await b.as(accountDelete, 'DELETE', '/accounts/x', undefined, { id: (await a.user()).accounts[0]!.id });
  assert.equal((await a.user()).accounts.length, 1, 'bob cannot delete an account of alice');
});

test('wishlist add, dedupe, list and delete with spaces in the name', async () => {
  const { json, signUp, changed } = setup();
  const { as } = await signUp();
  await as(wishPost, 'POST', '/wishlist', { name: ' Reaver Vandal ' });
  await as(wishPost, 'POST', '/wishlist', { name: 'Reaver Vandal' });
  assert.deepEqual(await json(await as(wishGet, 'GET', '/wishlist')), ['Reaver Vandal']);
  assert.equal(changed.length, 2);
  await as(wishDelete, 'DELETE', '/wishlist/Reaver%20Vandal', undefined, { name: 'Reaver Vandal' });
  assert.deepEqual(await json(await as(wishGet, 'GET', '/wishlist')), []);
});

test('parallel writes never overwrite each other', async () => {
  const { json, signUp } = setup();
  const { as } = await signUp();
  const names = Array.from({ length: 25 }, (_, i) => `skin ${i}`);
  await Promise.all(names.map((name) => as(wishPost, 'POST', '/wishlist', { name })));
  assert.equal(((await json(await as(wishGet, 'GET', '/wishlist'))) as unknown[]).length, 25);
});

test('invalid bodies answer 400 with an error string the app can show', async () => {
  const { json, signUp } = setup();
  const { as } = await signUp();
  const r = await as(accountsPost, 'POST', '/accounts', { cookies: 'nope' });
  assert.equal(r.status, 400);
  assert.match(String((await json(r)).error), /cookies/);
});

test('accounts take region and name from Riot, keep cookies encrypted and never return them', async () => {
  const { json, signUp, changed } = setup();
  const { as, user } = await signUp();
  const r = await as(accountsPost, 'POST', '/accounts', { cookies: 'ssid=abc; tdid=t' });
  assert.equal(r.status, 200);
  assert.equal(changed.length, 1, 'a check is queued');
  const list = (await json(await as(accountsGet, 'GET', '/accounts'))) as Record<string, unknown>[];
  assert.equal(list.length, 1);
  assert.equal(list[0]!.name, 'Isaac#EUW');
  assert.equal(list[0]!.shard, 'eu');
  assert.equal('cookies' in list[0]!, false);
  const stored = (await user()).accounts[0]!.cookies;
  assert.ok(!stored.includes('ssid'));
  assert.equal(decrypt(stored, 'sec'), 'ssid=abc; tdid=t; rotated=1');
  await as(accountDelete, 'DELETE', '/accounts/x', undefined, { id: (await user()).accounts[0]!.id });
  assert.equal((await user()).accounts.length, 0);
});

test('a bad session is refused when added, and adding the same account twice keeps one', async () => {
  const { json, signUp } = setup();
  const { as, user } = await signUp();
  const bad = await as(accountsPost, 'POST', '/accounts', { cookies: 'ssid=bad' });
  assert.equal(bad.status, 400);
  assert.match(String((await json(bad)).error), /expired/);
  assert.equal((await user()).accounts.length, 0);
  await as(accountsPost, 'POST', '/accounts', { cookies: 'ssid=one' });
  await as(accountsPost, 'POST', '/accounts', { cookies: 'ssid=two' });
  assert.equal((await user()).accounts.length, 1);
});

test('a test alert is queued for the caller only, and alerts come after the given id', async () => {
  const { json, signUp } = setup();
  const a = await signUp('alice');
  const b = await signUp('bob');
  const { id } = (await json(await a.as(alertTest, 'POST', '/alerts/test'))) as unknown as { id: number };
  assert.equal(((await json(await a.as(alertsGet, 'GET', `/alerts?since=${id - 1}`))) as unknown[]).length, 1);
  assert.equal(((await json(await a.as(alertsGet, 'GET', `/alerts?since=${id}`))) as unknown[]).length, 0);
  assert.deepEqual(await json(await b.as(alertsGet, 'GET', '/alerts')), []);
  assert.equal((await a.as(alertsGet, 'GET', '/alerts?since=abc')).status, 400);
});

test('the website signs in with an httpOnly SameSite=Strict cookie and no app key', async () => {
  const { call, json, page } = setup();
  const reg = await call(webRegister, 'POST', '/web/register', { body: { name: 'Isaac', password: PW }, ...page() });
  assert.equal(reg.status, 200);
  assert.deepEqual(await json(reg), { name: 'isaac' }, 'the token is never in the body');
  const set = reg.headers.get('set-cookie') ?? '';
  assert.match(set, /HttpOnly/);
  assert.match(set, /SameSite=Strict/);
  assert.match(set, /Path=\//);
  const cookie = set.split(';')[0]!;
  assert.deepEqual(await json(await call(me, 'GET', '/me', page(cookie))), { name: 'isaac' });
  assert.equal((await call(me, 'GET', '/me', page())).status, 401, 'no cookie, no access');
  assert.equal((await call(me, 'GET', '/me', page('recon=forged'))).status, 401);
  // The same account signs in on the website and in the app, with the same hash.
  assert.equal((await call(webLogin, 'POST', '/web/login', { body: { name: 'isaac', password: PW }, ...page() })).status, 200);
  assert.equal((await call(authLogin, 'POST', '/auth/login', { body: { name: 'isaac', password: PW } })).status, 200);
  const out = await call(webLogout, 'POST', '/web/logout', { ...page(cookie) });
  assert.match(out.headers.get('set-cookie') ?? '', /Max-Age=0/);
  assert.equal((await call(me, 'GET', '/me', page(cookie))).status, 401, 'logging out revokes the session on the server');
});

test('cookie sessions refuse cross-site requests', async () => {
  const { call, page } = setup();
  const reg = await call(webRegister, 'POST', '/web/register', { body: { name: 'isaac', password: PW }, ...page() });
  const cookie = (reg.headers.get('set-cookie') ?? '').split(';')[0]!;
  const write = (extra: Record<string, string>) => call(wishPost, 'POST', '/wishlist', { body: { name: 'Reaver' }, ...page(cookie, extra) });
  assert.equal((await write({})).status, 200);
  assert.equal((await write({ Origin: 'https://evil.test' })).status, 403, 'another site');
  assert.equal((await write({ Origin: 'https://recon.test.evil.test' })).status, 403, 'a look-alike host');
  assert.equal((await write({ 'X-Requested-With': '' })).status, 403, 'a plain form post');
  const noOrigin = page(cookie);
  delete (noOrigin.headers as Record<string, string>).Origin;
  assert.equal((await call(wishPost, 'POST', '/wishlist', { body: { name: 'x' }, ...noOrigin })).status, 403);
  const login = await call(webLogin, 'POST', '/web/login', { body: { name: 'isaac', password: PW }, ...page('', { Origin: 'https://evil.test' }) });
  assert.equal(login.status, 403, 'login CSRF');
});

test('guessing passwords is rate limited, and an unknown name answers like a wrong password', async () => {
  const { call, json } = setup();
  const attempt = (name: string, ip = '203.0.113.9') => call(authLogin, 'POST', '/auth/login', { body: { name, password: OTHER }, headers: { 'x-real-ip': ip } });
  const unknown = await json(await attempt('nobody'));
  assert.deepEqual(unknown, { error: 'wrong name or password' });
  for (let i = 0; i < 20; i++) await attempt('isaac', `198.51.100.${i}`);
  assert.equal((await attempt('isaac', '198.51.100.99')).status, 429, 'one name is limited whatever the address');
  for (let i = 0; i < 29; i++) await attempt(`user${i}`);
  assert.equal((await attempt('another')).status, 429, 'one address is limited whatever the name');
});

test('sign-ups can be closed', async () => {
  const { call } = setup({ registration: false });
  assert.equal((await call(authRegister, 'POST', '/auth/register', { body: { name: 'isaac', password: PW } })).status, 403);
  assert.equal((await call(webRegister, 'POST', '/web/register', { body: { name: 'isaac', password: PW }, key: null, headers: { Origin: 'https://recon.test', Host: 'recon.test', 'X-Requested-With': 'recon' } })).status, 403);
});

test('the scheduled check needs the cron secret', async () => {
  const { call, checks } = setup();
  const run = (auth?: string) => call(cronCheck, 'GET', '/cron/check', { key: null, auth });
  assert.equal((await run()).status, 401);
  assert.equal((await run('Bearer nope')).status, 401);
  assert.equal(checks(), 0);
  assert.equal((await run(`Bearer ${CRON}`)).status, 200);
  assert.equal(checks(), 1);
  setup({ cronSecret: undefined });
  assert.equal((await run(`Bearer ${CRON}`)).status, 401, 'without a configured secret the endpoint stays closed');
});

test('an unexpected failure answers a generic error, never the internals', async () => {
  const { call, signUp, deps } = setup();
  const { as } = await signUp();
  deps.catalog.get = async () => {
    throw new Error('connect ECONNREFUSED redis.internal:6379');
  };
  const r = await as(catalogGet, 'GET', '/catalog');
  assert.equal(r.status, 500);
  assert.deepEqual(await r.json(), { error: 'server error' });
  assert.equal(r.headers.get('cache-control'), 'no-store');
  void call;
});
