import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { createCatalog } from '../src/catalog.js';
import { decrypt } from '../src/vault.js';

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-'));
  const db = openDb(dir);
  let changes = 0;
  process.env.CATALOG_SEED = path.join(dir, 'no-seed.json');
  const catalog = createCatalog(dir, async () => ({ updated: Date.now(), tiers: [], skins: [] }));
  // Stands in for the Riot login: cookies containing 'bad' are refused.
  const verify = async (cookies: string) => {
    if (cookies.includes('bad')) throw new Error('Riot session expired');
    return { cookies: `${cookies}; rotated=1`, puuid: 'puuid-1', shard: 'eu' as const, name: 'Isaac#EUW' };
  };
  const app = createApp({ db, token: 'tok', secret: 'sec', catalog, verify, onChange: () => changes++ });
  const call = (method: string, url: string, body?: unknown, auth = 'Bearer tok') =>
    app.request(url, {
      method,
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  return { db, call, changes: () => changes, app };
}

test('health is open, everything else needs the token', async () => {
  const { app, call } = setup();
  assert.equal((await app.request('/health')).status, 200);
  assert.equal((await call('GET', '/wishlist', undefined, 'Bearer nope')).status, 401);
  assert.equal((await app.request('/wishlist')).status, 401);
});

test('wishlist add, dedupe, list and delete with spaces in the name', async () => {
  const { call, changes } = setup();
  await call('POST', '/wishlist', { name: ' Reaver Vandal ' });
  await call('POST', '/wishlist', { name: 'Reaver Vandal' });
  assert.deepEqual(await (await call('GET', '/wishlist')).json(), ['Reaver Vandal']);
  assert.equal(changes(), 2);
  await call('DELETE', '/wishlist/Reaver%20Vandal');
  assert.deepEqual(await (await call('GET', '/wishlist')).json(), []);
});

test('invalid bodies answer 400 with an error string the app can show', async () => {
  const { call } = setup();
  const r = await call('POST', '/accounts', { cookies: 'nope' });
  assert.equal(r.status, 400);
  assert.match(((await r.json()) as { error: string }).error, /cookies/);
});

test('accounts take region and name from Riot, keep cookies encrypted and never return them', async () => {
  const { call, db } = setup();
  const r = await call('POST', '/accounts', { cookies: 'ssid=abc; tdid=t' });
  assert.equal(r.status, 200);
  const list = (await (await call('GET', '/accounts')).json()) as Record<string, unknown>[];
  assert.equal(list.length, 1);
  assert.equal(list[0]!.name, 'Isaac#EUW');
  assert.equal(list[0]!.shard, 'eu');
  assert.equal('cookies' in list[0]!, false);
  const stored = db.state.accounts[0]!.cookies;
  assert.ok(!stored.includes('ssid'));
  assert.equal(decrypt(stored, 'sec'), 'ssid=abc; tdid=t; rotated=1');
  await call('DELETE', `/accounts/${db.state.accounts[0]!.id}`);
  assert.equal(db.state.accounts.length, 0);
});

test('a bad session is refused when added, and adding the same account twice keeps one', async () => {
  const { call, db } = setup();
  const bad = await call('POST', '/accounts', { cookies: 'ssid=bad' });
  assert.equal(bad.status, 400);
  assert.match(((await bad.json()) as { error: string }).error, /expired/);
  assert.equal(db.state.accounts.length, 0);
  await call('POST', '/accounts', { cookies: 'ssid=one' });
  await call('POST', '/accounts', { cookies: 'ssid=two' });
  assert.equal(db.state.accounts.length, 1);
});

test('alerts are returned after the given id', async () => {
  const { call, db } = setup();
  db.state.alerts.push({ id: 1, ts: 0, account: 'Main', skin: 'A' }, { id: 2, ts: 0, account: 'Main', skin: 'B' });
  assert.equal(((await (await call('GET', '/alerts?since=1')).json()) as unknown[]).length, 1);
  assert.equal((await call('GET', '/alerts?since=abc')).status, 400);
});
