import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | エクステリア',
  description: '建築・建設業界のエクステリア情報をまとめて紹介。宅配ボックス、郵便受け、表札、門扉、フェンス、カーポートなど各種エクステリアのメーカー情報をお届けします。',
  alternates: {
    canonical: 'https://yaneyuka.com/exterior',
  },
  openGraph: {
    title: 'yaneyuka | エクステリア',
    description: '建築・建設業界のエクステリア情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/exterior',
  },
};

export default function ExteriorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'エクステリア',
    description: '建築・建設業界のエクステリア情報をまとめて紹介。宅配ボックス、郵便受け、表札、門扉、フェンス、カーポートなど各種エクステリアのメーカー情報をお届けします。',
    url: 'https://yaneyuka.com/exterior',
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

