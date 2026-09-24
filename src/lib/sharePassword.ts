/**
 * ファイル転送の合言葉（パスワード）。
 * 作る側（ブラウザ）が PBKDF2 でハッシュにして uploads/{fileId}（本人しか読めない）に置き、
 * 受け取る側が入れた合言葉はサーバー（/api/share/download）が同じ計算で照らし合わせる。
 * 合言葉そのものはどこにも保存しない。
 */

export const PBKDF2_ITER = 120_000;

const toB64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const fromB64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iter: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: iter }, key, 256);
  return toB64(bits);
}

export type SharePasswordHash = { passwordHash: string; passwordSalt: string; passwordIter: number };

export async function hashSharePassword(password: string): Promise<SharePasswordHash> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { passwordHash: await derive(password, salt, PBKDF2_ITER), passwordSalt: toB64(salt), passwordIter: PBKDF2_ITER };
}

/** 照合（サーバー・テスト用。Node 18+ の Web Crypto で動く）。長さの違いで早抜けしないよう全文字比べる */
export async function verifySharePassword(password: string, h: SharePasswordHash): Promise<boolean> {
  const got = await derive(password, fromB64(h.passwordSalt), h.passwordIter);
  if (got.length !== h.passwordHash.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ h.passwordHash.charCodeAt(i);
  return diff === 0;
}
