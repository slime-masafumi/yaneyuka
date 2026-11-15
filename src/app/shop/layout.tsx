import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop',
  description: '設計・現場で役立つ道具 62 品を、6 つの分類・50 ブランドで紹介します。各ブランドの公式ページや販売ページへ直接移れます。',
  alternates: {
    canonical: 'https://yaneyuka.com/shop',
  },
  openGraph: {
    title: 'yaneyuka | Shop',
    description: '建築・建設業界向けの商品を販売。',
    type: 'website',
    url: 'https://yaneyuka.com/shop',
  },
};

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: 'yaneyuka Shop',
    description: '設計・現場で役立つ道具 62 品を、6 つの分類・50 ブランドで紹介します。各ブランドの公式ページや販売ページへ直接移れます。',
    url: 'https://yaneyuka.com/shop',
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

