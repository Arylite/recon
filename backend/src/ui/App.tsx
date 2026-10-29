'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, whenSignedOut, type AccountView, type Alert, type Catalog } from './api';
import { Auth } from './Auth';
import { Icon } from './bits';
import { useNotifier } from './notify';
import { Setup } from './Setup';
import { Store } from './Store';
import { Wishlist } from './Wishlist';

const TABS = [
  { id: 'store', label: 'Store', icon: 'store' },
  { id: 'wishlist', label: 'Wishlist', icon: 'heart' },
  { id: 'setup', label: 'Setup', icon: 'tune' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export interface Loaded<T> {
  data: T | null;
  error: string;
  reload: () => Promise<void>;
}

/** Loads a path now and every `every` ms while the page is visible. */
function useLoad<T>(path: string, every = 0): Loaded<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(
    () =>
      api<T>(path).then(
        (d) => (setData(d), setError('')),
        (e: Error) => setError(e.message),
      ),
    [path],
  );
  useEffect(() => {
    void reload();
    if (!every) return;
    const t = setInterval(() => document.visibilityState === 'visible' && void reload(), every);
    return () => clearInterval(t);
  }, [reload, every]);
  return { data, error, reload };
}

function Shell({ name, onSignedOut }: { name: string; onSignedOut: () => void }) {
  const [tab, setTab] = useState<Tab>('store');
  const accounts = useLoad<AccountView[]>('/accounts', 30_000);
  const wishlist = useLoad<string[]>('/wishlist');
  const catalog = useLoad<Catalog>('/catalog');
  const alerts = useLoad<Alert[]>('/alerts', 60_000);
  const notifier = useNotifier(alerts.data);

  return (
    <div className="shell">
      <main id="main">
        {tab === 'store' && <Store accounts={accounts} wishlist={wishlist.data ?? []} catalog={catalog.data} onSetup={() => setTab('setup')} />}
        {tab === 'wishlist' && <Wishlist wishlist={wishlist} catalog={catalog} accounts={accounts.data ?? []} />}
        {tab === 'setup' && <Setup name={name} accounts={accounts} alerts={alerts} notifier={notifier} onSignedOut={onSignedOut} />}
      </main>
      <nav className="tabbar" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export function App() {
  // undefined while the session is being checked, null when signed out.
  const [name, setName] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    whenSignedOut(() => setName(null));
    api<{ name: string }>('/me').then(
      (r) => setName(r.name),
      () => setName(null),
    );
  }, []);

  if (name === undefined) return <div className="boot" role="status" aria-label="Loading" />;
  return name === null ? <Auth onSignedIn={setName} /> : <Shell name={name} onSignedOut={() => setName(null)} />;
}
