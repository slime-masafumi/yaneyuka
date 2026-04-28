import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 開口部',
  description: '建築・建設業界の開口部情報をまとめて紹介。アルミサッシ、樹脂サッシ、木製サッシ、シャッターなど各種開口部のメーカー情報をお届けします。',
  alternates: {
    canonical: 'https://yaneyuka.com/opening',
  },
  openGraph: {
    title: 'yaneyuka | 開口部',
    description: '建築・建設業界の開口部情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/opening',
  },
};

export default function OpeningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '開口部',
    description: '建築・建設業界の開口部情報をまとめて紹介。アルミサッシ、樹脂サッシ、木製サッシ、シャッターなど各種開口部のメーカー情報をお届けします。',
    url: 'https://yaneyuka.com/opening',
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

