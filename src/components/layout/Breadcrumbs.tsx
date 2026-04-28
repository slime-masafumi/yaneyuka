'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href: string;
}

const Breadcrumbs: React.FC = () => {
  const pathname = usePathname();

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      { label: 'ホーム', href: '/' },
    ];

    if (pathname === '/') {
      return items;
    }

    const pathSegments = pathname.split('/').filter(Boolean);
    const pathMap: Record<string, string> = {
      'event': 'イベント情報',
      'news': 'NEWS',
      'new-products': '新製品',
      'books-software': '書籍・ソフト',
      'pickup': 'Pickup',
      'regulations': '法規',
      'qualifications': '資格試験',
      'landscape-cad': '添景・CAD',
      'shop': 'Shop',
      'projects': 'プロジェクト',
      'competitions': 'コンペ',
      'construction-companies': '施工会社',
      'design-offices': '設計事務所',
      'job-info': '求人情報',
      'forum': '掲示板',
      'roof': '屋根材',
      'exterior-wall': '外壁材',
      'opening': '開口部',
      'external-floor': '外部床材',
      'exterior-other': '外部その他',
      'internal-floor': '内部床材',
      'internal-wall': '内装壁材',
      'internal-ceiling': '内装天井材',
      'internal-other': '内装その他',
      'waterproof': '防水材',
      'hardware': '金物',
      'furniture': 'ファニチャー',
      'electrical-systems': '電気設備',
      'mechanical-systems': '機械設備',
      'exterior-infrastructure': '外構',
      'exterior': 'エクステリア',
    };

    let currentPath = '';
    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`;
      const label = pathMap[segment];
      if (label) {
        items.push({ label, href: currentPath });
      }
    });

    return items;
  };

  const breadcrumbs = getBreadcrumbs();

  // 構造化データ（BreadcrumbList）
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: `https://yaneyuka.com${item.href}`,
    })),
  };

  if (breadcrumbs.length <= 1) {
    return null;
  }

  // SEO対策として構造化データのみ残し、表示は非表示にする
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
};

export default Breadcrumbs;

