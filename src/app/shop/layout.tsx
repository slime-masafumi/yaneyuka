import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'yaneyuka | Shop',
  description: '建築・建設業界向けの商品を販売。建材、工具、書籍など実務に役立つ商品を取り揃えています。',
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
    description: '建築・建設業界向けの商品を販売。建材、工具、書籍など実務に役立つ商品を取り揃えています。',
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

