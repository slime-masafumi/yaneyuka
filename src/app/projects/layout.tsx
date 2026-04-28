import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | プロジェクト',
  description: '建築・建設業界のプロジェクト情報をまとめて紹介。施工事例、設計事例などを紹介します。',
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
    description: '建築・建設業界のプロジェクト情報をまとめて紹介。施工事例、設計事例などを紹介します。',
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

