import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | イベント情報',
  description: '建築・建設業界の展示会・セミナー・イベント情報をまとめて紹介。JAPAN BUILD、建築建材展、リフォーム産業フェアなど最新のイベント情報をお届けします。',
  alternates: {
    canonical: 'https://yaneyuka.com/event',
  },
  openGraph: {
    title: 'yaneyuka | イベント情報',
    description: '建築・建設業界の展示会・セミナー・イベント情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/event',
  },
};

export default function EventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'イベント情報',
    description: '建築・建設業界の展示会・セミナー・イベント情報をまとめて紹介。',
    url: 'https://yaneyuka.com/event',
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

