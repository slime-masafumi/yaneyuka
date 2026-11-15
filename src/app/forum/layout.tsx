import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '掲示板',
  description: '建築・建設の実務者向け掲示板。法規の解釈、納まり、設備の選定などの疑問を質問・回答したり、事例を共有したり、協力先を探したりできます。',
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
    description: '建築・建設の実務者向け掲示板。法規の解釈、納まり、設備の選定などの疑問を質問・回答したり、事例を共有したり、協力先を探したりできます。',
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

