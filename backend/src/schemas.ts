import { z } from 'zod';

const name = z.string().trim().min(1).max(64);

export const credentials = z.object({
  name: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,32}$/, '3 to 32 letters, digits or _'),
  password: z.string().regex(/^[0-9a-f]{64}$/), // a pbkdf2 hash from the client, never the password
});
export const accountBody = z.object({ name: name.optional(), cookies: z.string().max(8000).includes('ssid=') });
export const wishBody = z.object({ name });
export const alertsQuery = z.object({ since: z.coerce.number().int().min(0).default(0) });
