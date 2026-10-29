'use client';
import { useEffect, useState } from 'react';
import { friendly, type AccountView, type Skin } from './api';
import { IconBtn, Label, Logo, PillButton, Segmented, Skeleton } from './bits';
import { ProductCard } from './cards';
import { EmptyState } from './Empty';
import { isWished, type Index } from './data';

const DAY_MS = 24 * 3600 * 1000;

/** Time left until the store rotates, every day at 00:00 UTC. */
function useResetIn() {
    const [now, setNow] = useState<number | null>(null);
    useEffect(() => {
        setNow(Date.now());
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    if (now === null) return '--:--:--';
    const s = Math.floor((DAY_MS - (now % DAY_MS)) / 1000);
    return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, '0')).join(':');
}

/** Four cards breathing in place of the offers, with a line saying what is going on. */
const Loading = ({ text }: { text: string }) => (
    <div className="stack">
        <p className="body mute">{text}</p>
        <div className="products">
            {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={272} />
            ))}
        </div>
    </div>
);

/** No Riot account yet: the four daily slots drawn empty on the grid of the cards, the first one pinging. */
const Empty = ({ onAdd }: { onAdd: () => void }) => (
    <div className="stack">
        <div className="slots">
            {[0, 1, 2, 3].map((i) => (
                <div key={i} className="slot dashed">
                    {i === 0 && <Logo size={72} />}
                </div>
            ))}
        </div>
        <EmptyState title="Your four daily skins land here" text="Add your Riot account and Recon checks your store every 15 minutes, even with the tab closed.">
            <PillButton onClick={onAdd}>Add a Riot account</PillButton>
        </EmptyState>
    </div>
);

function Offers({ account, wishlist, index, onOpen }: { account: AccountView; wishlist: string[]; index: Index | null; onOpen: (s: Skin) => void }) {
    if (account.error && account.offers.length === 0) return <p className="body ember">{friendly(0, account.error)}</p>;
    if (account.offers.length === 0) return <Loading text="Looking at this store for the first time." />;
    return (
        <div className="stack">
            {account.error && <p className="body ember">{friendly(0, account.error)}</p>}
            <div className="products">
                {account.offers.map((o) => {
                    const skin = index?.skin(o.name);
                    return <ProductCard key={o.name} offer={o} tier={index?.tier(o.tier)} hit={isWished(o.name, wishlist)} onOpen={skin && (() => onOpen(skin))} />;
                })}
            </div>
        </div>
    );
}

export function Store(props: { accounts: AccountView[]; wishlist: string[]; index: Index | null; loaded: boolean; onRefresh: () => void; onAdd: () => void; onOpen: (s: Skin) => void }) {
    const { accounts, wishlist, index, loaded, onRefresh, onAdd, onOpen } = props;
    const [selected, setSelected] = useState(0);
    const left = useResetIn();
    const account = accounts[Math.min(selected, accounts.length - 1)];
    const hits = account ? account.offers.filter((o) => isWished(o.name, wishlist)).length : 0;
    const key = !loaded ? 'loading' : (account?.id ?? 'empty');

    return (
        <div className="screen">
            <header className="store-head">
                <div>
                    <Label>Store resets in</Label>
                    <p className="clock">{left}</p>
                    {/* The line is always there, so a hit never pushes the page down. */}
                    <p className={`skin-line hits ${hits > 0 ? 'ember' : 'mute'}`}>
                        {!account || account.offers.length === 0 ? (
                            <>&nbsp;</>
                        ) : hits === 0 ? (
                            'None from your wishlist today'
                        ) : hits === 1 ? (
                            '1 skin from your wishlist today'
                        ) : (
                            `${hits} skins from your wishlist today`
                        )}
                    </p>
                </div>
                <IconBtn icon="refresh" label="Refresh" onClick={onRefresh} />
            </header>
            {accounts.length > 1 && (
                <Segmented label="Riot account" items={accounts.map((a) => a.name.split('#')[0] ?? a.name)} selected={Math.min(selected, accounts.length - 1)} onSelect={setSelected} />
            )}
            {/* Fades between loading, empty and each account's offers instead of jumping. */}
            <div key={key} className="fade">
                {!loaded ? <Loading text="Getting your store." /> : account ? <Offers account={account} wishlist={wishlist} index={index} onOpen={onOpen} /> : <Empty onAdd={onAdd} />}
            </div>
        </div>
    );
}
