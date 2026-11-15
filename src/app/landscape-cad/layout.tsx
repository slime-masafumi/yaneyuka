import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '添景・CAD',
  description: '図面やパースに使える無料の CAD データ(DXF など)と添景素材(人物など)を集めています。配布元の公式ページから直接ダウンロードできます。',
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
    description: '図面やパースに使える無料の CAD データ(DXF など)と添景素材(人物など)を集めています。配布元の公式ページから直接ダウンロードできます。',
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

