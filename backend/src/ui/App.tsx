'use client';
import { useEffect, useMemo, useState } from 'react';
import { Accounts } from './Accounts';
import { AddAccount } from './AddAccount';
import { api, whenSignedOut, type Skin } from './api';
import { Auth } from './Auth';
import { Banner } from './bits';
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
    const r = useRecon();
    const index = useMemo(() => (r.catalog ? makeIndex(r.catalog) : null), [r.catalog]);
    const notifier = useNotifier(r.alerts);
    // Signed out at once; the server revokes the session in the background.
    const signOut = () => {
        void api('/web/logout', 'POST').catch(() => {});
        onSignedOut();
    };

    const watched = open ? r.wishlist.find((w) => sameName(w, open.n)) : undefined;
    return (
        <>
            {tab === 'store' && <div className="glow" aria-hidden="true" />}
            <div className="shell">
                <NavBar current={tab} user={user} onSelect={setTab} />
                <div className="app">
                    <div key={tab} className="fade">
                        {tab === 'store' && (
                            <Store accounts={r.accounts} wishlist={r.wishlist} index={index} loaded={r.loaded} onRefresh={() => void r.refresh()} onAdd={() => setAdding(true)} onOpen={setOpen} />
                        )}
                        {tab === 'catalog' && <Catalog index={index} wishlist={r.wishlist} onAdd={r.addWish} onRemove={r.removeWish} onOpen={setOpen} />}
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
            {open && <SkinSheet skin={open} tier={index?.tier(open.t)} watched={!!watched} onToggle={() => (watched ? r.removeWish(watched) : r.addWish(open.n))} onClose={() => setOpen(null)} />}
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
    // undefined while the session is being checked, null when signed out.
    const [user, setUser] = useState<string | null | undefined>(undefined);
    useEffect(() => {
        whenSignedOut(() => setUser(null));
        api<{ name: string }>('/me').then(
            (res) => setUser(res.name),
            () => setUser(null),
        );
    }, []);

    if (user === undefined) return <div className="boot" role="status" aria-label="Loading" />;
    return user === null ? <Auth onSignedIn={setUser} /> : <Shell user={user} onSignedOut={() => setUser(null)} />;
}
