import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 設計事務所',
  description: '建築・建設業界の設計事務所情報をまとめて紹介。地域別、専門分野別に設計事務所を検索できます。',
  alternates: {
    canonical: 'https://yaneyuka.com/design-offices',
  },
  openGraph: {
    title: 'yaneyuka | 設計事務所',
    description: '建築・建設業界の設計事務所情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/design-offices',
  },
};

export default function DesignOfficesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '設計事務所',
    description: '建築・建設業界の設計事務所情報をまとめて紹介。地域別、専門分野別に設計事務所を検索できます。',
    url: 'https://yaneyuka.com/design-offices',
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

