import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | Pickup',
  description: '建築・建設業界の注目情報をピックアップ。おすすめの建材、製品、サービスなどを紹介します。',
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
    description: '建築・建設業界の注目情報をピックアップ。おすすめの建材、製品、サービスなどを紹介します。',
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

