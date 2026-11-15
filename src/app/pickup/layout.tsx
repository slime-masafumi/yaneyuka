import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pickup',
  description: '最新の建築・内装プロジェクトから、設計の参考になる事例を選んで紹介します。分類ごとに絞り込み、元の記事へそのまま移れます。竣工プロジェクトの掲載も受け付けています。',
  alternates: {
    canonical: 'https://yaneyuka.com/pickup',
  },
  openGraph: {
    title: 'yaneyuka | Pickup',
    description: '建築・建設業界の注目情報をピックアップ。',
    type: 'website',
    url: 'https://yaneyuka.com/pickup',
  },
};

export default function PickupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Pickup',
    description: '最新の建築・内装プロジェクトから、設計の参考になる事例を選んで紹介します。分類ごとに絞り込み、元の記事へそのまま移れます。竣工プロジェクトの掲載も受け付けています。',
    url: 'https://yaneyuka.com/pickup',
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

