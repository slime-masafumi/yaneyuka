import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | 金物',
  description: '建築・建設業界の金物情報をまとめて紹介。ハンドル、引棒、建具金物、サニタリー、鍵関係など各種金物のメーカー情報をお届けします。',
  alternates: {
    canonical: 'https://yaneyuka.com/hardware',
  },
  openGraph: {
    title: 'yaneyuka | 金物',
    description: '建築・建設業界の金物情報をまとめて紹介。',
    type: 'website',
    url: 'https://yaneyuka.com/hardware',
  },
};

export default function HardwareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '金物',
    description: '建築・建設業界の金物情報をまとめて紹介。ハンドル、引棒、建具金物、サニタリー、鍵関係など各種金物のメーカー情報をお届けします。',
    url: 'https://yaneyuka.com/hardware',
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

