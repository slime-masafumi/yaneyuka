/**
 * /lookup/ 逆引き索引のデータアクセス。
 *
 * 元データは 共有/カルテ機能/yaneyuka_建築調べもの項目リスト_v1.md。
 * 共有/ は本番に配信されないので、scripts/build-lookup-items.mjs で
 * src/data/lookup/items.json に変換したものを読む。MD を直したら
 *
 *   node scripts/build-lookup-items.mjs
 *
 * を再実行して JSON を更新すること。
 */
import data from '@/data/lookup/items.json';

export type LookupFormat = '計算' | '判定' | '早見' | '選定' | '解説';

export type LookupItem = {
  /** 例: "1-8-01"。ページ内アンカーにも使う */
  id: string;
  title: string;
  /** 根拠条文の略記 */
  basis: string;
  /** ★の数（1〜3） */
  priority: number;
  format: LookupFormat;
};

export type LookupSection = {
  /** 例: "1-8" */
  id: string;
  title: string;
  items: LookupItem[];
};

export type LookupCategory = {
  /** URL セグメント: design / structure / mep / electrical */
  slug: string;
  label: string;
  short: string;
  sections: LookupSection[];
};

export const LOOKUP_CATEGORIES: LookupCategory[] = data.categories as LookupCategory[];
export const LOOKUP_TOTAL: number = data.total;

export function getLookupCategory(slug: string): LookupCategory | undefined {
  return LOOKUP_CATEGORIES.find((c) => c.slug === slug);
}

export function countItems(category: LookupCategory): number {
  return category.sections.reduce((n, s) => n + s.items.length, 0);
}

export const FORMAT_HELP: Record<LookupFormat, string> = {
  計算: '入力→数値出力のツール',
  判定: '適否の YES / NO',
  早見: '表を引くだけ',
  選定: '比較表＋フローチャート',
  解説: '記事のみ',
};

/**
 * 既にツール化されている項目 → 遷移先。
 * ツールを 1 本公開するたびにここへ 1 行足せば、索引ページのリンクが差し替わる。
 * key は items.json の item.id。
 */
export const LOOKUP_TOOL_LINKS: Record<string, { href: string; label: string }> = {
  '1-8-01': { href: '/calc/glass-thickness/', label: '計算ツール' },
  '1-8-02': { href: '/calc/glass-thickness/#wind', label: '簡易算定' },
  '1-8-04': { href: '/calc/glass-thickness/', label: '計算ツール' },
  '1-11-01': { href: '/karte/?open=pipe', label: '物件カルテ内' },
  '1-11-04': { href: '/karte/?open=pipe', label: '物件カルテ内' },
  '3-7-02': { href: '/karte/?open=pipe', label: '物件カルテ内' },
};

/** 索引ページの並び。カルテの分野タブと同じ順 */
export const LOOKUP_ORDER = ['design', 'structure', 'mep', 'electrical'] as const;
