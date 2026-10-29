import type { Kv } from './kv';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const bearer = (h: string | null | undefined) => h?.match(/^Bearer (.+)$/)?.[1] ?? '';

/** Vercel sets these itself and drops any value the client sent, so they cannot be spoofed there. */
export const clientIp = (req: Request) =>
  req.headers.get('x-vercel-forwarded-for') ?? req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';

/** Throws a 429 once `key` was hit more than `max` times within the window. */
export const limiter = (kv: Kv) => async (key: string, max: number, windowSec: number) => {
  if ((await kv.hit(`rl:${key}`, windowSec)) > max) throw new ApiError(429, 'too many attempts, try again later');
};

/**
 * CSRF check for browser calls that carry the session cookie: the Origin must be this very host
 * (a cross-site page cannot forge it) and the request must carry a header only our script sets.
 */
export function sameOrigin(req: Request): boolean {
  try {
    const origin = req.headers.get('Origin');
    return !!origin && new URL(origin).host === req.headers.get('Host') && req.headers.get('X-Requested-With') === 'recon';
  } catch {
    return false;
  }
}
