import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 外壁材',
  description: '建築・建設業界の外壁材情報をまとめて紹介。ALC、ECP、サイディング、金属パネルなど各種外壁材のメーカー情報をお届けします。',
  alternates: {
    canonical: 'https://yaneyuka.com/exterior-wall',
  },
  openGraph: {
    title: 'yaneyuka | 外壁材',
    description: '建築・建設業界の外壁材情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/exterior-wall',
  },
};

export default function ExteriorWallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '外壁材',
    description: '建築・建設業界の外壁材情報をまとめて紹介。ALC、ECP、サイディング、金属パネルなど各種外壁材のメーカー情報をお届けします。',
    url: 'https://yaneyuka.com/exterior-wall',
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

