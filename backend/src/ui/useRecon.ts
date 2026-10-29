'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, friendly, type AccountView, type Alert, type Catalog } from './api';
import { cache, DAY } from './cache';
import { sameName } from './data';

const PENDING = 'pending-';
interface Saved {
  accounts: AccountView[];
  wishlist: string[];
  alerts: Alert[];
}
/** The old value when the new one is the same, so React sees no change. */
const keep = <T>(prev: T, next: T): T => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next);
export const isPending = (a: AccountView) => a.id.startsWith(PENDING);

/**
 * The data of the signed-in user, kept optimistic: a change shows at once and is sent in the
 * background. While changes are in flight a refresh is skipped, so a stale answer never undoes one;
 * when the last one lands the lists are reloaded, which also rolls back a change that failed.
 */
export function useRecon(user: string) {
  // What the browser remembers of this person paints at once; the server then confirms it.
  const [saved] = useState(() => cache.read<Saved>(`data:${user}`));
  const [accounts, setAccounts] = useState<AccountView[]>(saved?.accounts ?? []);
  const [wishlist, setWishlist] = useState<string[]>(saved?.wishlist ?? []);
  const [alerts, setAlerts] = useState<Alert[] | null>(saved?.alerts ?? null);
  const [catalog, setCatalog] = useState<Catalog | null>(() => cache.read<Catalog>('catalog'));
  const [loaded, setLoaded] = useState(!!saved);
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const inflight = useRef(0);
  const fail = useCallback((e: unknown) => setMessage(e instanceof Error ? e.message : friendly(0, '')), []);

  const refresh = useCallback(async () => {
    if (inflight.current > 0) return;
    try {
      const [a, w, al] = await Promise.all([api<AccountView[]>('/accounts'), api<string[]>('/wishlist'), api<Alert[]>('/alerts')]);
      // A change started while this was loading: the answer predates it.
      if (inflight.current > 0) return;
      // The same data keeps the same objects, so nothing re-renders or re-animates for nothing.
      setAccounts((prev) => keep(prev, a));
      setWishlist((prev) => keep(prev, w));
      setAlerts((prev) => keep(prev, al));
      setLoaded(true);
    } catch (e) {
      fail(e);
    }
  }, [fail]);

  /** Sends a change in the background; whatever the outcome, the server has the last word. */
  const send = async (call: () => Promise<unknown>, wait = '') => {
    inflight.current++;
    setBusy(wait);
    try {
      await call();
    } catch (e) {
      fail(e);
    } finally {
      inflight.current--;
      setBusy('');
      if (inflight.current === 0) void refresh();
    }
  };

  const addWish = (name: string) => {
    setWishlist((w) => (w.some((x) => sameName(x, name)) ? w : [...w, name]));
    void send(() => api('/wishlist', 'POST', { name }));
  };
  const removeWish = (name: string) => {
    setWishlist((w) => w.filter((x) => x !== name));
    void send(() => api(`/wishlist/${encodeURIComponent(name)}`, 'DELETE'));
  };
  const removeAccount = (a: AccountView) => {
    if (isPending(a) || !window.confirm(`Remove ${a.name}? Its stored Riot session is deleted.`)) return;
    setAccounts((all) => all.filter((x) => x.id !== a.id));
    void send(() => api(`/accounts/${a.id}`, 'DELETE'));
  };
  // The card is there at once, waiting for its store; Riot confirms the sign-in in a few seconds.
  const addAccount = (cookies: string) => {
    setAccounts((all) => [...all, { id: `${PENDING}${Date.now()}`, name: 'Riot account', shard: 'eu', offers: [], error: null }]);
    void send(() => api('/accounts', 'POST', { cookies }), 'Signing in to Riot');
  };
  const testAlert = () => {
    setNote('Test notification sent. It shows up in a few seconds.');
    void send(() => api('/alerts/test', 'POST'));
  };

  useEffect(() => {
    void refresh();
    // The catalog is big and changes once a day: fetched again only when the saved copy is old.
    if (cache.age('catalog') > DAY / 2) {
      api<Catalog>('/catalog').then((c) => (cache.write('catalog', c), setCatalog((prev) => keep(prev, c))), fail);
    }
    const t = setInterval(() => document.visibilityState === 'visible' && void refresh(), 30_000);
    return () => clearInterval(t);
  }, [refresh, fail]);
  // A new account is checked by the server just after it is added: ask again until its store is in.
  const waiting = accounts.some((a) => a.offers.length === 0 && a.error === null);
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => void refresh(), 3000);
    return () => clearInterval(t);
  }, [waiting, refresh]);
  // Saved a moment after each change, without the account that is still being added.
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => cache.write(`data:${user}`, { accounts: accounts.filter((a) => !isPending(a)), wishlist, alerts: alerts ?? [] }), 400);
    return () => clearTimeout(t);
  }, [accounts, wishlist, alerts, loaded, user]);
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(''), 3500);
    return () => clearTimeout(t);
  }, [note]);

  return { accounts, wishlist, alerts, catalog, loaded, message, note, busy, setMessage, refresh, addWish, removeWish, removeAccount, addAccount, testAlert };
}
