import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 内部床材',
  description: '建築・建設業界の内部床材情報をまとめて紹介。フローリング、ビニールタイル、カーペット、タイル、畳など各種内部床材のメーカー情報をお届けします。',
  alternates: {
    canonical: 'https://yaneyuka.com/internal-floor',
  },
  openGraph: {
    title: 'yaneyuka | 内部床材',
    description: '建築・建設業界の内部床材情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/internal-floor',
  },
};

export default function InternalFloorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '内部床材',
    description: '建築・建設業界の内部床材情報をまとめて紹介。フローリング、ビニールタイル、カーペット、タイル、畳など各種内部床材のメーカー情報をお届けします。',
    url: 'https://yaneyuka.com/internal-floor',
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

