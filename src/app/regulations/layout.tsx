import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '法規',
  description: '建築基準法をはじめ、建築設計でよく参照する法令・施行令・施行規則・告示へのリンク集。e-Gov 法令検索や国土交通省のデータベースへ直接移れます。',
  alternates: {
    canonical: 'https://yaneyuka.com/regulations',
  },
  openGraph: {
    title: 'yaneyuka | 法規',
    description: '建築・建設業界の法規情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/regulations',
  },
};

export default function RegulationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '法規',
    description: '建築基準法をはじめ、建築設計でよく参照する法令・施行令・施行規則・告示へのリンク集。e-Gov 法令検索や国土交通省のデータベースへ直接移れます。',
    url: 'https://yaneyuka.com/regulations',
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

