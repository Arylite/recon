import crypto from 'node:crypto';

// shortcut: the key is a plain sha256 of SECRET, not a KDF; use a long random SECRET.
const key = (secret: string) => crypto.createHash('sha256').update(secret).digest();

export function encrypt(text: string, secret: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(secret), iv);
  const data = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), data]).toString('base64');
}

export function decrypt(blob: string, secret: string): string {
  const buf = Buffer.from(blob, 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', key(secret), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
}
