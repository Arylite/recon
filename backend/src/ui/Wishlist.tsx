'use client';
import { useState } from 'react';
import { Field, IconBtn, Label } from './bits';
import { MiniCard } from './cards';
import { EmptyState } from './Empty';
import { LINES, sameName, type Index } from './data';

export function Wishlist({ wishlist, index, onAdd, onRemove }: { wishlist: string[]; index: Index | null; onAdd: (n: string) => void; onRemove: (n: string) => void }) {
    const [query, setQuery] = useState('');
    const results = (index?.search(query) ?? []).filter((r) => !wishlist.some((w) => sameName(w, r.n)));
    const quick = LINES.filter((l) => !wishlist.some((w) => sameName(w, l)));
    const add = (name: string) => {
        onAdd(name);
        setQuery('');
    };

    return (
        <div className="screen">
            <header>
                <Label>Pinged when it shows up</Label>
                <h1 className="title">Wishlist</h1>
            </header>
            {/* Search on the left, the quick lines beside it on a wide screen; stacked on a phone. */}
            <div className="wish-bar">
                <div className="stack">
                    <Field label="Search a skin or a line" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" spellCheck={false} maxLength={64} />
                    {query.trim() && (
                        // Matching is a substring test, so a loose word watches a whole line of skins.
                        <div className="loose">
                            <p className="body mute">Any skin containing &quot;{query.trim()}&quot;</p>
                            <IconBtn icon="add" label={`Watch any skin containing ${query.trim()}`} onClick={() => add(query.trim())} />
                        </div>
                    )}
                </div>
                {!query.trim() && quick.length > 0 && (
                    <section className="stack">
                        <Label>Quick add a whole line</Label>
                        <div className="chips chips-wrap">
                            {quick.map((l) => (
                                <button key={l} className="chip chip-quick" onClick={() => add(l)}>
                                    + {l}
                                </button>
                            ))}
                        </div>
                    </section>
                )}
            </div>
            {results.length > 0 && (
                <section className="stack">
                    <Label>Results ({results.length})</Label>
                    <div className="minis">
                        {results.map((s) => (
                            <MiniCard key={s.l} name={s.n} icon={s.i} tier={index?.tierOf(s)} action="add" actionLabel={`Watch ${s.n}`} onAction={() => add(s.n)} />
                        ))}
                    </div>
                </section>
            )}
            <section className="stack">
                <Label>Watching ({wishlist.length})</Label>
                {wishlist.length === 0 && (
                    <EmptyState icon="wishlist" title="Nothing watched yet" text="Search a skin above, or add a whole line with one tap. You get a notification the day one is in your store." />
                )}
                <div className="minis">
                    {wishlist.map((w) => {
                        const skin = index?.skin(w);
                        return <MiniCard key={w} name={w} icon={skin?.i ?? null} tier={index?.tierOf(skin)} action="remove" actionLabel={`Stop watching ${w}`} onAction={() => onRemove(w)} />;
                    })}
                </div>
            </section>
        </div>
    );
}
