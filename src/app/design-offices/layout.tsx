import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '設計事務所',
  description: '意匠・構造・設備など専門分野ごとの設計事務所の一覧です。協力事務所・外注先を探すときに。設計事務所の掲載を受け付けています(無料)。',
  alternates: {
    canonical: 'https://yaneyuka.com/design-offices',
  },
  openGraph: {
    title: 'yaneyuka | 設計事務所',
    description: '建築・建設業界の設計事務所情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/design-offices',
  },
};

export default function DesignOfficesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '設計事務所',
    description: '意匠・構造・設備など専門分野ごとの設計事務所の一覧です。協力事務所・外注先を探すときに。設計事務所の掲載を受け付けています(無料)。',
    url: 'https://yaneyuka.com/design-offices',
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

