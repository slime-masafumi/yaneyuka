import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 添景・CAD',
  description: '建築CAD用の添景素材を無料ダウンロード。人物、樹木、車両などのCADデータを提供します。',
  alternates: {
    canonical: 'https://yaneyuka.com/landscape-cad',
  },
  openGraph: {
    title: 'yaneyuka | 添景・CAD',
    description: '建築CAD用の添景素材を無料ダウンロード。',
    type: 'website',
    url: 'https://yaneyuka.com/landscape-cad',
  },
};

export default function LandscapeCADLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '添景・CAD',
    description: '建築CAD用の添景素材を無料ダウンロード。人物、樹木、車両などのCADデータを提供します。',
    url: 'https://yaneyuka.com/landscape-cad',
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

