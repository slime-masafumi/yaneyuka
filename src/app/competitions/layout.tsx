import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | コンペ',
  description: '建築・建設業界のコンペティション情報をまとめて紹介。設計コンペ、施工コンペなどの情報をお届けします。',
  alternates: {
    canonical: 'https://yaneyuka.com/competitions',
  },
  openGraph: {
    title: 'yaneyuka | コンペ',
    description: '建築・建設業界のコンペティション情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/competitions',
  },
};

export default function CompetitionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'コンペ',
    description: '建築・建設業界のコンペティション情報をまとめて紹介。設計コンペ、施工コンペなどの情報をお届けします。',
    url: 'https://yaneyuka.com/competitions',
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

