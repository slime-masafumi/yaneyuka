import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 書籍・ソフト',
  description: '建築・建設業界向けの書籍・ソフトウェア情報をまとめて紹介。CADソフト、建築計算ソフト、専門書籍など。',
  alternates: {
    canonical: 'https://yaneyuka.com/books-software',
  },
  openGraph: {
    title: 'yaneyuka | 書籍・ソフト',
    description: '建築・建設業界向けの書籍・ソフトウェア情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/books-software',
  },
};

export default function BooksSoftwareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '書籍・ソフト',
    description: '建築・建設業界向けの書籍・ソフトウェア情報をまとめて紹介。CADソフト、建築計算ソフト、専門書籍など。',
    url: 'https://yaneyuka.com/books-software',
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

