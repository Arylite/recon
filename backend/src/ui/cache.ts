// What the page last knew, kept in the browser so the next visit paints at once and the server only
// confirms (stale while revalidate). Nothing secret is in it: the API never returns Riot cookies or
// tickets. Every call is guarded, since storage can be full, blocked or empty in a private window.
const PREFIX = 'recon.';
// The browser-notification and smart-rarity choices are settings, not a cache: they survive a sign-out.
const KEEP = new Set(['notify', 'smart']);

interface Entry<T> {
  at: number;
  v: T;
}

function entry<T>(key: string): Entry<T> | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as Entry<T>) : null;
  } catch {
    return null;
  }
}

export const cache = {
  /** The saved value, or null when there is none or it is older than `maxAgeMs`. */
  read<T>(key: string, maxAgeMs = Infinity): T | null {
    const e = entry<T>(key);
    return e && Date.now() - e.at <= maxAgeMs ? e.v : null;
  },
  write(key: string, v: unknown) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), v }));
    } catch {
      // full or blocked: the page just works without the cache
    }
  },
  /** How old a saved value is, in ms; Infinity when there is none. */
  age(key: string): number {
    const e = entry<unknown>(key);
    return e ? Date.now() - e.at : Infinity;
  },
  /** Forgets everything of the signed-in person (sign out, or the server says the session ended). */
  clear() {
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX) && !KEEP.has(k.slice(PREFIX.length))) localStorage.removeItem(k);
    } catch {
      // nothing to clear
    }
  },
};

export const HOUR = 3600 * 1000;
export const DAY = 24 * HOUR;
