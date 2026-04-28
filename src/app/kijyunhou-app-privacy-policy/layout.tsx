import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | 建築基準法アプリ | yaneyuka',
  description: '建築基準法アプリのプライバシーポリシーです。個人情報の取り扱いに関する方針をご説明します。',
  alternates: {
    canonical: 'https://yaneyuka.com/kijyunhou-app-privacy-policy',
  },
  openGraph: {
    title: 'プライバシーポリシー | 建築基準法アプリ | yaneyuka',
    description: '建築基準法アプリのプライバシーポリシーです。個人情報の取り扱いに関する方針をご説明します。',
    type: 'website',
    url: 'https://yaneyuka.com/kijyunhou-app-privacy-policy',
  },
};

export default function KijyunhouAppPrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'プライバシーポリシー | 建築基準法アプリ',
    description: '建築基準法アプリのプライバシーポリシーです。個人情報の取り扱いに関する方針をご説明します。',
    url: 'https://yaneyuka.com/kijyunhou-app-privacy-policy',
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
