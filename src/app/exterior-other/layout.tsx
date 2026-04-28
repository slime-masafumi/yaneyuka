import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 外部その他',
  description: '建築・建設業界の外部その他建材情報をまとめて紹介。笠木・水切、庇・オーニング、雨どい、手摺など各種外部建材のメーカー情報をお届けします。',
  alternates: {
    canonical: 'https://yaneyuka.com/exterior-other',
  },
  openGraph: {
    title: 'yaneyuka | 外部その他',
    description: '建築・建設業界の外部その他建材情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/exterior-other',
  },
};

export default function ExteriorOtherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '外部その他',
    description: '建築・建設業界の外部その他建材情報をまとめて紹介。笠木・水切、庇・オーニング、雨どい、手摺など各種外部建材のメーカー情報をお届けします。',
    url: 'https://yaneyuka.com/exterior-other',
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

