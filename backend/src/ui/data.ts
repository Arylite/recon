import type { Catalog, Skin, Tier } from './api';

// Buy-menu order; a weapon added to the game later goes at the end.
const WEAPONS = ['Classic', 'Shorty', 'Frenzy', 'Ghost', 'Bandit', 'Sheriff', 'Stinger', 'Spectre', 'Bucky', 'Judge', 'Bulldog', 'Guardian', 'Phantom', 'Vandal', 'Marshal', 'Outlaw', 'Operator', 'Ares', 'Odin', 'Melee'];
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
  tier: (id: string | null | undefined) => Tier | undefined;
  skin: (name: string) => Skin | undefined;
  search: (query: string, limit?: number) => Skin[];
}

export function makeIndex(catalog: Catalog): Index {
  const byName = new Map(catalog.skins.map((s) => [s.n.toLowerCase(), s]));
  const tiers = new Map(catalog.tiers.map((t) => [t.id, t]));
  return {
    catalog,
    tier: (id) => (id ? tiers.get(id) : undefined),
    skin: (name) => byName.get(name.toLowerCase()),
    search(query, limit = 30) {
      const q = query.trim().toLowerCase();
      return q.length < 2 ? [] : catalog.skins.filter((s) => s.n.toLowerCase().includes(q)).slice(0, limit);
    },
  };
}
