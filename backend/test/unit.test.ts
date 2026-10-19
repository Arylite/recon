import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findNew } from '../src/checker.js';
import { encrypt, decrypt } from '../src/vault.js';
import * as cookies from '../src/cookies.js';
import { tokensFrom, puuidFrom, SessionExpired } from '../src/riot.js';
import { shardFromAffinity } from '../src/profile.js';
import { compact, createCatalog } from '../src/catalog.js';

test('findNew matches case-insensitively and alerts once per day', () => {
  const names = ['Reaver Vandal', 'Prime Phantom'];
  const a = findNew(names, ['reaver'], [], '2026-10-19');
  assert.deepEqual(a.fresh, ['Reaver Vandal']);
  assert.deepEqual(findNew(names, ['reaver'], a.notified, '2026-10-19').fresh, []);
  assert.deepEqual(findNew(names, ['reaver'], a.notified, '2026-10-20').fresh, ['Reaver Vandal']);
});

test('vault round trip and wrong secret', () => {
  const blob = encrypt('ssid=abc', 'secret-one');
  assert.equal(decrypt(blob, 'secret-one'), 'ssid=abc');
  assert.throws(() => decrypt(blob, 'secret-two'));
});

test('cookies merge rotates and deletes', () => {
  const jar = cookies.parse('ssid=old; tdid=t');
  cookies.merge(jar, ['ssid=new; Path=/; Secure', 'tdid=; Max-Age=0']);
  assert.equal(cookies.serialize(jar), 'ssid=new');
});

test('riot token parsing', () => {
  assert.deepEqual(tokensFrom('https://playvalorant.com/opt_in#access_token=tok&id_token=idt&scope=x'), { accessToken: 'tok', idToken: 'idt' });
  assert.throws(() => tokensFrom('https://authenticate.riotgames.com/login'), SessionExpired);
  const jwt = `h.${Buffer.from('{"sub":"puuid-1"}').toString('base64url')}.s`;
  assert.equal(puuidFrom(jwt), 'puuid-1');
});

test('regions: latam and br live on the na shard, unknown ones are not guessed', () => {
  assert.equal(shardFromAffinity('latam'), 'na');
  assert.equal(shardFromAffinity('eu'), 'eu');
  assert.equal(shardFromAffinity('mars'), null);
  assert.equal(shardFromAffinity(undefined), null);
});

test('catalog compacts, filters defaults and falls back to the id', async () => {
  const skin = (n: string, l: string) => ({ displayName: n, displayIcon: `https://x/${l}.png`, contentTierUuid: 't1', levels: [{ uuid: l }] });
  const c = compact([{ uuid: 't1', devName: 'Select', highlightColor: '5a9fe233' }], [skin('Reaver Vandal', 'a'), skin('Standard Vandal', 'b')]);
  assert.deepEqual(c.tiers, [{ id: 't1', name: 'Select', color: '#5a9fe2' }]);
  assert.deepEqual(c.skins.map((s) => s.n), ['Reaver Vandal']);

  let calls = 0;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cat-'));
  process.env.CATALOG_SEED = path.join(dir, 'no-seed.json'); // a real seed in the working directory would change the scenario
  const cat = createCatalog(dir, async () => (calls++, c));
  assert.equal((await cat.lookup('a')).name, 'Reaver Vandal');
  assert.equal(calls, 1);
  assert.deepEqual(await cat.lookup('zzz'), { name: 'zzz', icon: null, tier: null });
  assert.equal(calls, 1, 'a fresh catalog is not refetched on every miss');
});

test('source files stay small and ASCII', () => {
  const dir = path.join(import.meta.dirname, '../src');
  for (const f of fs.readdirSync(dir)) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.ok(text.split('\n').length <= 150, `${f} is over 150 lines`);
    assert.ok(/^[\x00-\x7f]*$/.test(text), `${f} has non-ASCII characters`);
  }
});
