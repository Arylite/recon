'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { IconBtn, Label } from './bits';

/** A screen that slides over the app (a skin, the Riot sign-in): Escape closes it, focus returns after. */
export function Sheet({ caption, onClose, children }: { caption: string; onClose: () => void; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    root.current?.focus();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', key);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = '';
      before?.focus?.();
    };
  }, [onClose]);

  return (
    <div ref={root} className="sheet" role="dialog" aria-modal="true" aria-label={caption} tabIndex={-1}>
      <div className="sheet-body">
        <div className="sheet-top">
          <Label>{caption}</Label>
          <IconBtn icon="remove" label="Close" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}
