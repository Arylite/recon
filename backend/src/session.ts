import * as jar from './cookies';

const secure = process.env.NODE_ENV === 'production';
/** `__Host-` pins the cookie to this exact host over https; it needs Secure, so not on plain http. */
export const COOKIE = secure ? '__Host-recon' : 'recon';
export const APP_TGT_MS = 90 * 24 * 3600 * 1000;
export const WEB_TGT_MS = 7 * 24 * 3600 * 1000;

/** The ticket-granting ticket of a browser, which only ever lives in an httpOnly cookie. */
export const readSession = (req: Request) => jar.parse(req.headers.get('cookie') ?? '')[COOKIE] ?? '';

export const sessionCookie = (tgt: string, maxAgeSec = WEB_TGT_MS / 1000) =>
  `${COOKIE}=${tgt}; Max-Age=${maxAgeSec}; Path=/; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`;
