import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use | Epoch Camera | yaneyuka',
  description: 'Terms of Use for the Epoch Camera iOS app. This page is also available in Japanese.',
  alternates: {
    canonical: 'https://yaneyuka.com/epoch-camera-terms',
  },
  openGraph: {
    title: 'Terms of Use | Epoch Camera | yaneyuka',
    description: 'Terms of Use for the Epoch Camera iOS app.',
    type: 'website',
    url: 'https://yaneyuka.com/epoch-camera-terms',
  },
};

export default function EpochCameraTermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Terms of Use | Epoch Camera',
    description: 'Terms of Use for the Epoch Camera iOS app.',
    url: 'https://yaneyuka.com/epoch-camera-terms',
    inLanguage: ['en', 'ja'],
    publisher: {
      '@type': 'Organization',
      name: 'slime design',
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
