import { MetadataRoute } from 'next'

type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

interface SitemapEntry {
  path: string;
  changeFrequency: ChangeFreq;
  priority: number;
}

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

  // 静的ページ
  const staticPages: SitemapEntry[] = [
    { path: '/kijyunhou-app-privacy-policy', changeFrequency: 'yearly', priority: 0.2 },
  ];

  const allEntries = [...top, ...frequent, ...moderate, ...materials, ...staticPages];

  return allEntries.map((entry) => ({
    url: `${base}${entry.path}`,
    lastModified: new Date('2025-06-01'),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
