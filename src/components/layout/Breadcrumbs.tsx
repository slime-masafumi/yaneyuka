'use client';

import React from 'react';
import { TOOL_PAGES } from '@/lib/designToolPages';
import { usePathname } from 'next/navigation';
import { SCREEN_LABEL } from '@/lib/siteScreens';

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
      // 上部ナビの情報ページと建材 16 分類（画面台帳 src/lib/siteScreens.ts）
      ...SCREEN_LABEL,
      // 建築の調べもの（/lookup, /calc, /karte）
      'lookup': '建築の調べもの',
      'design': '意匠・法規',
      'structure': '構造',
      'mep': '設備',
      'electrical': '電気・通信',
      'calc': '計算ツール',
      'glass-thickness': '必要ガラス厚の計算',
      'karte': '物件カルテ',
      // 設計ツールの単体ページ /calc/{id}/(2026-11-15)
      ...Object.fromEntries(TOOL_PAGES.map((t) => [t.id, t.title])),
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

