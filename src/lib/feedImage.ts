/**
 * NEWS などの一覧に出す「記事の写真」を拾う。サーバー側(API ルート)専用。
 *
 *   1. RSS の項目そのものに画像があればそれ(enclosure / media:content / media:thumbnail / 本文の最初の <img>)
 *   2. 無ければ記事ページの og:image / twitter:image
 *
 * 画像は相手のサーバーから直接表示する(リンクカードと同じ扱い)。保存・加工はしない。
 * 取れなかった記事は写真なしで出す(一覧は写真が無くても成り立つ組み方にしてある)。
 */

function decodeEntities(v: string): string {
  return v
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** 相対パスを絶対化し、http は https に寄せる(混在コンテンツで表示されないため)。使えないものは '' */
export function normalizeImageUrl(value: string | undefined, base?: string): string {
  if (!value) return '';
  try {
    const u = new URL(decodeEntities(value.trim()), base);
    if (u.protocol === 'http:') u.protocol = 'https:';
    if (u.protocol !== 'https:') return '';
    // 1px の計測画像・アイコン類は写真として使わない
    if (/(spacer|pixel|blank|1x1|favicon|logo|icon)[^/]*\.(gif|png|svg|ico)$/i.test(u.pathname)) return '';
    if (/\.(svg|ico)$/i.test(u.pathname)) return '';
    return u.toString();
  } catch {
    return '';
  }
}

/** RSS / Atom の 1 項目(生の XML 断片)から画像 URL を拾う。無ければ '' */
export function imageFromFeedItem(raw: string, base?: string): string {
  const s = decodeEntities(raw.replace(/<!\[CDATA\[|\]\]>/g, ''));
  const pick = (re: RegExp) => {
    const m = s.match(re);
    return m?.[1] ? normalizeImageUrl(m[1], base) : '';
  };
  return (
    pick(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image/i) ||
    pick(/<enclosure[^>]*type=["']image[^"']*["'][^>]*url=["']([^"']+)["']/i) ||
    pick(/<media:content[^>]*url=["']([^"']+)["'][^>]*(?:medium=["']image["']|type=["']image)/i) ||
    pick(/<media:thumbnail[^>]*url=["']([^"']+)["']/i) ||
    pick(/<img[^>]+src=["']([^"']+)["']/i)
  );
}

/** 記事ページの先頭だけ読んで og:image / twitter:image を返す。取れなければ '' */
export async function fetchOgImage(url: string, timeoutMs = 4000): Promise<string> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: ac.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en;q=0.5',
      },
    });
    if (!res.ok || !(res.headers.get('content-type') || '').includes('html')) return '';
    // og タグは <head> にあるので先頭だけで足りる。巨大なページを全部読まない
    const reader = res.body?.getReader();
    let html = '';
    if (reader) {
      const dec = new TextDecoder();
      while (html.length < 120_000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += dec.decode(value, { stream: true });
        if (/<\/head>/i.test(html)) break;
      }
      reader.cancel().catch(() => {});
    } else {
      html = (await res.text()).slice(0, 120_000);
    }
    const meta = (key: string) =>
      html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`, 'i'))?.[1] ||
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`, 'i'))?.[1] ||
      '';
    const finalUrl = res.url || url;
    return (
      normalizeImageUrl(meta('og:image(?::secure_url|:url)?'), finalUrl) ||
      normalizeImageUrl(meta('twitter:image(?::src)?'), finalUrl)
    );
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 複数の記事に写真を埋める。持ち時間(budgetMs)を過ぎたら待たずに返す。
 * 間に合わなかった分も裏で取り続け、cache に入るので次の集計(5 分後)で出る。
 */
export async function fillImages<T extends { link: string; image?: string }>(
  items: T[],
  cache: Map<string, string>,
  { budgetMs = 4500, parallel = 8, skip }: { budgetMs?: number; parallel?: number; skip?: (link: string) => boolean } = {}
): Promise<void> {
  for (const it of items) {
    if (!it.image && cache.has(it.link)) it.image = cache.get(it.link) || undefined;
  }
  const todo = items.filter((it) => !it.image && !cache.has(it.link) && !(skip && skip(it.link)));
  if (!todo.length) return;
  let idx = 0;
  const worker = async () => {
    while (idx < todo.length) {
      const it = todo[idx++];
      const img = await fetchOgImage(it.link);
      cache.set(it.link, img);
      if (img) it.image = img;
    }
  };
  const all = Promise.all(Array.from({ length: Math.min(parallel, todo.length) }, worker));
  await Promise.race([all, new Promise((r) => setTimeout(r, budgetMs))]);
  // 古いものから捨てて、覚えておく数に上限を置く
  if (cache.size > 600) {
    for (const k of Array.from(cache.keys()).slice(0, cache.size - 600)) cache.delete(k);
  }
}
