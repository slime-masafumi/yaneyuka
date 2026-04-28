import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 内装壁材',
  description: '建築・建設業界の内装壁材情報をまとめて紹介。壁紙、化粧板、化粧シート、タイルなど各種内装壁材のメーカー情報をお届けします。',
  alternates: {
    canonical: 'https://yaneyuka.com/internal-wall',
  },
  openGraph: {
    title: 'yaneyuka | 内装壁材',
    description: '建築・建設業界の内装壁材情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/internal-wall',
  },
};

export default function InternalWallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '内装壁材',
    description: '建築・建設業界の内装壁材情報をまとめて紹介。壁紙、化粧板、化粧シート、タイルなど各種内装壁材のメーカー情報をお届けします。',
    url: 'https://yaneyuka.com/internal-wall',
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

