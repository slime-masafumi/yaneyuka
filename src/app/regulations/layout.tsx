import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 法規',
  description: '建築・建設業界の法規情報をまとめて紹介。建築基準法、消防法、関連法規の情報をお届けします。',
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
    description: '建築・建設業界の法規情報をまとめて紹介。建築基準法、消防法、関連法規の情報をお届けします。',
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

