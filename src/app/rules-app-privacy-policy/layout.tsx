import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | Rules | yaneyuka',
  description: 'Rulesアプリのプライバシーポリシーです。個人情報の取り扱いに関する方針をご説明します。',
  alternates: {
    canonical: 'https://yaneyuka.com/rules-app-privacy-policy',
  },
  openGraph: {
    title: 'プライバシーポリシー | Rules | yaneyuka',
    description: 'Rulesアプリのプライバシーポリシーです。個人情報の取り扱いに関する方針をご説明します。',
    type: 'website',
    url: 'https://yaneyuka.com/rules-app-privacy-policy',
  },
};

export default function RulesAppPrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'プライバシーポリシー | Rules',
    description: 'Rulesアプリのプライバシーポリシーです。個人情報の取り扱いに関する方針をご説明します。',
    url: 'https://yaneyuka.com/rules-app-privacy-policy',
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
