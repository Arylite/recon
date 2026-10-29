import { plain } from './http';
import type { Kv } from './kv';

const MEDIA = 'https://media.valorant-api.com/';
const WEEK = 7 * 24 * 3600;

export interface SkinDetail {
  variants: { name: string; render: string | null; swatch: string | null }[];
  levels: { name: string; video: string | null }[];
}

interface ApiSkin {
  chromas: { displayName: string; fullRender: string | null; swatch: string | null }[];
  levels: { levelItem: string | null; streamedVideo: string | null }[];
}

// The browser may only load art from valorant-api.com's media host; anything else is dropped here.
const media = (url: string | null | undefined) => (url?.startsWith(MEDIA) ? url : null);

// "Reaver Vandal Level 4\r\n(Variant 2 Black)" -> "Black"; the first chroma is the skin as sold.
const variantName = (raw: string, first: boolean) => (first ? 'Base' : (/\((?:Variant \d+ )?([^)]*)\)/.exec(raw)?.[1]?.trim() ?? raw.trim()));

// "EEquippableSkinLevelItem::SoundEffects" -> "Sound Effects"
const levelName = (item: string | null) => item?.split('::')[1]?.replace(/(?<=[a-z])(?=[A-Z])/g, ' ') ?? 'Base';

/** Colour variants and upgrade levels of one skin, the same shape the Android app builds. */
export function compactSkin(s: ApiSkin): SkinDetail {
  return {
    variants: s.chromas.map((c, i) => ({ name: variantName(c.displayName, i === 0), render: media(c.fullRender), swatch: media(c.swatch) })),
    levels: s.levels.map((l) => ({ name: levelName(l.levelItem), video: media(l.streamedVideo) })),
  };
}

/** Cached in Redis for a week: skins hardly ever change, and the data host is slow from some networks. */
export async function skinDetail(kv: Kv, uuid: string, fetcher: (uuid: string) => Promise<ApiSkin> = fetchSkin): Promise<SkinDetail> {
  const cached = await kv.get<SkinDetail>(`skin:${uuid}`);
  if (cached) return cached;
  const detail = compactSkin(await fetcher(uuid));
  await kv.set(`skin:${uuid}`, detail, { ex: WEEK });
  return detail;
}

async function fetchSkin(uuid: string): Promise<ApiSkin> {
  const r = await plain(`https://valorant-api.com/v1/weapons/skins/${uuid}`);
  if (r.status !== 200) throw new Error(`skin ${uuid} answered ${r.status}`);
  return (JSON.parse(r.text) as { data: ApiSkin }).data;
}
