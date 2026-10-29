import { useEffect, useRef, useState } from 'react';
import type { Alert } from './api';

const KEY = 'recon.notify';
const read = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};
const write = (on: boolean) => {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // private mode: the choice just lasts until the page closes
  }
};

export interface Notifier {
  supported: boolean;
  on: boolean;
  denied: boolean;
  toggle: () => Promise<void>;
}

/** Browser notifications for new alerts while the page is open (the phone app covers the rest). */
export function useNotifier(alerts: Alert[] | null): Notifier {
  const supported = typeof Notification !== 'undefined';
  const [on, setOn] = useState(false);
  // The alerts already there when the page opened must not pop up again.
  const seen = useRef<number | null>(null);

  useEffect(() => setOn(supported && Notification.permission === 'granted' && read()), [supported]);
  useEffect(() => {
    if (!alerts) return;
    const before = seen.current;
    seen.current = Math.max(before ?? 0, ...alerts.map((a) => a.id));
    if (before === null || !on) return;
    for (const a of alerts.filter((x) => x.id > before)) new Notification(a.skin, { body: `In the store of ${a.account}`, icon: '/icon.svg', tag: `recon-${a.id}` });
  }, [alerts, on]);

  return {
    supported,
    on,
    denied: supported && Notification.permission === 'denied',
    async toggle() {
      if (on) return (setOn(false), write(false));
      if ((await Notification.requestPermission()) === 'granted') (setOn(true), write(true));
    },
  };
}
