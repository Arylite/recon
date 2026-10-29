'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, friendly, type AccountView, type Alert, type Catalog } from './api';
import { sameName } from './data';

const PENDING = 'pending-';
export const isPending = (a: AccountView) => a.id.startsWith(PENDING);

/**
 * The data of the signed-in user, kept optimistic: a change shows at once and is sent in the
 * background. While changes are in flight a refresh is skipped, so a stale answer never undoes one;
 * when the last one lands the lists are reloaded, which also rolls back a change that failed.
 */
export function useRecon() {
  const [accounts, setAccounts] = useState<AccountView[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loaded, setLoaded] = useState(false);
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
      setAccounts(a);
      setWishlist(w);
      setAlerts(al);
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
    api<Catalog>('/catalog').then(setCatalog, fail);
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
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(''), 3500);
    return () => clearTimeout(t);
  }, [note]);

  return { accounts, wishlist, alerts, catalog, loaded, message, note, busy, setMessage, refresh, addWish, removeWish, removeAccount, addAccount, testAlert };
}
