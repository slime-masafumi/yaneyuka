'use client';

export function save(key: string, value: any, ttlMs?: number) {
  try {
    const payload = JSON.stringify({ v: 1, t: Date.now(), ttl: ttlMs || 0, d: value });
    localStorage.setItem(key, payload);
  } catch (err) {
    console.warn('[persist] localStorage書き込み失敗、cookieにフォールバック:', err);
    try {
      const expires = ttlMs ? `; max-age=${Math.floor(ttlMs / 1000)}` : '';
      document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(value))}${expires}; path=/`;
    } catch (err2) {
      console.warn('[persist] cookieフォールバックも失敗:', err2);
    }
  }
}

export function load<T = any>(key: string, def?: T): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const { t, ttl, d } = JSON.parse(raw);
      if (ttl && ttl > 0 && Date.now() - t > ttl) {
        try { localStorage.removeItem(key) } catch (err) { console.warn('[persist] 期限切れキー削除失敗:', err); }
        return def;
      }
      return d as T;
    }
  } catch (err) {
    console.warn('[persist] localStorage読み込み失敗:', err);
  }
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${encodeURIComponent(key)}=([^;]*)`));
    if (m) return JSON.parse(decodeURIComponent(m[1])) as T;
  } catch (err) {
    console.warn('[persist] cookie読み込み失敗:', err);
  }
  return def;
}
