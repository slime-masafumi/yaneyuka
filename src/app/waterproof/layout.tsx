import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 防水材',
  description: '建築・建設業界の防水材情報をまとめて紹介。ウレタン防水、アスファルト防水、シート防水、FRP防水など各種防水材のメーカー情報をお届けします。',
  alternates: {
    canonical: 'https://yaneyuka.com/waterproof',
  },
  openGraph: {
    title: 'yaneyuka | 防水材',
    description: '建築・建設業界の防水材情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/waterproof',
  },
};

export default function WaterproofLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '防水材',
    description: '建築・建設業界の防水材情報をまとめて紹介。ウレタン防水、アスファルト防水、シート防水、FRP防水など各種防水材のメーカー情報をお届けします。',
    url: 'https://yaneyuka.com/waterproof',
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

