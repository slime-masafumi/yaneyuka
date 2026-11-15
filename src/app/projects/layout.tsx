import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プロジェクト',
  description: '公共工事の入札公告と、民間の案件・パートナー募集・現地調査の依頼を一覧にしています。建築・設備・土木の分類と地域で絞り込めます。',
  alternates: {
    canonical: 'https://yaneyuka.com/projects',
  },
  openGraph: {
    title: 'yaneyuka | プロジェクト',
    description: '建築・建設業界のプロジェクト情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/projects',
  },
};

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'プロジェクト',
    description: '公共工事の入札公告と、民間の案件・パートナー募集・現地調査の依頼を一覧にしています。建築・設備・土木の分類と地域で絞り込めます。',
    url: 'https://yaneyuka.com/projects',
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

