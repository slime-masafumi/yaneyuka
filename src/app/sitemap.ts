import { MetadataRoute } from 'next'
import { allLegalPaths } from '@/lib/legalPages'
import { LOOKUP_ORDER } from '@/lib/lookup'
import { FLOW_ARTICLES } from '@/lib/forceFlowArticles'
import { ROUTED_SCREENS, screenPath, type ChangeFreq } from '@/lib/siteScreens'

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

  // 上部ナビの情報ページと建材 16 分類。定義は画面台帳 src/lib/siteScreens.ts。
  const screens: SitemapEntry[] = ROUTED_SCREENS.map((s) => ({
    path: screenPath(s.id),
    changeFrequency: s.sitemap.changeFrequency,
    priority: s.sitemap.priority,
  }));
  const freshScreenPaths = ROUTED_SCREENS.filter((s) => s.sitemap.fresh).map((s) => screenPath(s.id));

  // 建築の調べもの（逆引き索引・計算ツール・物件カルテ）。
  // 索引ページは検索流入の受け皿なので優先度を高めに置く。カルテは端末内アプリなので低め。
  const lookup: SitemapEntry[] = [
    { path: '/lookup', changeFrequency: 'monthly', priority: 0.8 },
    ...LOOKUP_ORDER.map((slug) => ({ path: `/lookup/${slug}`, changeFrequency: 'monthly' as ChangeFreq, priority: 0.7 })),
    { path: '/calc', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/calc/glass-thickness', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/calc/force-flow', changeFrequency: 'monthly', priority: 0.7 },
    ...FLOW_ARTICLES.map((a) => ({ path: `/calc/force-flow/${a.slug}`, changeFrequency: 'monthly' as ChangeFreq, priority: 0.7 })),
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

  const frequentPaths = new Set<string>([...freshScreenPaths, '/']);
  const allEntries = [...top, ...screens, ...lookup, ...legal];

  return allEntries.map((entry) => ({
    url: `${base}${withSlash(entry.path)}`,
    lastModified: frequentPaths.has(entry.path) ? BUILD_TIME : STABLE_LAST_MODIFIED,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
