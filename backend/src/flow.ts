import crypto from 'node:crypto';
import { checkPassword, hashPassword } from './auth';
import { ApiError, clientIp, limiter } from './guard';
import type { Deps } from './services';
import type { User } from './types';

// A hash to check when the name is unknown, so that answer takes as long as a wrong password.
let decoy: string | undefined;

/** Creates the user and returns a ticket-granting ticket. */
export async function signUp({ db, kv, registration }: Deps, req: Request, name: string, password: string, ttl: number) {
  if (!registration) throw new ApiError(403, 'sign-ups are closed');
  await limiter(kv)(`reg:${clientIp(req)}`, 5, 3600);
  const user: User = { id: crypto.randomUUID().slice(0, 8), name, password: hashPassword(password), tgts: [], accounts: [], wishlist: [], alerts: [], lastAlertId: 0 };
  if (!(await db.create(user))) throw new ApiError(409, 'this name is taken');
  return db.grant(user.id, ttl);
}

export async function signIn({ db, kv }: Deps, req: Request, name: string, password: string, ttl: number) {
  // Guessing is slowed per address and per name: one address cannot lock a name for long, and a
  // botnet cannot try more than a few hundred passwords an hour on it.
  const limit = limiter(kv);
  await limit(`login:ip:${clientIp(req)}`, 30, 900);
  await limit(`login:name:${name}`, 20, 900);
  const user = await db.byName(name);
  decoy ??= hashPassword('0'.repeat(64));
  const ok = checkPassword(password, user?.password ?? decoy);
  if (!user || !ok) throw new ApiError(401, 'wrong name or password');
  return db.grant(user.id, ttl);
}
