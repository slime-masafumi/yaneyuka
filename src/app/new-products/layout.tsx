import { Metadata } from 'next';

// 30分ごとに prerender HTML を再生成（API側のキャッシュTTLと整合）。
// Firebase Hosting CDN の永続キャッシュ問題を回避するため、ISR で revalidate を明示。
export const revalidate = 1800;

export const metadata: Metadata = {
  title: '新製品',
  description: '建材・設備メーカー各社の新製品を、外装・内装・設備・照明などの分類ごとに一覧にしています。各社の公式発表へ直接リンクし、新しい順に並べています。',
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
    description: '建材・設備メーカー各社の新製品を、外装・内装・設備・照明などの分類ごとに一覧にしています。各社の公式発表へ直接リンクし、新しい順に並べています。',
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

