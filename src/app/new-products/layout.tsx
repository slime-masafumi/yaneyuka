import { Metadata } from 'next';

// 30分ごとに prerender HTML を再生成（API側のキャッシュTTLと整合）。
// Firebase Hosting CDN の永続キャッシュ問題を回避するため、ISR で revalidate を明示。
export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'yaneyuka | 新製品',
  description: '建築・建設業界の新製品情報をまとめて紹介。建材、設備、工具などの最新製品をお届けします。',
  alternates: {
    canonical: 'https://yaneyuka.com/new-products',
  },
  openGraph: {
    title: 'yaneyuka | 新製品',
    description: '建築・建設業界の新製品情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/new-products',
  },
};

export default function NewProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '新製品',
    description: '建築・建設業界の新製品情報をまとめて紹介。建材、設備、工具などの最新製品をお届けします。',
    url: 'https://yaneyuka.com/new-products',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: [],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {children}
    </>
  );
}

