import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { createCatalog } from '../src/catalog.js';
import { decrypt } from '../src/vault.js';
import { issueTicket, readTicket } from '../src/auth.js';

// Stand-ins for the hashes the app sends.
const PW = 'a'.repeat(64);
const OTHER = 'b'.repeat(64);

function setup() {
  const db = openDb(undefined, () => {});
  let changes = 0;
  const catalog = createCatalog(undefined, () => {}, async () => ({ updated: Date.now(), tiers: [], skins: [] }));
  // Stands in for the Riot login: cookies containing 'bad' are refused.
  const verify = async (cookies: string) => {
    if (cookies.includes('bad')) throw new Error('Riot session expired');
    return { cookies: `${cookies}; rotated=1`, puuid: 'puuid-1', shard: 'eu' as const, name: 'Isaac#EUW' };
  };
  const app = createApp({ db, token: 'key', secret: 'sec', catalog, verify, onChange: () => changes++ });
  const raw = (method: string, url: string, body?: unknown, auth = '', key = 'key') =>
    app.request(url, {
      method,
      headers: { 'X-App-Key': key, Authorization: auth, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  /** Registers a user and returns a caller that uses its service ticket. */
  const signUp = async (name = 'isaac') => {
    const { tgt } = (await (await raw('POST', '/auth/register', { name, password: PW })).json()) as { tgt: string };
    const { ticket } = (await (await raw('POST', '/auth/ticket', undefined, `Bearer ${tgt}`)).json()) as { ticket: string };
    const call = (method: string, url: string, body?: unknown) => raw(method, url, body, `Bearer ${ticket}`);
    return { tgt, ticket, call, user: () => db.state.users.find((u) => u.name === name)! };
  };
  return { db, raw, signUp, changes: () => changes, app };
}

test('health is open, everything else needs the app key then a ticket', async () => {
  const { app, raw, signUp } = setup();
  assert.equal((await app.request('/health')).status, 200);
  assert.equal((await raw('POST', '/auth/login', { name: 'isaac', password: PW }, '', 'nope')).status, 401);
  assert.equal((await raw('GET', '/wishlist')).status, 401);
  const { tgt, call } = await signUp();
  assert.equal((await raw('GET', '/wishlist', undefined, `Bearer ${tgt}`)).status, 401, 'a TGT is not a service ticket');
  assert.equal((await call('GET', '/wishlist')).status, 200);
});

test('register, duplicate name, login, logout revokes the TGT', async () => {
  const { raw, signUp, db } = setup();
  await signUp();
  assert.equal((await raw('POST', '/auth/register', { name: 'Isaac', password: OTHER })).status, 409);
  assert.equal((await raw('POST', '/auth/register', { name: 'a', password: PW })).status, 400);
  assert.equal((await raw('POST', '/auth/register', { name: 'plain', password: 'hunter2hunter2' })).status, 400, 'a plain password is refused');
  assert.equal((await raw('POST', '/auth/login', { name: 'isaac', password: OTHER })).status, 401);
  const login = await raw('POST', '/auth/login', { name: 'isaac', password: PW });
  const { tgt } = (await login.json()) as { tgt: string };
  assert.ok(!JSON.stringify(db.state).includes(tgt), 'the TGT is only stored hashed');
  assert.ok(!JSON.stringify(db.state).includes(PW), 'the client hash is hashed again before it is stored');
  assert.equal((await raw('POST', '/auth/ticket', undefined, `Bearer ${tgt}`)).status, 200);
  await raw('POST', '/auth/logout', undefined, `Bearer ${tgt}`);
  assert.equal((await raw('POST', '/auth/ticket', undefined, `Bearer ${tgt}`)).status, 401);
});

test('tickets expire and cannot be forged', () => {
  const { ticket } = issueTicket('u1', 'sec', 0);
  assert.equal(readTicket(ticket, 'sec', 1000), 'u1');
  assert.equal(readTicket(ticket, 'sec', 3600 * 1000 + 1), null);
  assert.equal(readTicket(ticket, 'other', 1000), null);
  assert.equal(readTicket(ticket.replace('u1', 'u2'), 'sec', 1000), null);
  assert.equal(readTicket('garbage', 'sec'), null);
});

test('users only see their own wishlist and accounts', async () => {
  const { signUp } = setup();
  const a = await signUp('alice');
  const b = await signUp('bob');
  await a.call('POST', '/wishlist', { name: 'Reaver' });
  await a.call('POST', '/accounts', { cookies: 'ssid=abc' });
  assert.deepEqual(await (await b.call('GET', '/wishlist')).json(), []);
  assert.deepEqual(await (await b.call('GET', '/accounts')).json(), []);
  await b.call('DELETE', `/accounts/${a.user().accounts[0]!.id}`);
  assert.equal(a.user().accounts.length, 1, 'bob cannot delete an account of alice');
});

test('wishlist add, dedupe, list and delete with spaces in the name', async () => {
  const { signUp, changes } = setup();
  const { call } = await signUp();
  await call('POST', '/wishlist', { name: ' Reaver Vandal ' });
  await call('POST', '/wishlist', { name: 'Reaver Vandal' });
  assert.deepEqual(await (await call('GET', '/wishlist')).json(), ['Reaver Vandal']);
  assert.equal(changes(), 2);
  await call('DELETE', '/wishlist/Reaver%20Vandal');
  assert.deepEqual(await (await call('GET', '/wishlist')).json(), []);
});

test('invalid bodies answer 400 with an error string the app can show', async () => {
  const { call } = await setup().signUp();
  const r = await call('POST', '/accounts', { cookies: 'nope' });
  assert.equal(r.status, 400);
  assert.match(((await r.json()) as { error: string }).error, /cookies/);
});

test('accounts take region and name from Riot, keep cookies encrypted and never return them', async () => {
  const { call, user } = await setup().signUp();
  const r = await call('POST', '/accounts', { cookies: 'ssid=abc; tdid=t' });
  assert.equal(r.status, 200);
  const list = (await (await call('GET', '/accounts')).json()) as Record<string, unknown>[];
  assert.equal(list.length, 1);
  assert.equal(list[0]!.name, 'Isaac#EUW');
  assert.equal(list[0]!.shard, 'eu');
  assert.equal('cookies' in list[0]!, false);
  const stored = user().accounts[0]!.cookies;
  assert.ok(!stored.includes('ssid'));
  assert.equal(decrypt(stored, 'sec'), 'ssid=abc; tdid=t; rotated=1');
  await call('DELETE', `/accounts/${user().accounts[0]!.id}`);
  assert.equal(user().accounts.length, 0);
});

test('a bad session is refused when added, and adding the same account twice keeps one', async () => {
  const { call, user } = await setup().signUp();
  const bad = await call('POST', '/accounts', { cookies: 'ssid=bad' });
  assert.equal(bad.status, 400);
  assert.match(((await bad.json()) as { error: string }).error, /expired/);
  assert.equal(user().accounts.length, 0);
  await call('POST', '/accounts', { cookies: 'ssid=one' });
  await call('POST', '/accounts', { cookies: 'ssid=two' });
  assert.equal(user().accounts.length, 1);
});

test('a test alert is queued for the caller only', async () => {
  const { signUp } = setup();
  const a = await signUp('alice');
  const b = await signUp('bob');
  const { id } = (await (await a.call('POST', '/alerts/test')).json()) as { id: number };
  assert.equal(((await (await a.call('GET', `/alerts?since=${id - 1}`)).json()) as unknown[]).length, 1);
  assert.deepEqual(await (await b.call('GET', '/alerts')).json(), []);
});

test('alerts are returned after the given id', async () => {
  const { call, user } = await setup().signUp();
  user().alerts.push({ id: 1, ts: 0, account: 'Main', skin: 'A' }, { id: 2, ts: 0, account: 'Main', skin: 'B' });
  assert.equal(((await (await call('GET', '/alerts?since=1')).json()) as unknown[]).length, 1);
  assert.equal((await call('GET', '/alerts?since=abc')).status, 400);
});
