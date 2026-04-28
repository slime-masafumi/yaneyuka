import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 内装天井材',
  description: '建築・建設業界の内装天井材情報をまとめて紹介。天井ボード、化粧材、装飾材、システム天井など各種内装天井材のメーカー情報をお届けします。',
  alternates: {
    canonical: 'https://yaneyuka.com/internal-ceiling',
  },
  openGraph: {
    title: 'yaneyuka | 内装天井材',
    description: '建築・建設業界の内装天井材情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/internal-ceiling',
  },
};

export default function InternalCeilingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '内装天井材',
    description: '建築・建設業界の内装天井材情報をまとめて紹介。天井ボード、化粧材、装飾材、システム天井など各種内装天井材のメーカー情報をお届けします。',
    url: 'https://yaneyuka.com/internal-ceiling',
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

