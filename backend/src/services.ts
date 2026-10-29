import { after } from 'next/server';
import { createCatalog, type Catalog } from './catalog';
import { checkAll, checkUser } from './checker';
import { openDb, type Db } from './db';
import { kvFromEnv, memoryKv, type Kv } from './kv';
import { verifyLogin, type Verified } from './profile';

export interface Deps {
  db: Db;
  kv: Kv;
  /** App key baked into the APK; it only keeps scanners out, the user tickets guard the data. */
  token: string;
  /** Encrypts the Riot cookies and signs the service tickets. */
  secret: string;
  /** Bearer secret of the scheduled check; the endpoint stays closed without it. */
  cronSecret?: string;
  catalog: Catalog;
  /** Logs in with the cookies and finds the region; throws when the session is not valid. */
  verify: (cookies: string) => Promise<Verified>;
  /** Called after a change that deserves an immediate check of this user's stores. */
  onChange: (userId: string) => void;
  checkAll: () => Promise<void>;
  /** False once the people who should have an account have one. */
  registration: boolean;
}

let current: Deps | undefined;
/** The shared dependencies, built from the environment on the first request. */
export const services = () => (current ??= build());
/** Replaces them; for tests. */
export const useServices = (deps: Deps) => void (current = deps);

// Runs after the response is sent and keeps the function alive until it finishes.
const later = (task: () => Promise<void>) => {
  const run = () => task().catch((e: unknown) => console.error('background check failed:', e));
  try {
    after(run);
  } catch {
    void run(); // outside a request, as in `next build` or a script
  }
};

function build(env = process.env): Deps {
  const { API_TOKEN, SECRET, CRON_SECRET } = env;
  const prod = env.NODE_ENV === 'production';
  if (!API_TOKEN || !SECRET) throw new Error('API_TOKEN and SECRET are required (see .env.example)');
  if (prod && (API_TOKEN.length < 32 || SECRET.length < 32)) throw new Error('API_TOKEN and SECRET must be at least 32 characters (openssl rand -hex 32)');
  if (CRON_SECRET && CRON_SECRET.length < 32) throw new Error('CRON_SECRET must be at least 32 characters');
  const g = globalThis as { reconDevKv?: Kv };
  const found = kvFromEnv(env);
  if (!found && prod) throw new Error('Redis is not configured: add the Upstash Redis integration (KV_REST_API_URL, KV_REST_API_TOKEN)');
  // Without Redis, local development keeps everything in memory until the server restarts.
  const kv = found ?? (g.reconDevKv ??= memoryKv());
  const db = openDb(kv);
  const catalog = createCatalog(kv);
  const run = async () => {
    await catalog.refreshIfStale().catch((e: Error) => console.error('catalog refresh failed:', e.message));
    await checkAll(db, SECRET, catalog);
  };
  return {
    db,
    kv,
    token: API_TOKEN,
    secret: SECRET,
    cronSecret: CRON_SECRET,
    catalog,
    // The app only shows a friendly sentence; the real Riot answer goes to the logs.
    verify: (cookies) =>
      verifyLogin(cookies).catch((e: unknown) => {
        console.error('riot sign-in failed:', e instanceof Error ? e.message : e);
        throw e;
      }),
    onChange: (id) => later(() => checkUser(db, SECRET, catalog, id)),
    checkAll: run,
    registration: env.ALLOW_REGISTRATION !== 'false',
  };
}
