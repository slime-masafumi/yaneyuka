import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '施工会社',
  description: '建築・土木・設備など専門分野ごとの施工会社の一覧です。協力会社・外注先を探す設計者向け。施工会社の掲載を受け付けています(無料)。',
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
    description: '建築・土木・設備など専門分野ごとの施工会社の一覧です。協力会社・外注先を探す設計者向け。施工会社の掲載を受け付けています(無料)。',
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

