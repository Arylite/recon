'use client';
import { useEffect, useMemo, useState } from 'react';
import { Accounts } from './Accounts';
import { AddAccount } from './AddAccount';
import { api, Failure, whenSignedOut, type Skin } from './api';
import { cache } from './cache';
import { Auth } from './Auth';
import { Banner, Logo } from './bits';
import { Catalog } from './Catalog';
import { makeIndex, sameName } from './data';
import { NavBar } from './NavBar';
import { useNotifier } from './notify';
import { SkinSheet } from './Skin';
import { Store } from './Store';
import { useRecon } from './useRecon';
import { Wishlist } from './Wishlist';

function Shell({ user, onSignedOut }: { user: string; onSignedOut: () => void }) {
    const [tab, setTab] = useState('store');
    const [open, setOpen] = useState<Skin | null>(null);
    const [adding, setAdding] = useState(false);
    const r = useRecon(user);
    // Smart rarity for melee is a setting the browser keeps.
    const [smart, setSmartState] = useState(() => cache.read<boolean>('smart') ?? false);
    const setSmart = (v: boolean) => (setSmartState(v), cache.write('smart', v));
    const index = useMemo(() => (r.catalog ? makeIndex(r.catalog, smart) : null), [r.catalog, smart]);
    const notifier = useNotifier(r.alerts);
    // Signed out at once; the server revokes the session in the background.
    const signOut = () => {
        void api('/web/logout', 'POST').catch(() => {});
        onSignedOut();
    };

    const watched = open ? r.wishlist.find((w) => sameName(w, open.n)) : undefined;
    return (
        <>
            <div className="shell">
                <NavBar current={tab} user={user} onSelect={setTab} />
                <div className="app">
                    <div key={tab} className="fade">
                        {tab === 'store' && (
                            <Store accounts={r.accounts} wishlist={r.wishlist} index={index} loaded={r.loaded} onRefresh={() => void r.refresh()} onAdd={() => setAdding(true)} onOpen={setOpen} />
                        )}
                        {tab === 'catalog' && <Catalog index={index} wishlist={r.wishlist} smart={smart} onSmart={setSmart} onAdd={r.addWish} onRemove={r.removeWish} onOpen={setOpen} />}
                        {tab === 'wishlist' && <Wishlist wishlist={r.wishlist} index={index} onAdd={r.addWish} onRemove={r.removeWish} />}
                        {tab === 'accounts' && (
                            <Accounts
                                user={user}
                                accounts={r.accounts}
                                loaded={r.loaded}
                                notifier={notifier}
                                onAdd={() => setAdding(true)}
                                onDelete={r.removeAccount}
                                onSignOut={signOut}
                                onTest={r.testAlert}
                            />
                        )}
                    </div>
                </div>
            </div>
            {open && <SkinSheet skin={open} tier={index?.tierOf(open)} watched={!!watched} onToggle={() => (watched ? r.removeWish(watched) : r.addWish(open.n))} onClose={() => setOpen(null)} />}
            {adding && (
                <AddAccount
                    onClose={() => setAdding(false)}
                    onSubmit={(cookies) => {
                        setAdding(false);
                        setTab('store');
                        r.addAccount(cookies);
                    }}
                />
            )}
            <Banner text={r.message || r.busy || r.note} error={r.message !== ''} onDismiss={() => r.setMessage('')} />
        </>
    );
}

export function App() {
    // undefined while nothing is known yet, null when signed out.
    const [user, setUser] = useState<string | null | undefined>(undefined);
    const signedOut = () => (cache.clear(), setUser(null));
    useEffect(() => {
        whenSignedOut(() => (cache.clear(), setUser(null)));
        // Whoever signed in here last is shown at once with what they saw last; the server then confirms the session.
        const known = cache.read<string>('user');
        if (known) setUser(known);
        api<{ name: string }>('/me').then(
            (res) => (cache.write('user', res.name), setUser(res.name)),
            // Only an ended session signs out; a dropped connection keeps what is on screen.
            (e: unknown) => ((e instanceof Failure && e.status === 401) || !known ? signedOut() : undefined),
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            {user === undefined ? (
                <div className="boot" role="status" aria-label="Loading">
                    <Logo size={72} />
                </div>
            ) : user === null ? (
                <Auth onSignedIn={(name) => (cache.write('user', name), setUser(name))} />
            ) : (
                <Shell user={user} onSignedOut={signedOut} />
            )}
        </>
    );
}
