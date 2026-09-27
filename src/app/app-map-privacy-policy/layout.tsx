import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | 情報分解地図 (LayerMap)',
  description: '情報分解地図(LayerMap)アプリのプライバシーポリシー。現在地は端末内でのみ使用し、地点の照会結果は個人と結び付けません。',
  alternates: {
    canonical: 'https://yaneyuka.com/app-map-privacy-policy',
  },
  openGraph: {
    title: 'プライバシーポリシー | 情報分解地図 (LayerMap) | yaneyuka',
    description: '情報分解地図(LayerMap)アプリのプライバシーポリシー。現在地は端末内でのみ使用し、地点の照会結果は個人と結び付けません。',
    type: 'website',
    url: 'https://yaneyuka.com/app-map-privacy-policy',
  },
};

export default function AppMapPrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'プライバシーポリシー | 情報分解地図 (LayerMap)',
    description: '情報分解地図(LayerMap)アプリのプライバシーポリシー。現在地は端末内でのみ使用し、地点の照会結果は個人と結び付けません。',
    url: 'https://yaneyuka.com/app-map-privacy-policy',
    inLanguage: ['ja', 'en'],
    publisher: {
      '@type': 'Organization',
      name: '合同会社slime',
      url: 'https://yaneyuka.com',
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
