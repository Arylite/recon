import zlib from 'node:zlib';
import { plain } from './http';
import type { Kv } from './kv';
import type { Offer } from './types';

const BASE = 'https://valorant-api.com/v1';
// Bump when compact() changes, so servers refetch instead of waiting a day.
const VERSION = 4;
const DAY = 24 * 3600 * 1000;
const MISS_RETRY = 10 * 60 * 1000;
const LOCAL_MS = 5 * 60 * 1000;

export interface CatalogData {
  /** Shape of the data; a saved catalog of an older version is fetched again. */
  v?: number;
  updated: number;
  /** r: rank, 0 for Select up to 4 for Ultra. */
  tiers: { id: string; name: string; color: string; r: number }[];
  /** l: first level uuid (the id the store sends), n: name, i: icon url, t: tier uuid, w: weapon, s: skin line, u: skin uuid (for its variants). */
  skins: { u: string; l: string; n: string; i: string; t: string | null; w: string; s: string | null }[];
}

interface ApiTier {
  uuid: string;
  devName: string;
  highlightColor: string;
  rank: number;
}

interface ApiWeapon {
  displayName: string;
  skins: ApiSkin[];
}

interface ApiTheme {
  uuid: string;
  displayName: string;
}

interface ApiSkin {
  uuid: string;
  displayName: string;
  displayIcon: string | null;
  contentTierUuid: string | null;
  themeUuid: string | null;
  levels: { uuid: string; displayIcon: string | null }[];
}

export interface Catalog {
  /** The catalog; fetched on the spot the first time, when none is stored yet. */
  get: () => Promise<CatalogData>;
  refresh: () => Promise<void>;
  lookup: (uuid: string) => Promise<Omit<Offer, 'cost'>>;
  /** Refreshes when the catalog is over a day old; called on every scheduled check. */
  refreshIfStale: () => Promise<void>;
}

const report = (e: unknown) => console.error('catalog refresh failed:', e, (e as { cause?: unknown }).cause);

async function get<T>(p: string): Promise<T> {
  const r = await plain(`${BASE}${p}`);
  if (r.status !== 200) throw new Error(`${p} answered ${r.status}`);
  return (JSON.parse(r.text) as { data: T }).data;
}

/** Keeps only what the app and the checker use. */
export function compact(tiers: ApiTier[], weapons: ApiWeapon[], themes: ApiTheme[]): CatalogData {
  const line = new Map(themes.map((t) => [t.uuid, t.displayName]));
  return {
    v: VERSION,
    updated: Date.now(),
    tiers: tiers.map((t) => ({ id: t.uuid, name: t.devName, color: `#${t.highlightColor.slice(0, 6)}`, r: t.rank })),
    skins: weapons.flatMap((w) => w.skins.map((s) => ({ s, w: w.displayName }))).flatMap(({ s, w }) =>
      // The skin's own icon is sometimes a placeholder cross; its first level always has the real art.
      s.levels[0]?.displayIcon && !/^(Standard |Random Favorite)/.test(s.displayName)
        ? [{ u: s.uuid, l: s.levels[0].uuid, n: s.displayName, i: s.levels[0].displayIcon, t: s.contentTierUuid, w, s: line.get(s.themeUuid ?? '') ?? null }]
        : [],
    ),
  };
}

export async function fetchCatalog(): Promise<CatalogData> {
  const [tiers, weapons, themes] = await Promise.all([get<ApiTier[]>('/contenttiers'), get<ApiWeapon[]>('/weapons'), get<ApiTheme[]>('/themes')]);
  return compact(tiers, weapons, themes);
}

// Gzipped so the value stays far below the size limit of a Redis request.
const pack = (d: CatalogData) => zlib.gzipSync(JSON.stringify(d)).toString('base64');
const unpack = (s: string) => JSON.parse(zlib.gunzipSync(Buffer.from(s, 'base64')).toString('utf8')) as CatalogData;

export function createCatalog(kv: Kv, fetcher: () => Promise<CatalogData> = fetchCatalog): Catalog {
  let data: CatalogData | undefined;
  let index = new Map<string, CatalogData['skins'][number]>();
  let loadedAt = 0;
  let pending: Promise<void> | undefined;

  const use = (d: CatalogData) => {
    data = d;
    index = new Map(d.skins.map((s) => [s.l, s]));
    loadedAt = Date.now();
  };
  // A warm instance keeps its copy for a few minutes before asking Redis again.
  const load = async () => {
    if (!data || Date.now() - loadedAt > LOCAL_MS) {
      const blob = await kv.get<string>('catalog');
      use(blob ? unpack(blob) : { updated: 0, tiers: [], skins: [] });
    }
    return data as CatalogData;
  };
  const refresh = () =>
    (pending ??= fetcher()
      .then(async (fresh) => {
        await kv.set('catalog', pack(fresh));
        use(fresh);
      })
      .finally(() => {
        pending = undefined;
      }));

  return {
    async get() {
      const d = await load();
      if (!d.skins.length) await refresh().catch(report);
      return data as CatalogData;
    },
    refresh,
    // A skin missing from the catalog means a new release: refresh once, then fall back to the id.
    async lookup(uuid) {
      const d = await load();
      if (!index.has(uuid) && Date.now() - d.updated > MISS_RETRY) await refresh().catch(report);
      const s = index.get(uuid);
      return s ? { name: s.n, icon: s.i, tier: s.t } : { name: uuid, icon: null, tier: null };
    },
    async refreshIfStale() {
      const d = await load();
      if (d.v !== VERSION || Date.now() - d.updated > DAY) await refresh();
    },
  };
}
