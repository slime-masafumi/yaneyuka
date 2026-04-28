import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 内装その他',
  description: '建築・建設業界の内装その他建材情報をまとめて紹介。トイレブース、内装サッシ、手摺、グレーチングなど各種内装建材のメーカー情報をお届けします。',
  alternates: {
    canonical: 'https://yaneyuka.com/internal-other',
  },
  openGraph: {
    title: 'yaneyuka | 内装その他',
    description: '建築・建設業界の内装その他建材情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/internal-other',
  },
};

export default function InternalOtherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '内装その他',
    description: '建築・建設業界の内装その他建材情報をまとめて紹介。トイレブース、内装サッシ、手摺、グレーチングなど各種内装建材のメーカー情報をお届けします。',
    url: 'https://yaneyuka.com/internal-other',
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

