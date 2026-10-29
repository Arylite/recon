'use client';
import { useEffect, useState } from 'react';
import type { Offer } from '../types';
import type { Loaded } from './App';
import { safeArt, safeColor, type AccountView, type Catalog } from './api';
import { Message, Pill, useCssVar } from './bits';

export const isWished = (name: string, wishlist: string[]) => wishlist.some((w) => name.toLowerCase().includes(w.toLowerCase()));

/** Time left before the store rotates, at 00:00 UTC. */
function useCountdown() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return '--:--:--';
  const next = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate() + 1);
  const s = Math.floor((next - now) / 1000);
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
}

function SkinCard({ offer, wished, tier }: { offer: Offer; wished: boolean; tier: { name: string; color: string } | undefined }) {
  const ref = useCssVar<HTMLLIElement>('--tier', safeColor(tier?.color));
  const art = safeArt(offer.icon);
  return (
    <li ref={ref} className={`skin${wished ? ' skin-wished' : ''}`}>
      <div className="skin-art">{art && <img src={art} alt="" loading="lazy" referrerPolicy="no-referrer" />}</div>
      <h3>{offer.name}</h3>
      <p className="skin-meta">
        <span>{tier ? tier.name.replace(/Edition$/, '') : 'Skin'}</span>
        {offer.cost !== null && <span className="vp">{offer.cost} VP</span>}
      </p>
      {wished && <span className="flag">On your wishlist</span>}
    </li>
  );
}

function Slots() {
  return (
    <ul className="skins" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="skin skin-empty" />
      ))}
    </ul>
  );
}

function Account({ account, wishlist, catalog }: { account: AccountView; wishlist: string[]; catalog: Catalog | null }) {
  const tiers = new Map((catalog?.tiers ?? []).map((t) => [t.id, t]));
  return (
    <section className="account" aria-label={account.name}>
      <header>
        <h2>{account.name}</h2>
        <span className="caption">{account.shard.toUpperCase()}</span>
      </header>
      {account.error && <Message>{account.error.includes('expired') || account.error.includes('auth answered') ? 'Riot signed this account out. Add it again from Setup.' : 'The last check failed. It will be tried again soon.'}</Message>}
      {account.offers.length === 0 ? (
        <>
          <Slots />
          {!account.error && <p className="fine">The first check is running, the four skins show up in a moment.</p>}
        </>
      ) : (
        <ul className="skins">
          {account.offers.map((o) => (
            <SkinCard key={o.name} offer={o} wished={isWished(o.name, wishlist)} tier={o.tier ? tiers.get(o.tier) : undefined} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function Store({ accounts, wishlist, catalog, onSetup }: { accounts: Loaded<AccountView[]>; wishlist: string[]; catalog: Catalog | null; onSetup: () => void }) {
  const left = useCountdown();
  const list = accounts.data;
  return (
    <>
      <header className="screen-head">
        <span className="caption">Store changes in</span>
        <p className="clock" aria-label="Time before the store changes">
          {left}
        </p>
      </header>
      {accounts.error && <Message>{accounts.error}</Message>}
      {list === null && !accounts.error && <Slots />}
      {list?.length === 0 && (
        <section className="empty">
          <Slots />
          <h2>No Riot account yet</h2>
          <p>Add one and its four daily skins show up here, with an alert when one is on your wishlist.</p>
          <Pill onClick={onSetup}>Add a Riot account</Pill>
        </section>
      )}
      {list?.map((a) => <Account key={a.id} account={a} wishlist={wishlist} catalog={catalog} />)}
    </>
  );
}
