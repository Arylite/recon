import type { Catalog, Skin, Tier } from './api';

// Buy-menu order; a weapon added to the game later goes at the end.
const WEAPONS = [
  'Classic',
  'Shorty',
  'Frenzy',
  'Ghost',
  'Bandit',
  'Sheriff',
  'Stinger',
  'Spectre',
  'Bucky',
  'Judge',
  'Bulldog',
  'Guardian',
  'Phantom',
  'Vandal',
  'Marshal',
  'Outlaw',
  'Operator',
  'Ares',
  'Odin',
  'Melee',
];
export const weaponRank = (name: string) => {
  const i = WEAPONS.indexOf(name);
  return i < 0 ? WEAPONS.length : i;
};

// Popular lines; a word matches every skin whose name contains it.
export const LINES = ['Reaver', 'Prime', 'Glitchpop', 'Elderflame', 'Oni', 'Kuronami', 'Champions', 'RGX 11z Pro', 'Ion', 'Spectrum'];

/** The wishlist matches by case-insensitive substring, so a loose word watches a whole line. */
export const isWished = (name: string, wishlist: string[]) => wishlist.some((w) => name.toLowerCase().includes(w.toLowerCase()));
export const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export interface Index {
  catalog: Catalog;
  smart: boolean;
  tier: (id: string | null | undefined) => Tier | undefined;
  /** The rarity of a skin. In smart mode a melee takes the rarity of the rest of its line. */
  tierOf: (skin: Skin | undefined, fallbackId?: string | null) => Tier | undefined;
  skin: (name: string) => Skin | undefined;
  search: (query: string, limit?: number) => Skin[];
}

/**
 * The game data gives every melee the same rarity. The rest of its line says what it should be: the
 * most common rarity among the line's other weapons, the higher one on a tie.
 */
function lineRarities(catalog: Catalog): Map<string, string> {
  const rank = new Map(catalog.tiers.map((t) => [t.id, t.r]));
  const counts = new Map<string, Map<string, number>>();
  for (const s of catalog.skins) {
    if (s.w === 'Melee' || !s.s || !s.t) continue;
    const m = counts.get(s.s) ?? new Map<string, number>();
    m.set(s.t, (m.get(s.t) ?? 0) + 1);
    counts.set(s.s, m);
  }
  const best = new Map<string, string>();
  for (const [line, m] of counts) {
    const [top] = [...m].sort((a, b) => b[1] - a[1] || (rank.get(b[0]) ?? 0) - (rank.get(a[0]) ?? 0));
    if (top) best.set(line, top[0]);
  }
  return best;
}

export function makeIndex(catalog: Catalog, smart = false): Index {
  const byName = new Map(catalog.skins.map((s) => [s.n.toLowerCase(), s]));
  const tiers = new Map(catalog.tiers.map((t) => [t.id, t]));
  const inferred = smart ? lineRarities(catalog) : new Map<string, string>();
  return {
    catalog,
    smart,
    tier: (id) => (id ? tiers.get(id) : undefined),
    tierOf(skin, fallbackId) {
      const id = smart && skin?.w === 'Melee' ? (inferred.get(skin.s ?? '') ?? skin.t) : (skin?.t ?? fallbackId);
      return id ? tiers.get(id) : undefined;
    },
    skin: (name) => byName.get(name.toLowerCase()),
    search(query, limit = 30) {
      const q = query.trim().toLowerCase();
      return q.length < 2 ? [] : catalog.skins.filter((s) => s.n.toLowerCase().includes(q)).slice(0, limit);
    },
  };
}
