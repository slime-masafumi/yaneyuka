import { MetadataRoute } from 'next'
import { allLegalPaths } from '@/lib/legalPages'
import { LOOKUP_ORDER } from '@/lib/lookup'

type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

interface SitemapEntry {
  path: string;
  changeFrequency: ChangeFreq;
  priority: number;
}

// next.config.js の trailingSlash: true により、末尾スラッシュ無しの URL は 308 で
// リダイレクトされる。sitemap には最終形（スラッシュ付き）を載せる。
const withSlash = (p: string) => (p.endsWith('/') ? p : `${p}/`);

// 安定コンテンツの更新日。内容を改訂したらこの定数を更新する。
const STABLE_LAST_MODIFIED = new Date('2026-08-02');
// 頻繁に中身が変わるページはビルド日を使う。
const BUILD_TIME = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://yaneyuka.com'

  // トップページ
  const top: SitemapEntry[] = [
    { path: '/', changeFrequency: 'daily', priority: 1.0 },
  ];

  // 更新頻度の高いコンテンツ
  const frequent: SitemapEntry[] = [
    { path: '/news', changeFrequency: 'daily', priority: 0.9 },
    { path: '/event', changeFrequency: 'daily', priority: 0.8 },
    { path: '/new-products', changeFrequency: 'daily', priority: 0.8 },
    { path: '/pickup', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/forum', changeFrequency: 'daily', priority: 0.7 },
    { path: '/job-info', changeFrequency: 'weekly', priority: 0.7 },
  ];

  // 中程度の更新頻度
  const moderate: SitemapEntry[] = [
    { path: '/books-software', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/regulations', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/qualifications', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/landscape-cad', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/shop', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/projects', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/competitions', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/construction-companies', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/design-offices', changeFrequency: 'monthly', priority: 0.5 },
  ];

  // 建材カテゴリ（安定コンテンツ）
  const materials: SitemapEntry[] = [
    { path: '/roof', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/exterior-wall', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/opening', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/external-floor', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/exterior-other', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/internal-floor', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/internal-wall', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/internal-ceiling', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/internal-other', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/waterproof', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/hardware', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/furniture', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/electrical-systems', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/mechanical-systems', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/exterior-infrastructure', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/exterior', changeFrequency: 'monthly', priority: 0.5 },
  ];

  // 建築の調べもの（逆引き索引・計算ツール・物件カルテ）。
  // 索引ページは検索流入の受け皿なので優先度を高めに置く。カルテは端末内アプリなので低め。
  const lookup: SitemapEntry[] = [
    { path: '/lookup', changeFrequency: 'monthly', priority: 0.8 },
    ...LOOKUP_ORDER.map((slug) => ({ path: `/lookup/${slug}`, changeFrequency: 'monthly' as ChangeFreq, priority: 0.7 })),
    { path: '/calc', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/calc/glass-thickness', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/karte', changeFrequency: 'monthly', priority: 0.4 },
  ];

  // iOS アプリの法的文書 + 全アプリ共通サポート。
  // App Store のメタデータから参照されるので、インデックスされている必要がある。
  // 一覧は src/lib/legalPages.ts が唯一の定義。新規アプリ追加時はそちらに 1 行足せば、
  // 右カラムのリンク一覧・その表示判定・この sitemap の 3 つすべてに反映される。
  const legal: SitemapEntry[] = allLegalPaths().map((path) => ({
    path,
    changeFrequency: 'yearly' as ChangeFreq,
    priority: 0.3,
  }));

  // /userpage は robots.txt で Disallow しているため sitemap にも載せない。

  const frequentPaths = new Set<string>([...frequent.map((e) => e.path), '/']);
  const allEntries = [...top, ...frequent, ...moderate, ...materials, ...lookup, ...legal];

  return allEntries.map((entry) => ({
    url: `${base}${withSlash(entry.path)}`,
    lastModified: frequentPaths.has(entry.path) ? BUILD_TIME : STABLE_LAST_MODIFIED,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
