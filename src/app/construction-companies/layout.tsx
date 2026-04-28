import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 施工会社',
  description: '建築・建設業界の施工会社情報をまとめて紹介。地域別、専門分野別に施工会社を検索できます。',
  alternates: {
    canonical: 'https://yaneyuka.com/construction-companies',
  },
  openGraph: {
    title: 'yaneyuka | 施工会社',
    description: '建築・建設業界の施工会社情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/construction-companies',
  },
};

export default function ConstructionCompaniesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '施工会社',
    description: '建築・建設業界の施工会社情報をまとめて紹介。地域別、専門分野別に施工会社を検索できます。',
    url: 'https://yaneyuka.com/construction-companies',
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

