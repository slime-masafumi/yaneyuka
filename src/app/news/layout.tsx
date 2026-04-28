import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | NEWS',
  description: '建築・建設業界の最新ニュースをお届けします。建材メーカー、施工会社、設計事務所の情報をまとめて紹介。',
  alternates: {
    canonical: 'https://yaneyuka.com/news',
  },
  openGraph: {
    title: 'yaneyuka | NEWS',
    description: '建築・建設業界の最新ニュースをお届けします。',
    type: 'website',
    url: 'https://yaneyuka.com/news',
  },
};

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'NEWS',
    description: '建築・建設業界の最新ニュースをお届けします。',
    url: 'https://yaneyuka.com/news',
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

