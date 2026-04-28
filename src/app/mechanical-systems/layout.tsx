import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 機械設備',
  description: '建築・建設業界の機械設備情報をまとめて紹介。水栓、衛生機器、住宅設備、キッチン、空調機など各種機械設備のメーカー情報をお届けします。',
  alternates: {
    canonical: 'https://yaneyuka.com/mechanical-systems',
  },
  openGraph: {
    title: 'yaneyuka | 機械設備',
    description: '建築・建設業界の機械設備情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/mechanical-systems',
  },
};

export default function MechanicalSystemsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '機械設備',
    description: '建築・建設業界の機械設備情報をまとめて紹介。水栓、衛生機器、住宅設備、キッチン、空調機など各種機械設備のメーカー情報をお届けします。',
    url: 'https://yaneyuka.com/mechanical-systems',
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

