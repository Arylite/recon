import type { Offer } from '../types';
import { safeArt, type Tier } from './api';
import { HitTag, Icon, Label, TierTag, useTint } from './bits';

/**
 * A store offer, flat and clean: the skin on its plate with its rarity, the name and price below with
 * the round arrow. A wishlist hit only changes colours, never a size, so nothing around it moves.
 */
export function ProductCard({ offer, tier, hit, onOpen }: { offer: Offer; tier: Tier | undefined; hit: boolean; onOpen?: () => void }) {
    const ref = useTint<HTMLElement>(tier);
    const art = safeArt(offer.icon);
    return (
        <article ref={ref} className={`product${hit ? ' product-hit' : ''}`}>
            {onOpen && <button className="tile-hit" aria-label={`Open ${offer.name}`} onClick={onOpen} />}
            <div className="plate">
                <TierTag tier={tier} />
                {art && <img src={art} alt="" referrerPolicy="no-referrer" />}
            </div>
            <div className="product-bottom">
                <div>
                    <h3>{offer.name}</h3>
                    <p className="price">
                        {offer.cost === null ? '-' : offer.cost.toLocaleString('en-US')}
                        <small>VP</small>
                    </p>
                </div>
                <span className="product-end">
                    {hit ? (
                        <HitTag />
                    ) : (
                        <span className="go">
                            <Icon name="arrow" size={18} />
                        </span>
                    )}
                </span>
            </div>
        </article>
    );
}

/**
 * Small tile for search results and the watch list. With `onOpen` the tile opens the skin and the
 * round button acts; without it the whole tile is the action.
 */
export function MiniCard(props: { name: string; icon: string | null; tier: Tier | undefined; action: 'add' | 'remove'; actionLabel: string; onAction: () => void; onOpen?: () => void }) {
    const { name, icon, tier, action, actionLabel, onAction, onOpen } = props;
    const ref = useTint<HTMLElement>(tier);
    const art = safeArt(icon);
    return (
        <article ref={ref} className="mini">
            <button className="tile-hit" aria-label={onOpen ? `Open ${name}` : actionLabel} onClick={onOpen ?? onAction} />
            {art ? <img className="mini-art" src={art} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <Label className="mini-loose">Any skin containing</Label>}
            {tier && <i className="tierdot" />}
            <div className="mini-bottom">
                <h3>{name}</h3>
                <span className={`mini-action${onOpen ? ' mini-action-big' : ''}`}>
                    {onOpen ? (
                        <button aria-label={actionLabel} onClick={onAction}>
                            <Icon name={action} size={16} />
                        </button>
                    ) : (
                        <Icon name={action} size={16} />
                    )}
                </span>
            </div>
        </article>
    );
}
