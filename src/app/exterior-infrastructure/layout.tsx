import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 外構',
  description: '建築・建設業界の外構情報をまとめて紹介。縁石、外構舗装、雨水桝、桝蓋、グレーチングなど各種外構建材のメーカー情報をお届けします。',
  alternates: {
    canonical: 'https://yaneyuka.com/exterior-infrastructure',
  },
  openGraph: {
    title: 'yaneyuka | 外構',
    description: '建築・建設業界の外構情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/exterior-infrastructure',
  },
};

export default function ExteriorInfrastructureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '外構',
    description: '建築・建設業界の外構情報をまとめて紹介。縁石、外構舗装、雨水桝、桝蓋、グレーチングなど各種外構建材のメーカー情報をお届けします。',
    url: 'https://yaneyuka.com/exterior-infrastructure',
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

