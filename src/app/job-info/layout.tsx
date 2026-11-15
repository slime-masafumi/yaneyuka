import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '求人情報',
  description: '建築設計・設備設計・施工管理など、建築・建設分野の求人を職種別にまとめています。求人の掲載を受け付けています(無料)。',
  alternates: {
    canonical: 'https://yaneyuka.com/job-info',
  },
  openGraph: {
    title: 'yaneyuka | 求人情報',
    description: '建築・建設業界の求人情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/job-info',
  },
};

export default function JobInfoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '求人情報',
    description: '建築設計・設備設計・施工管理など、建築・建設分野の求人を職種別にまとめています。求人の掲載を受け付けています(無料)。',
    url: 'https://yaneyuka.com/job-info',
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

