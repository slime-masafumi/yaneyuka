import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 掲示板',
  description: '建築・建設業界の掲示板。質問・相談、情報交換、技術的な議論などを行えます。',
  alternates: {
    canonical: 'https://yaneyuka.com/forum',
  },
  openGraph: {
    title: 'yaneyuka | 掲示板',
    description: '建築・建設業界の掲示板。質問・相談、情報交換などを行えます。',
    type: 'website',
    url: 'https://yaneyuka.com/forum',
  },
};

export default function ForumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '掲示板',
    description: '建築・建設業界の掲示板。質問・相談、情報交換、技術的な議論などを行えます。',
    url: 'https://yaneyuka.com/forum',
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

