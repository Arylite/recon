import { request } from './http.js';
import { reauth, type Creds } from './riot.js';
import { fetchOffers } from './store.js';
import { SHARDS, type Shard } from './types.js';

const PAS = 'https://riot-geo.pas.si.riotgames.com/pas/v1/product/valorant';
const USERINFO = 'https://auth.riotgames.com/userinfo';
// Riot's affinity names; latam and br accounts are served by the na shard.
const LIVE: Record<string, Shard> = { eu: 'eu', na: 'na', latam: 'na', br: 'na', ap: 'ap', kr: 'kr' };

export interface Verified {
  cookies: string;
  puuid: string;
  shard: Shard;
  /** The Riot ID (Name#TAG) when Riot gave it. */
  name: string | null;
}

export const shardFromAffinity = (live: string | undefined): Shard | null => (live && LIVE[live]) || null;

/** Asks Riot where the account lives; falls back to trying the storefront of each region. */
export async function detectShard(creds: Creds): Promise<Shard> {
  if (creds.idToken) {
    try {
      const r = await request(PAS, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: creds.idToken }),
      });
      const live = r.status === 200 ? (JSON.parse(r.text) as { affinities?: { live?: string } }).affinities?.live : undefined;
      const shard = shardFromAffinity(live);
      if (shard) return shard;
    } catch {
      // shortcut: the affinity endpoint is undocumented, so any failure just falls back to probing.
    }
  }
  for (const shard of SHARDS) {
    try {
      await fetchOffers(creds, shard);
      return shard;
    } catch {
      // wrong region, try the next one
    }
  }
  throw new Error('could not detect the region of this account');
}

async function riotId(creds: Creds): Promise<string | null> {
  try {
    const r = await request(USERINFO, { headers: { Authorization: `Bearer ${creds.accessToken}` } });
    const acct = (JSON.parse(r.text) as { acct?: { game_name?: string; tag_line?: string } }).acct;
    return acct?.game_name ? `${acct.game_name}#${acct.tag_line ?? ''}` : null;
  } catch {
    return null;
  }
}

/** Logs in with the browser cookies once, so a bad session is refused when the account is added. */
export async function verifyLogin(cookieStr: string): Promise<Verified> {
  const creds = await reauth(cookieStr);
  const [shard, name] = await Promise.all([detectShard(creds), riotId(creds)]);
  return { cookies: creds.cookies, puuid: creds.puuid, shard, name };
}
