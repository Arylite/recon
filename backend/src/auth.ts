import crypto from 'node:crypto';

const TICKET_MS = 3600 * 1000;
// OWASP 2023 figure for pbkdf2-sha256; about 0.1 s per login on a small server.
const ROUNDS = 310_000;

export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

/** Constant-time string comparison, whatever the lengths. */
export const safeEqual = (a: string, b: string) => crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(), crypto.createHash('sha256').update(b).digest());

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): string {
  return `${salt}:${crypto.pbkdf2Sync(password, salt, ROUNDS, 32, 'sha256').toString('hex')}`;
}

export function checkPassword(password: string, stored: string): boolean {
  const [salt = '', hash = ''] = stored.split(':');
  const got = Buffer.from(hashPassword(password, salt).split(':')[1] ?? '', 'hex');
  const want = Buffer.from(hash, 'hex');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

/** A ticket-granting ticket: long-lived, random, stored hashed so a leaked state cannot replay it. */
export function newTgt(ttlMs: number, now = Date.now()) {
  const tgt = crypto.randomBytes(32).toString('base64url');
  return { tgt, stored: { hash: sha256(tgt), exp: now + ttlMs } };
}

const sign = (body: string, secret: string) => crypto.createHmac('sha256', `ticket:${secret}`).update(body).digest('base64url');

/** A service ticket: short-lived and stateless, `userId.expiry.hmac`. */
export function issueTicket(userId: string, secret: string, now = Date.now()) {
  const exp = now + TICKET_MS;
  const body = `${userId}.${exp}`;
  return { ticket: `${body}.${sign(body, secret)}`, exp };
}

/** The user id of a valid, unexpired ticket, else null. */
export function readTicket(ticket: string, secret: string, now = Date.now()): string | null {
  const i = ticket.lastIndexOf('.');
  const body = ticket.slice(0, i);
  const got = Buffer.from(ticket.slice(i + 1));
  const want = Buffer.from(sign(body, secret));
  if (i < 0 || got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  const [id, exp] = body.split('.');
  return id && Number(exp) > now ? id : null;
}
