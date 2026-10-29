'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Accounts } from './Accounts';
import { AddAccount } from './AddAccount';
import { api, friendly, whenSignedOut, type AccountView, type Alert, type Catalog as CatalogData, type Skin } from './api';
import { Auth } from './Auth';
import { Banner } from './bits';
import { Catalog } from './Catalog';
import { makeIndex, sameName } from './data';
import { NavBar } from './NavBar';
import { useNotifier } from './notify';
import { SkinSheet } from './Skin';
import { Store } from './Store';
import { Wishlist } from './Wishlist';

function Shell({ user, onSignedOut }: { user: string; onSignedOut: () => void }) {
    const [tab, setTab] = useState('store');
    const [accounts, setAccounts] = useState<AccountView[]>([]);
    const [wishlist, setWishlist] = useState<string[]>([]);
    const [alerts, setAlerts] = useState<Alert[] | null>(null);
    const [catalog, setCatalog] = useState<CatalogData | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState('');
    const [open, setOpen] = useState<Skin | null>(null);
    const [adding, setAdding] = useState(false);
    const index = useMemo(() => (catalog ? makeIndex(catalog) : null), [catalog]);
    const notifier = useNotifier(alerts);
    const fail = useCallback((e: unknown) => setMessage(e instanceof Error ? e.message : friendly(0, '')), []);

    const refresh = useCallback(async () => {
        try {
            const [a, w, al] = await Promise.all([api<AccountView[]>('/accounts'), api<string[]>('/wishlist'), api<Alert[]>('/alerts')]);
            setAccounts(a);
            setWishlist(w);
            setAlerts(al);
            setLoaded(true);
        } catch (e) {
            fail(e);
        }
    }, [fail]);

    // Runs one backend call, then reloads the lists; `wait` is shown meanwhile.
    const act = async (wait: string, call: () => Promise<unknown>) => {
        setBusy(wait);
        await call().catch(fail);
        setBusy('');
        void refresh();
    };
    // Shown at once, then confirmed by the server.
    const addWish = (name: string) => {
        setWishlist((w) => (w.some((x) => sameName(x, name)) ? w : [...w, name]));
        void act('', () => api('/wishlist', 'POST', { name }));
    };
    const removeWish = (name: string) => {
        setWishlist((w) => w.filter((x) => x !== name));
        void act('', () => api(`/wishlist/${encodeURIComponent(name)}`, 'DELETE'));
    };
    const removeAccount = (a: AccountView) => {
        if (!window.confirm(`Remove ${a.name}? Its stored Riot session is deleted.`)) return;
        setAccounts((all) => all.filter((x) => x.id !== a.id));
        void act('', () => api(`/accounts/${a.id}`, 'DELETE'));
    };
    const signOut = async () => {
        await api('/web/logout', 'POST').catch(() => {});
        onSignedOut();
    };

    useEffect(() => {
        void refresh();
        api<CatalogData>('/catalog').then(setCatalog, fail);
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

    const watched = open ? wishlist.find((w) => sameName(w, open.n)) : undefined;
    return (
        <>
            {tab === 'store' && <div className="glow" aria-hidden="true" />}
            <div className="shell">
                <NavBar current={tab} user={user} onSelect={setTab} />
                <div className="app">
                    <div key={tab} className="fade">
                        {tab === 'store' && (
                            <Store accounts={accounts} wishlist={wishlist} index={index} loaded={loaded} onRefresh={() => void refresh()} onAdd={() => setAdding(true)} onOpen={setOpen} />
                        )}
                        {tab === 'catalog' && <Catalog index={index} wishlist={wishlist} onAdd={addWish} onRemove={removeWish} onOpen={setOpen} />}
                        {tab === 'wishlist' && <Wishlist wishlist={wishlist} index={index} onAdd={addWish} onRemove={removeWish} />}
                        {tab === 'accounts' && (
                            <Accounts
                                user={user}
                                accounts={accounts}
                                loaded={loaded}
                                notifier={notifier}
                                onAdd={() => setAdding(true)}
                                onDelete={removeAccount}
                                onSignOut={() => void signOut()}
                                onTest={() => void act('Sending a test notification', () => api('/alerts/test', 'POST'))}
                            />
                        )}
                    </div>
                </div>
            </div>
            {open && <SkinSheet skin={open} tier={index?.tier(open.t)} watched={!!watched} onToggle={() => (watched ? removeWish(watched) : addWish(open.n))} onClose={() => setOpen(null)} />}
            {adding && (
                <AddAccount
                    onClose={() => setAdding(false)}
                    onSubmit={(cookies) => {
                        setAdding(false);
                        void act('Adding your Riot account', () => api('/accounts', 'POST', { cookies }));
                    }}
                />
            )}
            <Banner text={message || busy} error={message !== ''} onDismiss={() => setMessage('')} />
        </>
    );
}

export function App() {
    // undefined while the session is being checked, null when signed out.
    const [user, setUser] = useState<string | null | undefined>(undefined);
    useEffect(() => {
        whenSignedOut(() => setUser(null));
        api<{ name: string }>('/me').then(
            (r) => setUser(r.name),
            () => setUser(null),
        );
    }, []);

    if (user === undefined) return <div className="boot" role="status" aria-label="Loading" />;
    return user === null ? <Auth onSignedIn={setUser} /> : <Shell user={user} onSignedOut={() => setUser(null)} />;
}
