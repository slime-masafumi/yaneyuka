import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 屋根材',
  description: '建築・建設業界の屋根材情報をまとめて紹介。折板、金属屋根、スレート、瓦など各種屋根材のメーカー情報をお届けします。',
  alternates: {
    canonical: 'https://yaneyuka.com/roof',
  },
  openGraph: {
    title: 'yaneyuka | 屋根材',
    description: '建築・建設業界の屋根材情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/roof',
  },
};

export default function RoofLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '屋根材',
    description: '建築・建設業界の屋根材情報をまとめて紹介。折板、金属屋根、スレート、瓦など各種屋根材のメーカー情報をお届けします。',
    url: 'https://yaneyuka.com/roof',
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

