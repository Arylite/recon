export const SHARDS = ['eu', 'na', 'ap', 'kr'] as const;
export type Shard = (typeof SHARDS)[number];

export interface Offer {
  name: string;
  icon: string | null;
  tier: string | null;
  /** Price in Valorant Points, when the store gave one. */
  cost: number | null;
}

export interface Account {
  id: string;
  /** Riot account id, used to recognise an account that is added twice. */
  puuid: string;
  name: string;
  shard: Shard;
  /** Riot cookies, encrypted with SECRET. */
  cookies: string;
  offers: Offer[];
  /** `day|skin name` keys already alerted, so a skin alerts once per day. */
  notified: string[];
  error: string | null;
}

export interface Alert {
  id: number;
  ts: number;
  account: string;
  skin: string;
}

export interface State {
  accounts: Account[];
  wishlist: string[];
  alerts: Alert[];
  lastAlertId: number;
}

export interface Db {
  state: State;
  save: () => void;
}
