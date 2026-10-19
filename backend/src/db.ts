import fs from 'node:fs';
import path from 'node:path';
import type { Db, State } from './types.js';

// shortcut: one JSON file rewritten on every change, fine for a few accounts, move to sqlite beyond.
export function openDb(dir: string): Db {
  const file = path.join(dir, 'state.json');
  fs.mkdirSync(dir, { recursive: true });
  const state: State = fs.existsSync(file)
    ? (JSON.parse(fs.readFileSync(file, 'utf8')) as State)
    : { accounts: [], wishlist: [], alerts: [], lastAlertId: 0 };
  const save = () => {
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(state));
    fs.renameSync(`${file}.tmp`, file);
  };
  return { state, save };
}
