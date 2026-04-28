import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 資格試験',
  description: '建築・建設業界の資格試験情報をまとめて紹介。建築士試験、施工管理技士試験などの情報をお届けします。',
  alternates: {
    canonical: 'https://yaneyuka.com/qualifications',
  },
  openGraph: {
    title: 'yaneyuka | 資格試験',
    description: '建築・建設業界の資格試験情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/qualifications',
  },
};

export default function QualificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '資格試験',
    description: '建築・建設業界の資格試験情報をまとめて紹介。建築士試験、施工管理技士試験などの情報をお届けします。',
    url: 'https://yaneyuka.com/qualifications',
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

