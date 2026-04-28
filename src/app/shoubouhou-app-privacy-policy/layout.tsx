import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | 消防法アプリ | yaneyuka',
  description: '消防法アプリのプライバシーポリシーです。個人情報の取り扱いに関する方針をご説明します。',
  alternates: {
    canonical: 'https://yaneyuka.com/shoubouhou-app-privacy-policy',
  },
  openGraph: {
    title: 'プライバシーポリシー | 消防法アプリ | yaneyuka',
    description: '消防法アプリのプライバシーポリシーです。個人情報の取り扱いに関する方針をご説明します。',
    type: 'website',
    url: 'https://yaneyuka.com/shoubouhou-app-privacy-policy',
  },
};

export default function ShoubouhouAppPrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'プライバシーポリシー | 消防法アプリ',
    description: '消防法アプリのプライバシーポリシーです。個人情報の取り扱いに関する方針をご説明します。',
    url: 'https://yaneyuka.com/shoubouhou-app-privacy-policy',
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
