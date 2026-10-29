import { plain, request } from './http';
import type { Creds } from './riot';
import type { Shard } from './types';

const PLATFORM = Buffer.from(
  JSON.stringify({
    platformType: 'PC',
    platformOS: 'Windows',
    platformOSVersion: '10.0.19042.1.256.64bit',
    platformChipset: 'Unknown',
  }),
).toString('base64');

let clientVersion: string | undefined;

async function getVersion(): Promise<string> {
  if (!clientVersion) {
    const url = 'https://valorant-api.com/v1/version';
    const r = await plain(url);
    if (r.status !== 200) throw new Error(`${url} answered ${r.status}`);
    clientVersion = (JSON.parse(r.text) as { data: { riotClientVersion: string } }).data.riotClientVersion;
  }
  return clientVersion;
}

const VP = '85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741';

interface Storefront {
  SkinsPanelLayout: {
    SingleItemOffers: string[];
    SingleItemStoreOffers?: { OfferID: string; Cost: Record<string, number> }[];
  };
}

export interface StoreOffer {
  uuid: string;
  cost: number | null;
}

/** The daily skin offers (level uuid and VP price), rotating every day at 00:00 UTC. */
export async function fetchOffers(creds: Creds, shard: Shard): Promise<StoreOffer[]> {
  // v2 (GET) now answers 404; v3 is a POST with an empty JSON body and the same response.
  const r = await request(`https://pd.${shard}.a.pvp.net/store/v3/storefront/${creds.puuid}`, {
    method: 'POST',
    body: '{}',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creds.accessToken}`,
      'X-Riot-Entitlements-JWT': creds.entitlements,
      'X-Riot-ClientPlatform': PLATFORM,
      'X-Riot-ClientVersion': await getVersion(),
    },
  });
  if (r.status !== 200) {
    console.error(`riot storefront (${shard}) answered ${r.status}: ${r.text.slice(0, 300)}`);
    throw new Error(`storefront answered ${r.status}`);
  }
  const panel = (JSON.parse(r.text) as Storefront).SkinsPanelLayout;
  const costs = new Map((panel.SingleItemStoreOffers ?? []).map((o) => [o.OfferID, o.Cost[VP] ?? null]));
  return panel.SingleItemOffers.map((uuid) => ({ uuid, cost: costs.get(uuid) ?? null }));
}
