/**
 * メーカー資料箱（ブックマークの 100 点の姿）の純粋ロジック。
 * 1 メーカー = 1 カードに「商品ページ／カタログ／営業所／お問い合わせ／サンプル／CAD」を束ねる。
 * 元データは建材ページと同じ src/data/makers.json。登録した時点のリンクを控えておき、
 * yaneyuka 側でリンクが更新されたら（メーカーがカタログの URL を変えた等）カードで知らせる。
 */

export type MakerLinks = { products: string; catalog: string; office: string; contact: string; sample: string; cad: string };
export type MakerRow = MakerLinks & { name: string; pages: string[]; group?: string };
export type MakerData = Record<string, MakerRow[]>;

export const BOX_SLOTS: Array<{ key: keyof MakerLinks; label: string }> = [
  { key: 'products', label: '商品ページ' },
  { key: 'catalog', label: 'カタログ' },
  { key: 'office', label: '営業所' },
  { key: 'contact', label: 'お問い合わせ' },
  { key: 'sample', label: 'サンプル' },
  { key: 'cad', label: 'CAD' },
];

export type MakerBoxItem = {
  id: string;
  name: string;
  categories: string[];
  links: MakerLinks;
  /** 自分で足したリンク（自社用に落としたカタログ PDF の置き場など） */
  extra?: Array<{ label: string; url: string }>;
  /** うちの標準仕様・品番・色などのメモ */
  note?: string;
  createdAt?: number;
  updatedAt?: number;
};

const usable = (u?: string) => !!u && u !== '#' && u.trim() !== '';

/** Firestore のドキュメント ID（/ は使えない） */
export const boxId = (name: string) => name.normalize('NFKC').trim().replace(/\//g, '／').slice(0, 200);

/** makers.json から 1 社ぶんをまとめる（分類ごとに行が分かれているので、空でないリンクを拾い集める） */
export function mergeMaker(data: MakerData, name: string): { name: string; categories: string[]; links: MakerLinks } | null {
  const links: MakerLinks = { products: '', catalog: '', office: '', contact: '', sample: '', cad: '' };
  const categories: string[] = [];
  let found = false;
  for (const [cat, rows] of Object.entries(data)) {
    for (const r of rows) {
      if (r.name !== name) continue;
      found = true;
      if (!categories.includes(cat)) categories.push(cat);
      for (const { key } of BOX_SLOTS) if (!usable(links[key]) && usable(r[key])) links[key] = r[key];
    }
  }
  return found ? { name, categories, links } : null;
}

const norm = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/株式会社|\(株\)|有限会社/g, '')
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/\s+/g, '');

/** 社名・分類・ページ名で探す（前方一致を先に） */
export function searchMakers(data: MakerData, q: string, limit = 20): Array<{ name: string; categories: string[] }> {
  const key = norm(q);
  if (!key) return [];
  const map = new Map<string, { name: string; categories: Set<string>; score: number }>();
  for (const [cat, rows] of Object.entries(data)) {
    for (const r of rows) {
      const n = norm(r.name);
      const inName = n.indexOf(key);
      const inPage = r.pages.some((p) => norm(p).includes(key)) || norm(cat).includes(key);
      if (inName < 0 && !inPage) continue;
      const score = inName === 0 ? 0 : inName > 0 ? 1 : 2;
      const cur = map.get(r.name) ?? { name: r.name, categories: new Set<string>(), score };
      cur.categories.add(cat);
      cur.score = Math.min(cur.score, score);
      map.set(r.name, cur);
    }
  }
  return [...map.values()]
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name, 'ja'))
    .slice(0, limit)
    .map((m) => ({ name: m.name, categories: [...m.categories] }));
}

/** 登録時のリンクと今の makers.json の差（yaneyuka 側で直したもの） */
export function linkChanges(saved: MakerLinks, current: MakerLinks): Array<{ key: keyof MakerLinks; label: string; from: string; to: string }> {
  const out: Array<{ key: keyof MakerLinks; label: string; from: string; to: string }> = [];
  for (const { key, label } of BOX_SLOTS) {
    const a = saved[key] ?? '';
    const b = current[key] ?? '';
    if (usable(b) && a !== b) out.push({ key, label, from: a, to: b });
  }
  return out;
}

/** 週次のリンク検査（broken-maker-links.json）で切れていれば、振り替え先（会社トップ）を返す */
export function fallbackFor(url: string, broken: Array<{ url: string; fallback?: string }>): string | null {
  const hit = broken.find((b) => b.url === url);
  return hit ? hit.fallback || '' : null;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/** メーカーのサイトと同じドメインのブックマーク（カードの下に「関連」として出す） */
export function relatedBookmarks<T extends { url: string }>(item: Pick<MakerBoxItem, 'links'>, bookmarks: T[]): T[] {
  const hosts = new Set(BOX_SLOTS.map(({ key }) => hostOf(item.links[key])).filter((h) => h && !/google\.com$|forms\.gle$/.test(h)));
  if (!hosts.size) return [];
  return bookmarks.filter((b) => hosts.has(hostOf(b.url)));
}
