import https from 'node:https';
import type { IncomingHttpHeaders } from 'node:http';

export interface HttpResponse {
  status: number;
  headers: IncomingHttpHeaders;
  text: string;
}

export interface HttpOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

// shortcut: Riot's edge filters on the TLS client hello; this TLS 1.2 list is copied from known
// working clients and not validated here, adjust it if auth answers 403.
const CIPHERS = [
  'ECDHE-ECDSA-CHACHA20-POLY1305',
  'ECDHE-RSA-CHACHA20-POLY1305',
  'ECDHE-ECDSA-AES128-GCM-SHA256',
  'ECDHE-RSA-AES128-GCM-SHA256',
  'ECDHE-ECDSA-AES256-GCM-SHA384',
  'ECDHE-RSA-AES256-GCM-SHA384',
].join(':');

// Never follows redirects: the Riot auth flow reads the Location header itself.
export function request(url: string, { method = 'GET', headers = {}, body }: HttpOptions = {}): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const h = body ? { ...headers, 'Content-Length': String(Buffer.byteLength(body)) } : headers;
    const req = https.request(url, { method, headers: h, ciphers: CIPHERS, timeout: 15000 }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () =>
        resolve({ status: res.statusCode ?? 0, headers: res.headers, text: Buffer.concat(chunks).toString('utf8') }),
      );
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('request timeout')));
    req.end(body);
  });
}

/**
 * For hosts that do not care about the TLS fingerprint (valorant-api.com): the platform's own fetch.
 * Some connections from serverless networks time out at random, so it tries again.
 */
export async function plain(url: string, tries = 3): Promise<{ status: number; text: string }> {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      return { status: r.status, text: await r.text() };
    } catch (e) {
      if (i >= tries) throw e;
    }
  }
}
