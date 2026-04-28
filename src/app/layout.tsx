import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import ClientSideEffects from './ClientSideEffects';
import ClientProviders from './ClientProviders';
import type { Metadata, Viewport } from 'next';

const inter = Inter({ subsets: ['latin'] })

// --- SEO: Metadata ---
export const metadata: Metadata = {
  title: {
    default: 'yaneyuka | 建築・建設業界の業務支援ポータルサイト',
    template: '%s | yaneyuka',
  },
  description:
    'yaneyukaは、建築設計・施工・設備・メーカー・職人まで建設業界全体を支援する業務効率化ポータルサイト。CADデータや添景素材、建築計算ツール、My法規、タスク管理など実務の現場で役立つ機能を無料提供。',
  metadataBase: new URL('https://yaneyuka.com'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/image/favicon.png',
    apple: '/image/favicon.png',
  },
  manifest: '/manifest.json',
  robots: { index: true, follow: true },
  openGraph: {
    siteName: 'yaneyuka',
    type: 'website',
    title: 'yaneyuka | 建築・建設業界の業務支援ポータルサイト',
    description:
      '建築・建設の現場で"本当に使える"業務支援プラットフォーム。CAD添景、建築計算ツール、My法規、タスク管理などを無料で提供。',
    images: [{ url: '/image/og-default.png', width: 1200, height: 630, alt: 'yaneyuka' }],
    locale: 'ja_JP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'yaneyuka | 建築・建設業界の業務支援ポータルサイト',
    description:
      '建築・建設の現場で"本当に使える"業務支援プラットフォーム。CAD添景、建築計算ツール、My法規、タスク管理などを無料で提供。',
    images: ['/image/og-default.png'],
  },
  other: {
    'impact-site-verification': 'f2fbe835-3c4c-4ce4-a5a1-42bfec9b31c0',
  },
  formatDetection: {
    telephone: false,
  },
};

// --- SEO: Viewport (ズーム許可 = WCAG準拠) ---
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3b3b3b',
};

// --- JSON-LD Structured Data ---
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'yaneyuka',
  url: 'https://yaneyuka.com/',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://yaneyuka.com/news?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'yaneyuka（ヤネユカ／やねゆか）',
  alternateName: ['ヤネユカ', 'やねゆか', 'Yaneyuka'],
  url: 'https://yaneyuka.com/',
  description: '建築・建設業界のための業務支援ポータルサイト。',
  logo: 'https://yaneyuka.com/image/og-default.png',
  knowsAbout: ['建材メーカー', '建築設計', '施工管理', '建築資材', '建築士試験'],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      email: 'yaneyuka.service@gmail.com',
      contactType: 'customer support',
      availableLanguage: ['ja'],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/css/style.css" />
        <link rel="stylesheet" href="/css/swiper.css" />
        <script
          id="ld-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          id="ld-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className={inter.className}>
        <ClientSideEffects />
        <ClientProviders>
          {children}
        </ClientProviders>
        {process.env.NEXT_PUBLIC_GOOGLE_CSE_ID && (
          <Script
            id="google-cse"
            src={`https://cse.google.com/cse.js?cx=${process.env.NEXT_PUBLIC_GOOGLE_CSE_ID}`}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
