import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | ファニチャー',
  description: '建築・建設業界のファニチャー情報をまとめて紹介。家具、カーテン、ブラインド、生地など各種ファニチャーのメーカー情報をお届けします。',
  alternates: {
    canonical: 'https://yaneyuka.com/furniture',
  },
  openGraph: {
    title: 'yaneyuka | ファニチャー',
    description: '建築・建設業界のファニチャー情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/furniture',
  },
};

export default function FurnitureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'ファニチャー',
    description: '建築・建設業界のファニチャー情報をまとめて紹介。家具、カーテン、ブラインド、生地など各種ファニチャーのメーカー情報をお届けします。',
    url: 'https://yaneyuka.com/furniture',
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

