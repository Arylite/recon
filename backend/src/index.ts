import fs from 'node:fs';
import path from 'node:path';
import { serve } from '@hono/node-server';
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
  await checkAll(db, SECRET, catalog).catch((e: unknown) => console.error('check failed:', e));
};

const app = createApp({ db, token: API_TOKEN, secret: SECRET, catalog, verify: verifyLogin, onChange: () => void check() });
serve({ fetch: app.fetch, port: Number(PORT) }, (info) => console.log(`listening on ${info.port}`));

void check();
setInterval(() => void check(), Number(CHECK_MINUTES) * 60_000);
