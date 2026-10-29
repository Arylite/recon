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
const FALLBACK = '#8F8B85';
/**
 * The game's five rarity colours are loud and unrelated; keeping each hue but pulling saturation and
 * lightness to the same level makes them one family next to the neutral surfaces.
 */
export function safeColor(c: string | undefined): string {
  if (!c || !/^#[0-9a-f]{6}$/i.test(c)) return FALLBACK;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return FALLBACK;
  const d = max - min;
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 : max === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
  const s = 0.55;
  const l = 0.62;
  const q = l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    const x = (t + 1) % 1;
    const v = x < 1 / 6 ? p + (q - p) * 6 * x : x < 1 / 2 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p;
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(h + 1 / 3)}${f(h)}${f(h - 1 / 3)}`;
}
