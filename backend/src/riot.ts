import { request } from './http';
import * as cookies from './cookies';

const AUTH_URL =
  'https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in' +
  '&client_id=play-valorant-web-prod&response_type=token%20id_token&scope=account%20openid&nonce=1';
const ENTITLEMENTS_URL = 'https://entitlements.auth.riotgames.com/api/token/v1';
const UA = 'RiotClient/63.0.9.4909983.4789131 rso-auth (Windows;10;;Professional, x64)';

export class SessionExpired extends Error {}

export interface Creds {
  accessToken: string;
  idToken: string | null;
  entitlements: string;
  puuid: string;
  /** The cookie string after Riot rotated it; store this one. */
  cookies: string;
}

export function tokensFrom(location: string): { accessToken: string; idToken: string | null } {
  const hash = new URLSearchParams(new URL(location).hash.slice(1));
  const accessToken = hash.get('access_token');
  if (!accessToken) throw new SessionExpired('Riot session expired, add the account again from the Setup tab');
  return { accessToken, idToken: hash.get('id_token') };
}

export const puuidFrom = (jwt: string): string =>
  (JSON.parse(Buffer.from(jwt.split('.')[1] ?? '', 'base64url').toString()) as { sub: string }).sub;

// Silent re-login with the stored cookies; Riot rotates ssid, so the new jar must be saved.
export async function reauth(cookieStr: string): Promise<Creds> {
  const jar = cookies.parse(cookieStr);
  const r = await request(AUTH_URL, { headers: { Cookie: cookies.serialize(jar), 'User-Agent': UA } });
  if (r.status !== 303 || !r.headers.location) {
    // A 403 with a Cloudflare page means Riot blocks this IP or TLS fingerprint, not a bad session.
    console.error(`riot auth answered ${r.status}: ${r.text.replace(/\s+/g, ' ').slice(0, 300)}`);
    throw new SessionExpired(`auth answered ${r.status}`);
  }
  const { accessToken, idToken } = tokensFrom(r.headers.location);
  cookies.merge(jar, r.headers['set-cookie']);

  const e = await request(ENTITLEMENTS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'User-Agent': UA },
    body: '{}',
  });
  if (e.status !== 200) {
    console.error(`riot entitlements answered ${e.status}: ${e.text.slice(0, 300)}`);
    throw new Error(`entitlements answered ${e.status}`);
  }
  return {
    accessToken,
    idToken,
    entitlements: (JSON.parse(e.text) as { entitlements_token: string }).entitlements_token,
    puuid: puuidFrom(accessToken),
    cookies: cookies.serialize(jar),
  };
}
