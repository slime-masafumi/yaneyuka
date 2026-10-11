import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Curio プライバシーポリシー',
  description: 'Curio のプライバシーポリシーです。個人情報・利用情報の取り扱いに関する方針をご説明します。',
  alternates: {
    canonical: 'https://yaneyuka.com/curio-privacy-policy',
  },
  openGraph: {
    title: 'Curio プライバシーポリシー | yaneyuka',
    description: 'Curio のプライバシーポリシーです。個人情報・利用情報の取り扱いに関する方針をご説明します。',
    type: 'website',
    url: 'https://yaneyuka.com/curio-privacy-policy',
  },
};

export default function CurioPrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Curio プライバシーポリシー',
    description: 'Curio のプライバシーポリシーです。個人情報・利用情報の取り扱いに関する方針をご説明します。',
    url: 'https://yaneyuka.com/curio-privacy-policy',
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
