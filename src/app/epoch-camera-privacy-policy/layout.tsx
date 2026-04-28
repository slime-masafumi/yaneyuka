import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Epoch Camera | yaneyuka',
  description: 'Privacy Policy for the Epoch Camera iOS app. This page is also available in Japanese.',
  alternates: {
    canonical: 'https://yaneyuka.com/epoch-camera-privacy-policy',
  },
  openGraph: {
    title: 'Privacy Policy | Epoch Camera | yaneyuka',
    description: 'Privacy Policy for the Epoch Camera iOS app.',
    type: 'website',
    url: 'https://yaneyuka.com/epoch-camera-privacy-policy',
  },
};

export default function EpochCameraPrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Privacy Policy | Epoch Camera',
    description: 'Privacy Policy for the Epoch Camera iOS app.',
    url: 'https://yaneyuka.com/epoch-camera-privacy-policy',
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
