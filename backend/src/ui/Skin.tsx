'use client';
import { useEffect, useState } from 'react';
import { api, safeArt, type Skin, type SkinDetail, type Tier } from './api';
import { Icon, PillButton, Skeleton, TierTag, useTint } from './bits';
import { Sheet } from './Sheet';

/** One skin up close: its colour variants and what each upgrade level adds, with the videos. */
export function SkinSheet({ skin, tier, watched, onToggle, onClose }: { skin: Skin; tier: Tier | undefined; watched: boolean; onToggle: () => void; onClose: () => void }) {
  const [detail, setDetail] = useState<SkinDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [variant, setVariant] = useState(0);
  const ref = useTint<HTMLDivElement>(tier);

  useEffect(() => {
    let alive = true;
    api<SkinDetail>(`/skins/${skin.u}`).then(
      (d) => alive && setDetail(d),
      () => alive && setFailed(true),
    );
    return () => void (alive = false);
  }, [skin.u]);

  const render = safeArt(detail?.variants[variant]?.render ?? null) ?? safeArt(skin.i);
  return (
    <Sheet caption={[skin.w, skin.s].filter(Boolean).join('  /  ')} onClose={onClose}>
      <h1 className="title">{skin.n}</h1>
      <TierTag tier={tier} />
      <div ref={ref} className="hero">
        {/* Keyed so a new variant fades in instead of popping. */}
        {render && <img key={render} className="fade" src={render} alt={skin.n} referrerPolicy="no-referrer" />}
      </div>
      <PillButton onClick={onToggle}>{watched ? 'Remove from wishlist' : 'Add to wishlist'}</PillButton>
      {failed && <p className="body ember">Couldn&apos;t load the variants. Check your connection.</p>}
      {!detail && !failed && (
        <>
          <Skeleton height={56} />
          <Skeleton height={56} />
        </>
      )}
      {detail && detail.variants.length > 1 && (
        <section className="stack">
          <span className="label">Variants</span>
          <div className="chips" role="radiogroup" aria-label="Variants">
            {detail.variants.map((v, i) => {
              const swatch = safeArt(v.swatch ?? v.render);
              return (
                <button key={`${v.name}${i}`} className="variant" role="radio" aria-checked={i === variant} onClick={() => setVariant(i)}>
                  <span className="variant-swatch">{swatch && <img src={swatch} alt="" loading="lazy" referrerPolicy="no-referrer" />}</span>
                  <span className="label">{v.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
      {detail && detail.levels.length > 1 && (
        <section className="stack">
          <span className="label">Levels</span>
          <ul className="levels">
            {detail.levels.map((l, i) => (
              <li key={`${l.name}${i}`}>
                <span className="skin-line">Level {i + 1}</span>
                <span className="body mute">{l.name}</span>
                {l.video && (
                  <a className="iconbtn" href={l.video} target="_blank" rel="noopener noreferrer" aria-label={`Play level ${i + 1}`}>
                    <Icon name="play" size={16} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </Sheet>
  );
}
