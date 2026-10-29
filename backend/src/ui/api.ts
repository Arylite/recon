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
export interface SkinDetail {
  variants: { name: string; render: string | null; swatch: string | null }[];
  levels: { name: string; video: string | null }[];
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

// The same sentences as friendly() in the Android app: the server speaks in codes, people read words.
export function friendly(status: number, error: string | undefined | null): string {
  const e = (error ?? '').toLowerCase();
  if (status === 429) return 'Too many attempts. Wait a few minutes and try again.';
  if (e.includes('invalid: name')) return 'Names use 3 to 32 letters, digits or _.';
  if (e.includes('invalid: password')) return 'Your password needs at least 8 characters.';
  if (e.includes('wrong name or password')) return 'Wrong name or password.';
  if (e.includes('name is taken')) return 'This name is taken, pick another one.';
  if (e.includes('sign-ups are closed')) return 'Sign-ups are closed.';
  if (e.includes('signed out') || e.includes('ticket expired')) return 'You were signed out. Sign in again.';
  if (e.includes('invalid: cookies')) return 'These cookies do not look right: the ssid one is needed.';
  if (e.includes('riot session expired') || e.includes('ssid') || e.includes('auth answered')) return 'Riot signed this account out. Add it again to keep watching it.';
  if (e.includes('answered') || e.includes('region') || e.includes('riot')) return "Riot isn't answering right now. Recon tries again in a few minutes.";
  return 'Something went wrong. Try again in a moment.';
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
    throw new Failure(0, "Recon can't be reached. Check your connection.");
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
