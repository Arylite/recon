import { useLayoutEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type IconName = 'store' | 'heart' | 'tune' | 'arrow' | 'trash' | 'x' | 'plus';
const PATHS: Record<IconName, string[]> = {
  store: ['M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304z', 'M9 11v-5a3 3 0 0 1 6 0v5'],
  heart: ['M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572'],
  tune: ['M4 10a2 2 0 1 0 4 0a2 2 0 0 0 -4 0', 'M6 4v4', 'M6 12v8', 'M10 16a2 2 0 1 0 4 0a2 2 0 0 0 -4 0', 'M12 4v10', 'M12 18v2', 'M16 7a2 2 0 1 0 4 0a2 2 0 0 0 -4 0', 'M18 4v1', 'M18 9v11'],
  arrow: ['M17 7l-10 10', 'M8 7l9 0l0 9'],
  trash: ['M4 7l16 0', 'M10 11l0 6', 'M14 11l0 6', 'M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12', 'M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3'],
  x: ['M18 6l-12 12', 'M6 6l12 12'],
  plus: ['M12 5l0 14', 'M5 12l14 0'],
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** The pill button with its arrow in a separate circle. */
export function Pill({ children, busy, ...rest }: { children: ReactNode; busy?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="pill" {...rest} disabled={rest.disabled || busy} aria-busy={busy}>
      <span>{busy ? 'Please wait' : children}</span>
      <span className="pill-dot">
        <Icon name="arrow" size={18} />
      </span>
    </button>
  );
}

/** Sets a custom property through the CSSOM: a style attribute would be blocked by our CSP. */
export function useCssVar<T extends HTMLElement>(name: string, value: string) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => ref.current?.style.setProperty(name, value), [name, value]);
  return ref;
}

export function Message({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'note' }) {
  return (
    <p className={`msg msg-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}
