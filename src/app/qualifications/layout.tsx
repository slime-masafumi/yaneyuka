import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '資格試験',
  description: '建築設計・施工管理・設備・土木・不動産・住宅など 8 分野、67 種の資格試験の日程をまとめています。申込の締切が近いものから確認できます。',
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
    description: '建築設計・施工管理・設備・土木・不動産・住宅など 8 分野、67 種の資格試験の日程をまとめています。申込の締切が近いものから確認できます。',
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

