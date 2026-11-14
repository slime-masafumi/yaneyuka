/**
 * 一覧(NEWS・新製品・イベント)に出す写真のうち、記事ごとの写真ではないものを見分ける。2026-11-14
 *
 *   - サイト共通のロゴ(og:image がロゴのサイトがある。housenews の rogo1.jpg など)
 *   - WordPress の絵文字画像(s.w.org/images/core/emoji/…)
 *   - 同じ一覧で 2 件以上の別の記事が同じ画像を使っている(= 記事の写真ではなくサイトの既定画像)
 *
 * 見分けた画像は出さず、表紙(FeedPic の cover)に回す。貯めてある記事にも効くよう、表示の直前で判定する。
 */
const NOT_PHOTO = /(?:\/emoji\/|(?:^|[/_.-])(?:logo|rogo)[^/]*\.(?:jpe?g|png|gif|webp)(?:$|\?))/i;

export function isNotPhoto(url?: string): boolean {
  if (!url) return true;
  try {
    const u = new URL(url, 'https://example.invalid');
    return u.hostname === 's.w.org' || NOT_PHOTO.test(u.pathname);
  } catch {
    return true;
  }
}

/** 一覧の中で記事の写真として使える画像だけを返す関数を作る */
export function photoPicker<T extends { image?: string; link?: string }>(items: T[]): (item: T) => string | undefined {
  const links = new Map<string, Set<string>>();
  for (const it of items) {
    if (!it.image) continue;
    const s = links.get(it.image) ?? new Set<string>();
    s.add(it.link || String(links.size));
    links.set(it.image, s);
  }
  return (it) => (it.image && !isNotPhoto(it.image) && (links.get(it.image)?.size ?? 0) < 2 ? it.image : undefined);
}
