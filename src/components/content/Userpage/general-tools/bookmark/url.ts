/**
 * ブックマークの URL まわりの小さな道具。
 * 画面（Bookmark.tsx）と、リンク確認の API（/api/link-preview）の両方から使うので、
 * React に依存しない素の関数だけを置く。
 */

/**
 * スキームを省略して入力されたURL（例: example.com）は相対リンク扱いになり
 * サイト内に飛んでしまうため、https:// を補って正規化する。
 */
export const normalizeUrl = (url: string): string => {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed; // http: https: mailto: など
  return `https://${trimmed}`;
};

/** 同じページを指す URL の揺れのうち、中身が変わらない「おまけ」の引数 */
const TRACKING_PARAM = /^(utm_[a-z]+|fbclid|gclid|yclid|mc_eid|_ga)$/i;

/**
 * 重複判定用の URL。
 * 共有ボタンやメールから貼ると utm_* や fbclid が付き、末尾の / やページ内の # も揺れるので、
 * そのまま比べると同じページを何度も登録してしまう。
 * スキーム（http / https）と先頭の www. も同じページとして扱う。
 * 読めない文字列は、前後の空白を落として小文字にしたものを返す。
 */
export const canonicalUrl = (raw: string): string => {
  const url = normalizeUrl(raw);
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return url.toLowerCase();
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const port = u.port && u.port !== '80' && u.port !== '443' ? `:${u.port}` : '';
    const params = [...u.searchParams.entries()]
      .filter(([k]) => !TRACKING_PARAM.test(k))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    const path = u.pathname.replace(/\/+$/, '');
    return `${host}${port}${path}${params.length ? `?${params.join('&')}` : ''}`;
  } catch {
    return url.trim().toLowerCase();
  }
};

/** 表示用のホスト名（www. を落とす） */
export const hostLabel = (raw: string): string => {
  try {
    return new URL(normalizeUrl(raw)).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

/** ファビコン。Google の公開エンドポイント（sz=64 はサイズ） */
export const getFaviconUrl = (raw: string): string | null => {
  try {
    if (!raw) return null;
    const domain = new URL(normalizeUrl(raw)).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
};

/** URL として読めそうか（自動取得を走らせるかの判断。途中まで打った「exa」で問い合わせない） */
export const looksLikeUrl = (raw: string): boolean => {
  try {
    const u = new URL(normalizeUrl(raw));
    return (u.protocol === 'https:' || u.protocol === 'http:') && /\.[a-z0-9-]{2,}$/i.test(u.hostname);
  } catch {
    return false;
  }
};
