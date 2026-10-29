import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { findNew } from '../src/checker';
import { encrypt, decrypt } from '../src/vault';
import * as cookies from '../src/cookies';
import { tokensFrom, puuidFrom, SessionExpired } from '../src/riot';
import { shardFromAffinity } from '../src/profile';
import { compact, createCatalog } from '../src/catalog';
import { memoryKv } from '../src/kv';
import { compactSkin, skinDetail } from '../src/skin';

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
  const skin = (n: string, l: string) => ({
    uuid: `skin-${l}`,
    displayName: n,
    displayIcon: 'https://x/cross.png',
    contentTierUuid: 't1',
    themeUuid: 'th1',
    levels: [{ uuid: l, displayIcon: `https://x/${l}.png` }],
  });
  const c = compact(
    [{ uuid: 't1', devName: 'Select', highlightColor: '5a9fe233', rank: 0 }],
    [{ displayName: 'Vandal', skins: [skin('Reaver Vandal', 'a'), skin('Standard Vandal', 'b')] }],
    [{ uuid: 'th1', displayName: 'Reaver' }],
  );
  assert.deepEqual(c.tiers, [{ id: 't1', name: 'Select', color: '#5a9fe2', r: 0 }]);
  assert.equal(c.skins[0]!.w, 'Vandal');
  assert.equal(c.skins[0]!.s, 'Reaver');
  assert.deepEqual(c.skins.map((s) => s.n), ['Reaver Vandal']);
  assert.equal(c.skins[0]!.i, 'https://x/a.png', 'the art comes from the first level, not the skin placeholder');

  const kv = memoryKv();
  let calls = 0;
  const cat = createCatalog(kv, async () => (calls++, c));
  assert.equal((await cat.lookup('a')).name, 'Reaver Vandal');
  assert.equal(calls, 1);
  assert.ok(await kv.get('catalog'), 'a fetched catalog is persisted');
  await cat.refreshIfStale();
  assert.equal(calls, 1, 'a fresh catalog is not refetched by the scheduled check');
  assert.equal((await createCatalog(kv, async () => (calls++, c)).get()).skins.length, 1, 'another instance reads the stored catalog');
  assert.equal(calls, 1);
  const stale = memoryKv();
  await createCatalog(stale, async () => ({ ...c, v: 1 })).refresh();
  let old = 0;
  await createCatalog(stale, async () => (old++, c)).refreshIfStale();
  assert.equal(old, 1, 'a catalog saved by an older version is refetched at once');
  assert.deepEqual(await cat.lookup('zzz'), { name: 'zzz', icon: null, tier: null });
  assert.equal(calls, 1, 'a fresh catalog is not refetched on every miss');
});

test('skin details keep variants and levels, drop foreign hosts, and are cached', async () => {
  const media = 'https://media.valorant-api.com/';
  const raw = {
    chromas: [
      { displayName: 'Reaver Vandal', fullRender: `${media}a.png`, swatch: null },
      { displayName: 'Reaver Vandal Level 4\r\n(Variant 2 Black)', fullRender: 'https://evil.example/x.png', swatch: `${media}s.png` },
    ],
    levels: [
      { levelItem: null, streamedVideo: null },
      { levelItem: 'EEquippableSkinLevelItem::SoundEffects', streamedVideo: `${media}v.mp4` },
    ],
  };
  const d = compactSkin(raw);
  assert.deepEqual(d.variants.map((v) => v.name), ['Base', 'Black']);
  assert.equal(d.variants[1]!.render, null, 'art from another host is dropped');
  assert.equal(d.variants[1]!.swatch, `${media}s.png`);
  assert.deepEqual(d.levels.map((l) => l.name), ['Base', 'Sound Effects']);
  const kv = memoryKv();
  let calls = 0;
  await skinDetail(kv, 'u1', async () => (calls++, raw));
  await skinDetail(kv, 'u1', async () => (calls++, raw));
  assert.equal(calls, 1, 'the second call comes from Redis');
});

test('source files stay small and ASCII', () => {
  const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  for (const file of walk(path.join(import.meta.dirname, '../src')).filter((f) => /\.(ts|tsx|css)$/.test(f))) {
    const text = fs.readFileSync(file, 'utf8');
    const name = path.relative(path.join(import.meta.dirname, '..'), file);
    if (!file.endsWith('.css')) assert.ok(text.split(String.fromCharCode(10)).length <= 150, `${name} is over 150 lines`);
    assert.ok(/^[\x00-\x7f]*$/.test(text), `${name} has non-ASCII characters`);
  }
});
