import type { Db, State } from './types.js';

// shortcut: the whole state is one value rewritten on every change, fine for a few accounts.
export function openDb(saved: State | undefined, persist: (s: State) => void): Db {
  const state: State = saved ?? { users: [] };
  return { state, save: () => persist(state) };
}
