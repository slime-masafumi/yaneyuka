import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 電気設備',
  description: '建築・建設業界の電気設備情報をまとめて紹介。照明、外構照明、スイッチコンセント、発電機など各種電気設備のメーカー情報をお届けします。',
  alternates: {
    canonical: 'https://yaneyuka.com/electrical-systems',
  },
  openGraph: {
    title: 'yaneyuka | 電気設備',
    description: '建築・建設業界の電気設備情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/electrical-systems',
  },
};

export default function ElectricalSystemsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '電気設備',
    description: '建築・建設業界の電気設備情報をまとめて紹介。照明、外構照明、スイッチコンセント、発電機など各種電気設備のメーカー情報をお届けします。',
    url: 'https://yaneyuka.com/electrical-systems',
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

