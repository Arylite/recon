import fs from 'node:fs';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { openDb } from './db.js';
import { createCatalog, type CatalogData } from './catalog.js';
import { checkAll } from './checker.js';
import { createApp } from './app.js';
import { verifyLogin } from './profile.js';
import type { State } from './types.js';

const { API_TOKEN, SECRET, PORT = '8080', DATA_DIR = './data', CHECK_MINUTES = '15' } = process.env;
if (!API_TOKEN || !SECRET) {
  console.error('API_TOKEN and SECRET are required (see .env.example)');
  process.exit(1);
}

fs.mkdirSync(DATA_DIR, { recursive: true });
const read = <T>(name: string): T | undefined => {
  const file = path.join(DATA_DIR, name);
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as T) : undefined;
};
// Written to a temp file then renamed, so a crash mid-write never leaves half a state.
const write = (name: string) => (data: unknown) => {
  const file = path.join(DATA_DIR, name);
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(data));
  fs.renameSync(`${file}.tmp`, file);
};

const db = openDb(read<State>('state.json'), write('state.json'));
const catalog = createCatalog(read<CatalogData>('catalog.json'), write('catalog.json'));
const check = async () => {
  await catalog.refreshIfStale().catch((e: Error) => console.error('catalog refresh failed:', e.message));
  console.log(`checking ${db.state.users.reduce((n, u) => n + u.accounts.length, 0)} Riot accounts, catalog has ${catalog.data.skins.length} skins`);
  await checkAll(db, SECRET, catalog).catch((e: unknown) => console.error('check failed:', e));
};

// The app only shows a friendly sentence; the real Riot answer goes to the logs.
const verify = (cookies: string) =>
  verifyLogin(cookies).catch((e: unknown) => {
    console.error('riot sign-in failed:', e instanceof Error ? e.message : e);
    throw e;
  });
const api = createApp({ db, token: API_TOKEN, secret: SECRET, catalog, verify, onChange: () => void check() });
// Method, path, status and time of every request; no headers or bodies, so no secret.
const app = new Hono().use(logger()).route('/', api);
serve({ fetch: app.fetch, port: Number(PORT) }, (info) => console.log(`listening on ${info.port}, ${db.state.users.length} users, data in ${DATA_DIR}`));

void check();
setInterval(() => void check(), Number(CHECK_MINUTES) * 60_000);
