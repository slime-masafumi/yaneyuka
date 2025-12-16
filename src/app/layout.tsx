"use client";
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { TaskProvider } from '../components/providers/TaskProvider';
import dynamic from 'next/dynamic';
import { AuthProvider } from '../lib/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import { useEffect } from 'react';
const NewsPrefetch = dynamic(() => import('../components/content/news/NewsPrefetch'), { ssr: false });
const ChatNotificationListener = dynamic(() => import('../components/ChatNotificationListener'), { ssr: false });
const PWAInstallPrompt = dynamic(() => import('../components/PWAInstallPrompt'), { ssr: false });

const WorkMusic = dynamic(() => import('@/features/music/YoutubeMusicPlayer'), { ssr: false });

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    
    // PWAインストールプロンプトのイベントをグローバルにキャッチ
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // グローバルエラーハンドラーを設定
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        stack: event.error?.stack,
        userAgent: navigator.userAgent,
        url: window.location.href
      });
      // エラーをログに記録（本番環境ではエラートラッキングサービスに送信）
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', {
        reason: event.reason,
        stack: event.reason?.stack,
        userAgent: navigator.userAgent,
        url: window.location.href
      });
      // エラーをログに記録
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    try {
      // impact.comの認証用メタタグを動的に追加
      const metaTag = document.querySelector('meta[name="impact-site-verification"]');
      if (!metaTag && document.head) {
        const meta = document.createElement('meta');
        meta.name = 'impact-site-verification';
        meta.content = 'f2fbe835-3c4c-4ce4-a5a1-42bfec9b31c0';
        document.head.insertBefore(meta, document.head.firstChild);
      }
    } catch (error) {
      // エラーを無視（メタタグは既にheadに存在する可能性がある）
      console.warn('Failed to add meta tag:', error);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      }
    };
  }, []);

  return (
    <html lang="ja">
      <head>
        <meta name="impact-site-verification" content="f2fbe835-3c4c-4ce4-a5a1-42bfec9b31c0" />
        <title>yaneyuka</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/css/style.css" />
        <link rel="stylesheet" href="/css/swiper.css" />
        <link rel="icon" href="/image/ファビコンb.png" type="image/png" />
        <link rel="apple-touch-icon" href="/image/ファビコンb.png" />
        <link rel="shortcut icon" href="/image/ファビコンb.png" type="image/png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b3b3b" />
        <meta name="robots" content="index,follow" />
        <meta
          name="description"
          content="yaneyukaは、建築設計・施工・設備・メーカー・職人まで建設業界全体を支援する業務効率化ポータルサイト。CADデータや添景素材、建築計算ツール、My法規、タスク管理など実務の現場で役立つ機能を無料提供。"
        />
        <meta property="og:site_name" content="yaneyuka" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="yaneyuka | 建築・建設業界の業務支援ポータルサイト" />
        <meta
          property="og:description"
          content="建築・建設の現場で“本当に使える”業務支援プラットフォーム。CAD添景、建築計算ツール、My法規、タスク管理などを無料で提供。"
        />
        <meta property="og:image" content="/image/og-default.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <script
          id="ld-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'yaneyuka',
              url: 'https://yaneyuka.com/',
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: 'https://yaneyuka.com/news?q={search_term_string}'
                },
                'query-input': 'required name=search_term_string'
              }
            })
          }}
        />
        <script
          id="ld-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
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
                  availableLanguage: ['ja']
                }
              ]
            })
          }}
        />
      </head>
      <body className={inter.className}>
        {/* iOS Safari用デバッグ: エラーを画面に表示 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onerror = function(msg, url, line) {
                console.error('Error:', msg, 'at', url, ':', line);
                var div = document.createElement('div');
                div.style.position = 'fixed';
                div.style.top = '0';
                div.style.left = '0';
                div.style.background = 'red';
                div.style.color = 'white';
                div.style.padding = '20px';
                div.style.zIndex = '99999';
                div.style.fontSize = '12px';
                div.style.maxWidth = '100%';
                div.style.wordBreak = 'break-all';
                div.innerText = 'Error: ' + msg + '\\nLine: ' + line;
                document.body.appendChild(div);
              };
              window.addEventListener('unhandledrejection', function(e) {
                console.error('Unhandled rejection:', e.reason);
                var div = document.createElement('div');
                div.style.position = 'fixed';
                div.style.top = '0';
                div.style.left = '0';
                div.style.background = 'orange';
                div.style.color = 'white';
                div.style.padding = '20px';
                div.style.zIndex = '99999';
                div.style.fontSize = '12px';
                div.innerText = 'Promise Rejection: ' + (e.reason?.message || e.reason);
                document.body.appendChild(div);
              });
            `
          }}
        />
        <AuthProvider>
          <ChatNotificationListener />
          <TaskProvider>
            <NewsPrefetch />
            <MainLayout>
              {children}
            </MainLayout>
          </TaskProvider>
        </AuthProvider>
        <WorkMusic />
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