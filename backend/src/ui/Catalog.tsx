'use client';
import { useMemo, useState } from 'react';
import type { Skin } from './api';
import { Field, Label, Segmented, Skeleton, useCssVar } from './bits';
import { MiniCard } from './cards';
import { sameName, weaponRank, type Index } from './data';

const GROUPS = ['Weapon', 'Rarity', 'Line'];

/** Small toggle pill; a coloured dot when it stands for a rarity. */
function Chip({ text, on, dot, onClick }: { text: string; on: boolean; dot?: string; onClick: () => void }) {
    const ref = useCssVar<HTMLButtonElement>('--tint', dot ?? 'transparent');
    return (
        <button ref={ref} className="chip" aria-pressed={on} onClick={onClick}>
            {dot && <i className="chip-dot" />}
            {text}
        </button>
    );
}

/** Every skin of the game, grouped by weapon, rarity or line, each one a tap away from the wishlist. */
export function Catalog(props: { index: Index | null; wishlist: string[]; onAdd: (n: string) => void; onRemove: (n: string) => void; onOpen: (s: Skin) => void }) {
    const { index, wishlist, onAdd, onRemove, onOpen } = props;
    const [query, setQuery] = useState('');
    const [group, setGroup] = useState(0);
    const [weapon, setWeapon] = useState<string | null>(null);
    const [rarity, setRarity] = useState<string | null>(null);
    const skins = index?.catalog.skins;
    const tiers = useMemo(() => [...(index?.catalog.tiers ?? [])].sort((a, b) => a.r - b.r), [index]);
    const weapons = useMemo(() => [...new Set((skins ?? []).map((s) => s.w).filter(Boolean))].sort((a, b) => weaponRank(a) - weaponRank(b)), [skins]);

    const groups = useMemo(() => {
        if (!index || !skins) return [];
        const q = query.trim().toLowerCase();
        const shown = skins.filter((s) => (!q || s.n.toLowerCase().includes(q) || (s.s ?? '').toLowerCase().includes(q)) && (!weapon || s.w === weapon) && (!rarity || s.t === rarity));
        const by = new Map<string, Skin[]>();
        for (const s of shown) {
            const key = group === 0 ? s.w : group === 1 ? (index.tier(s.t)?.name ?? 'Other') : (s.s ?? 'Other');
            by.set(key, [...(by.get(key) ?? []), s]);
        }
        const rank = (name: string) => tiers.find((t) => t.name === name)?.r ?? -1;
        const order = group === 0 ? (a: string, b: string) => weaponRank(a) - weaponRank(b) : group === 1 ? (a: string, b: string) => rank(b) - rank(a) : (a: string, b: string) => a.localeCompare(b);
        // Rarest first for rarities; each group sorted by name.
        return [...by.entries()].sort(([a], [b]) => order(a, b)).map(([name, list]) => [name, list.sort((a, b) => a.n.localeCompare(b.n))] as const);
    }, [index, skins, query, weapon, rarity, group, tiers]);

    return (
        <div className="screen">
            <header>
                <Label>{skins ? `${skins.length} skins in the game` : 'Every skin in the game'}</Label>
                <h1 className="title">Catalog</h1>
            </header>
            {!index || !skins ? (
                <div className="minis">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} height={176} />
                    ))}
                </div>
            ) : (
                <>
                    <div className="toolbar">
                        <Field label="Search a skin or a line" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" spellCheck={false} maxLength={64} />
                        <Segmented label="Group by" items={GROUPS} selected={group} onSelect={setGroup} />
                    </div>
                    <div className="chips">
                        <Chip text="All weapons" on={weapon === null} onClick={() => setWeapon(null)} />
                        {weapons.map((w) => (
                            <Chip key={w} text={w} on={weapon === w} onClick={() => setWeapon(weapon === w ? null : w)} />
                        ))}
                    </div>
                    <div className="chips">
                        <Chip text="All rarities" on={rarity === null} onClick={() => setRarity(null)} />
                        {tiers.map((t) => (
                            <Chip key={t.id} text={t.name} on={rarity === t.id} dot={t.color} onClick={() => setRarity(rarity === t.id ? null : t.id)} />
                        ))}
                    </div>
                    {groups.length === 0 && <p className="empty-note dashed">No skin matches. Try another word or clear a filter.</p>}
                    {groups.map(([name, list]) => (
                        <section key={name} className="group">
                            <div className="group-head">
                                <h2 className="name">{name}</h2>
                                <Label>{list.length}</Label>
                            </div>
                            <div className="minis">
                                {list.map((s) => {
                                    const watched = wishlist.find((w) => sameName(w, s.n));
                                    return (
                                        <MiniCard
                                            key={s.l}
                                            name={s.n}
                                            icon={s.i}
                                            tier={index.tier(s.t)}
                                            action={watched ? 'remove' : 'add'}
                                            actionLabel={watched ? `Stop watching ${s.n}` : `Watch ${s.n}`}
                                            onAction={() => (watched ? onRemove(watched) : onAdd(s.n))}
                                            onOpen={() => onOpen(s)}
                                        />
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </>
            )}
        </div>
    );
}
