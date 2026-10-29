import { useEffect, useLayoutEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import type { Tier } from './api';
import { safeColor } from './api';

// The icons of the Android app (res/drawable), 24px grid, 2px round stroke.
const PATHS = {
  store: ['M4 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z', 'M14 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z', 'M4 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z', 'M14 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z'],
  catalog: ['M12 4l-8 4l8 4l8 -4l-8 -4', 'M4 12l8 4l8 -4', 'M4 16l8 4l8 -4'],
  wishlist: ['M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z'],
  accounts: ['M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0', 'M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2'],
  add: ['M12 5l0 14', 'M5 12l14 0'],
  remove: ['M18 6l-12 12', 'M6 6l12 12'],
  refresh: ['M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4', 'M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4'],
  search: ['M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0', 'M21 21l-6 -6'],
  arrow: ['M17 7l-10 10', 'M8 7l9 0l0 9'],
  play: ['M7 4v16l13 -8z'],
};
export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={name === 'play' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** The ping of the logo: an ember dot with a ring and an open ring. */
export function Logo({ size = 88 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 108 108" aria-hidden="true">
      <circle cx="54" cy="54" r="8" fill="#E8492F" />
      <circle cx="54" cy="54" r="17" fill="none" stroke="#F3F0EA" strokeWidth="5" />
      <path d="M25 54A29 29 0 1 1 54 83" fill="none" stroke="#F3F0EA" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** Sets a custom property through the CSSOM: a style attribute would be blocked by our CSP. */
export function useCssVar<T extends HTMLElement>(name: string, value: string) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => ref.current?.style.setProperty(name, value), [name, value]);
  return ref;
}
export const useTint = <T extends HTMLElement>(tier: Tier | undefined, hit = false) => useCssVar<T>('--tint', hit ? '#E8492F' : safeColor(tier?.color));

/** Small uppercase caption above a section or a value. */
export const Label = ({ children, className = '' }: { children: ReactNode; className?: string }) => <span className={`label ${className}`}>{children}</span>;

/** Pill text field; the placeholder doubles as its label. */
export function Field({ icon = 'search', label, className = '', ...rest }: { icon?: IconName | null; label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`field ${className}`}>
      {icon && <Icon name={icon} />}
      <input aria-label={label} placeholder={label} {...rest} />
    </label>
  );
}

/** The main action: a bone pill with its arrow in a separate circle. */
export function PillButton({ children, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`pillbtn ${className}`} {...rest}>
      <span className="pillbtn-text">{children}</span>
      <span className="pillbtn-dot">
        <Icon name="arrow" />
      </span>
    </button>
  );
}

/** One choice out of a few; scrolls sideways when long. */
export function Segmented({ items, selected, onSelect, label }: { items: string[]; selected: number; onSelect: (i: number) => void; label: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {items.map((text, i) => (
        <button key={text} role="radio" aria-checked={i === selected} onClick={() => onSelect(i)}>
          {text}
        </button>
      ))}
    </div>
  );
}

/** Round icon button on a raised disc. */
export const IconBtn = ({ icon, label, onClick, tone }: { icon: IconName; label: string; onClick: () => void; tone?: 'ember' }) => (
  <button className={`iconbtn${tone ? ` iconbtn-${tone}` : ''}`} aria-label={label} onClick={onClick}>
    <Icon name={icon} />
  </button>
);

/** Tier name after a short bar of its colour. */
export function TierTag({ tier }: { tier: Tier | undefined }) {
  const ref = useTint<HTMLSpanElement>(tier);
  return tier ? (
    <span ref={ref} className="tiertag">
      <i />
      <Label>{tier.name}</Label>
    </span>
  ) : null;
}

/** Ember pill, the loudest thing on screen: used only for a wishlist hit. */
export const HitTag = () => (
  <span className="hittag">
    <Icon name="wishlist" size={12} />
    ON YOUR WISHLIST
  </span>
);

/** A card-sized block that breathes while its content loads. */
export const Skeleton = ({ height }: { height: number }) => {
  const ref = useCssVar<HTMLDivElement>('--h', `${height}px`);
  return <div ref={ref} className="skeleton" aria-hidden="true" />;
};

/** Floats over the screen; an error reads for a few seconds and then gets out of the way. */
export function Banner({ text, error, onDismiss }: { text: string; error: boolean; onDismiss: () => void }) {
  const last = useRef('');
  if (text) last.current = text;
  useEffect(() => {
    if (!error || !text) return;
    const t = setTimeout(onDismiss, 4500);
    return () => clearTimeout(t);
  }, [text, error, onDismiss]);
  return (
    <button className={`banner${text ? ' banner-on' : ''}${error ? ' banner-error' : ''}`} onClick={onDismiss} aria-live="polite" tabIndex={text ? 0 : -1}>
      {last.current}
    </button>
  );
}
