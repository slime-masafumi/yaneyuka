import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 求人情報',
  description: '建築・建設業界の求人情報をまとめて紹介。設計、施工、管理など様々な職種の求人をお届けします。',
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
    description: '建築・建設業界の求人情報をまとめて紹介。設計、施工、管理など様々な職種の求人をお届けします。',
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

