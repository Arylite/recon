'use client';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Loaded } from './App';
import { api, Failure, safeArt, safeColor, type AccountView, type Catalog, type Skin } from './api';
import { Icon, Message, useCssVar } from './bits';
import { isWished } from './Store';

function Suggestion({ skin, color, onPick }: { skin: Skin; color: string; onPick: () => void }) {
  const ref = useCssVar<HTMLButtonElement>('--tier', color);
  const art = safeArt(skin.i);
  return (
    <button ref={ref} type="button" className="suggestion" onClick={onPick}>
      <span className="thumb">{art && <img src={art} alt="" loading="lazy" referrerPolicy="no-referrer" />}</span>
      <span>
        <strong>{skin.n}</strong>
        <small>{[skin.w, skin.s].filter(Boolean).join(' / ')}</small>
      </span>
      <Icon name="plus" size={18} />
    </button>
  );
}

export function Wishlist({ wishlist, catalog, accounts }: { wishlist: Loaded<string[]>; catalog: Loaded<Catalog>; accounts: AccountView[] }) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const skins = catalog.data?.skins ?? [];
  const colors = useMemo(() => new Map((catalog.data?.tiers ?? []).map((t) => [t.id, safeColor(t.color)])), [catalog.data]);
  const q = query.trim().toLowerCase();
  const found = q.length < 2 ? [] : skins.filter((s) => `${s.n} ${s.s ?? ''} ${s.w}`.toLowerCase().includes(q)).slice(0, 8);
  const list = wishlist.data ?? [];
  // Another device may have changed it since the page opened.
  const { reload } = wishlist;
  useEffect(() => void reload(), [reload]);

  async function change(method: 'POST' | 'DELETE', name: string) {
    setError('');
    try {
      await (method === 'POST' ? api('/wishlist', 'POST', { name }) : api(`/wishlist/${encodeURIComponent(name)}`, 'DELETE'));
      if (method === 'POST') setQuery('');
      await wishlist.reload();
    } catch (e) {
      setError(e instanceof Failure ? e.message : 'Could not change the wishlist.');
    }
  }
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (q) void change('POST', query.trim());
  };

  return (
    <>
      <header className="screen-head">
        <span className="caption">Wishlist</span>
        <h1>What are you after?</h1>
        <p className="lede">A name is matched anywhere in a skin name: &quot;Reaver&quot; watches the whole line.</p>
      </header>
      <form className="search" onSubmit={add} role="search">
        <label>
          <span className="caption">Skin or line</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Reaver Vandal" maxLength={64} autoComplete="off" spellCheck={false} />
        </label>
        <button className="chip-add" type="submit" disabled={!q}>
          Watch &quot;{query.trim() || '...'}&quot;
        </button>
      </form>
      {found.length > 0 && (
        <div className="suggestions">
          {found.map((s) => (
            <Suggestion key={s.l} skin={s} color={colors.get(s.t ?? '') ?? safeColor(undefined)} onPick={() => void change('POST', s.n)} />
          ))}
        </div>
      )}
      {(error || wishlist.error) && <Message>{error || wishlist.error}</Message>}
      <h2 className="section">Watching ({list.length})</h2>
      {wishlist.data && list.length === 0 && <p className="fine">Nothing yet. Search a skin above and tap it to watch it.</p>}
      <ul className="rows">
        {list.map((w) => {
          const matches = skins.filter((s) => s.n.toLowerCase().includes(w.toLowerCase())).length;
          const inStore = accounts.filter((a) => a.offers.some((o) => isWished(o.name, [w]))).map((a) => a.name);
          return (
            <li key={w} className="row">
              <div>
                <strong>{w}</strong>
                <small>{inStore.length ? `In the store now: ${inStore.join(', ')}` : matches ? `${matches} matching skin${matches > 1 ? 's' : ''}` : 'No match in the catalog'}</small>
              </div>
              <button className="icon-btn" aria-label={`Stop watching ${w}`} onClick={() => void change('DELETE', w)}>
                <Icon name="x" />
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
