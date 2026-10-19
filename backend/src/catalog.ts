import fs from 'node:fs';
import path from 'node:path';
import { request } from './http.js';
import type { Offer } from './types.js';

const BASE = 'https://valorant-api.com/v1';
const DAY = 24 * 3600 * 1000;
const MISS_RETRY = 10 * 60 * 1000;

export interface CatalogData {
  updated: number;
  tiers: { id: string; name: string; color: string }[];
  /** l: first level uuid (the id the store sends), n: name, i: icon url, t: tier uuid. */
  skins: { l: string; n: string; i: string; t: string | null }[];
}

interface ApiTier {
  uuid: string;
  devName: string;
  highlightColor: string;
}

interface ApiSkin {
  displayName: string;
  displayIcon: string | null;
  contentTierUuid: string | null;
  levels: { uuid: string }[];
}

export interface Catalog {
  readonly data: CatalogData;
  refresh: () => Promise<void>;
  lookup: (uuid: string) => Promise<Omit<Offer, 'cost'>>;
  start: () => void;
}

async function get<T>(p: string): Promise<T> {
  const r = await request(`${BASE}${p}`);
  if (r.status !== 200) throw new Error(`${p} answered ${r.status}`);
  return (JSON.parse(r.text) as { data: T }).data;
}

/** Keeps only what the app and the checker use. */
export function compact(tiers: ApiTier[], skins: ApiSkin[]): CatalogData {
  return {
    updated: Date.now(),
    tiers: tiers.map((t) => ({ id: t.uuid, name: t.devName, color: `#${t.highlightColor.slice(0, 6)}` })),
    skins: skins.flatMap((s) =>
      s.displayIcon && s.levels[0] && !/^(Standard |Random Favorite)/.test(s.displayName)
        ? [{ l: s.levels[0].uuid, n: s.displayName, i: s.displayIcon, t: s.contentTierUuid }]
        : [],
    ),
  };
}

export async function fetchCatalog(): Promise<CatalogData> {
  const [tiers, skins] = await Promise.all([get<ApiTier[]>('/contenttiers'), get<ApiSkin[]>('/weapons/skins')]);
  return compact(tiers, skins);
}

/** Written at image build time by scripts/build-catalog.ts, relative to the working directory. */
export const seedPath = () => path.resolve(process.env.CATALOG_SEED ?? 'catalog.seed.json');

const read = (file: string): CatalogData | null =>
  fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as CatalogData) : null;

export function createCatalog(dir: string, fetcher: () => Promise<CatalogData> = fetchCatalog): Catalog {
  const file = path.join(dir, 'catalog.json');
  let data: CatalogData = read(file) ?? read(seedPath()) ?? { updated: 0, tiers: [], skins: [] };
  const build = (d: CatalogData) => new Map(d.skins.map((s) => [s.l, s]));
  let index = build(data);
  let pending: Promise<void> | undefined;

  const refresh = () =>
    (pending ??= fetcher()
      .then((fresh) => {
        data = fresh;
        index = build(fresh);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, JSON.stringify(fresh));
      })
      .finally(() => {
        pending = undefined;
      }));

  return {
    get data() {
      return data;
    },
    refresh,
    // A skin missing from the catalog means a new release: refresh once, then fall back to the id.
    async lookup(uuid) {
      if (!index.has(uuid) && Date.now() - data.updated > MISS_RETRY) await refresh().catch(() => {});
      const s = index.get(uuid);
      return s ? { name: s.n, icon: s.i, tier: s.t } : { name: uuid, icon: null, tier: null };
    },
    start() {
      const run = () => refresh().catch((e: Error) => console.error('catalog refresh failed:', e.message));
      if (Date.now() - data.updated > DAY) run();
      setInterval(run, DAY);
    },
  };
}
