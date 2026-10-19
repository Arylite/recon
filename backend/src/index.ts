import { serve } from '@hono/node-server';
import { openDb } from './db.js';
import { createCatalog } from './catalog.js';
import { checkAll } from './checker.js';
import { createApp } from './app.js';
import { verifyLogin } from './profile.js';

const { API_TOKEN, SECRET, PORT = '8080', DATA_DIR = './data', CHECK_MINUTES = '15' } = process.env;
if (!API_TOKEN || !SECRET) {
  console.error('API_TOKEN and SECRET are required (see .env.example)');
  process.exit(1);
}

const db = openDb(DATA_DIR);
const catalog = createCatalog(DATA_DIR);
const check = () => checkAll(db, SECRET, catalog).catch((e: unknown) => console.error('check failed:', e));

const app = createApp({ db, token: API_TOKEN, secret: SECRET, catalog, verify: verifyLogin, onChange: check });
serve({ fetch: app.fetch, port: Number(PORT) }, (info) => console.log(`listening on ${info.port}`));

catalog.start();
check();
setInterval(check, Number(CHECK_MINUTES) * 60_000);
