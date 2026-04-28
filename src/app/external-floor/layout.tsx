import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 外部床材',
  description: '建築・建設業界の外部床材情報をまとめて紹介。タイル、石・レンガ、塩ビシートなど各種外部床材のメーカー情報をお届けします。',
  alternates: {
    canonical: 'https://yaneyuka.com/external-floor',
  },
  openGraph: {
    title: 'yaneyuka | 外部床材',
    description: '建築・建設業界の外部床材情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/external-floor',
  },
};

export default function ExternalFloorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '外部床材',
    description: '建築・建設業界の外部床材情報をまとめて紹介。タイル、石・レンガ、塩ビシートなど各種外部床材のメーカー情報をお届けします。',
    url: 'https://yaneyuka.com/external-floor',
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

