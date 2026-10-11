import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | DayLine',
  description: 'Privacy Policy for the DayLine app, describing how personal information is handled.',
  alternates: {
    canonical: 'https://yaneyuka.com/dayline-app-privacy-policy-en',
  },
  openGraph: {
    title: 'Privacy Policy | DayLine | yaneyuka',
    description: 'Privacy Policy for the DayLine app, describing how personal information is handled.',
    type: 'website',
    url: 'https://yaneyuka.com/dayline-app-privacy-policy-en',
  },
};

export default function DayLineAppPrivacyPolicyEnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Privacy Policy | DayLine',
    description: 'Privacy Policy for the DayLine app, describing how personal information is handled.',
    url: 'https://yaneyuka.com/dayline-app-privacy-policy-en',
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
