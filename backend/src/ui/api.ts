import type { Alert, Offer, Shard } from '../types';

export interface AccountView {
  id: string;
  name: string;
  shard: Shard;
  offers: Offer[];
  error: string | null;
}
export interface Skin {
  u: string;
  l: string;
  n: string;
  i: string;
  t: string | null;
  w: string;
  s: string | null;
}
export interface Tier {
  id: string;
  name: string;
  color: string;
  r: number;
}
export interface Catalog {
  tiers: Tier[];
  skins: Skin[];
}
export type { Alert };

/** Fails with a sentence that can be shown as it is. */
export class Failure extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Same idea as friendly() in the Android app: the server speaks in codes, people read sentences.
function friendly(status: number, error: string | undefined): string {
  const e = (error ?? '').toLowerCase();
  if (status === 429) return 'Too many attempts. Wait a few minutes and try again.';
  if (e.includes('wrong name')) return 'Wrong name or password.';
  if (e.includes('taken')) return 'This name is already taken.';
  if (e.includes('closed')) return 'Sign-ups are closed.';
  if (e.includes('invalid: cookies')) return 'These cookies do not look right: paste the ssid cookie at least.';
  if (e.includes('invalid: name')) return 'The name takes 3 to 32 letters, digits or _.';
  if (e.includes('expired') || e.includes('auth answered')) return 'Riot refused this session. Sign in to Riot again and copy fresh cookies.';
  if (status >= 500) return 'Something went wrong on our side. Try again in a moment.';
  return error ? error.charAt(0).toUpperCase() + error.slice(1) : 'Something went wrong.';
}

let onSignedOut: () => void = () => {};
export const whenSignedOut = (fn: () => void) => void (onSignedOut = fn);

/** The header makes the server refuse the request unless our own page sent it (CSRF). */
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'recon', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Failure(0, 'Cannot reach the server. Check your connection.');
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 401 && !path.startsWith('/web/')) onSignedOut();
  if (!res.ok) throw new Failure(res.status, friendly(res.status, data.error));
  return data as T;
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Same derivation as the Android app, so one account works on both: the server never gets the password. */
export async function clientHash(name: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = enc.encode(`recon:${name}`);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 }, key, 256));
}

const ART = 'https://media.valorant-api.com/';
/** Skin art is the only thing loaded from outside; anything else is dropped. */
export const safeArt = (url: string | null): string | null => (url?.startsWith(ART) ? url : null);
export const safeColor = (c: string | undefined): string => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : '#8F8B85');
