export type Jar = Record<string, string>;

const split = (pair: string): [string, string] | null => {
  const i = pair.indexOf('=');
  return i > 0 ? [pair.slice(0, i).trim(), pair.slice(i + 1).trim()] : null;
};

export function parse(str: string): Jar {
  const jar: Jar = {};
  for (const part of str.split(';')) {
    const kv = split(part);
    if (kv) jar[kv[0]] = kv[1];
  }
  return jar;
}

export const serialize = (jar: Jar): string =>
  Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

/** Applies Set-Cookie headers to the jar; an empty value means the server deleted the cookie. */
export function merge(jar: Jar, setCookie: string[] = []): Jar {
  for (const c of setCookie) {
    const kv = split(c.split(';')[0] ?? '');
    if (!kv) continue;
    if (kv[1]) jar[kv[0]] = kv[1];
    else delete jar[kv[0]];
  }
  return jar;
}
