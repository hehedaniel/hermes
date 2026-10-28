/** Base64 ↔ bytes sin depender de atob/btoa (Hermes, navegador y Node). */
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesABase64(b: Uint8Array): string {
  let o = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    o += ABC[(n >> 18) & 63] + ABC[(n >> 12) & 63];
    o += i + 1 < b.length ? ABC[(n >> 6) & 63] : '=';
    o += i + 2 < b.length ? ABC[n & 63] : '=';
  }
  return o;
}

export function base64ABytes(s: string): Uint8Array {
  const limpio = s.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((limpio.length * 3) / 4));
  let k = 0;
  for (let i = 0; i < limpio.length; i += 4) {
    const a = ABC.indexOf(limpio[i]);
    const b = ABC.indexOf(limpio[i + 1]);
    const c = i + 2 < limpio.length ? ABC.indexOf(limpio[i + 2]) : -1;
    const d = i + 3 < limpio.length ? ABC.indexOf(limpio[i + 3]) : -1;
    out[k++] = (a << 2) | (b >> 4);
    if (c >= 0) out[k++] = ((b & 15) << 4) | (c >> 2);
    if (d >= 0) out[k++] = ((c & 3) << 6) | d;
  }
  return out.subarray(0, k);
}
