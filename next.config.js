// next-pwaが存在しない場合でもエラーにならないようにする
let withPWA;
try {
  withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    // 既存のFirebase Messaging Service Workerと競合しないように除外
    exclude: [
      /firebase-messaging-sw\.js$/,
      /firebase-messaging-sw\.js\.map$/,
    ],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1年
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30日
        },
      },
    },
    {
      urlPattern: /\/api\/news/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-news-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 5 * 60, // 5分
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /\/api\/events/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-events-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60, // 1時間
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1年
        },
      },
    },
    {
      urlPattern: /\/css\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'css-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1年
        },
      },
    },
  ],
  });
} catch (e) {
  console.warn('next-pwa not found, skipping PWA configuration:', e.message);
  withPWA = (config) => config;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  trailingSlash: true,
  // Next.js 16ではTurbopackがデフォルトだが、next-pwaはwebpackベースのためwebpackを使用
  turbopack: {}, // 空の設定でエラーを回避（実際には--webpackフラグでwebpackを使用）
  // 画像最適化: 環境変数で制御可能（デフォルトは無効化）
  // NEXT_PUBLIC_ENABLE_IMAGE_OPTIMIZATION=true で有効化
  images: {
    unoptimized: process.env.NEXT_PUBLIC_ENABLE_IMAGE_OPTIMIZATION !== 'true',
    // 有効化する場合の設定
    ...(process.env.NEXT_PUBLIC_ENABLE_IMAGE_OPTIMIZATION === 'true' && {
      formats: ['image/avif', 'image/webp'],
      deviceSizes: [640, 750, 828, 1080, 1200, 1920],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    }),
  },
  async headers() {
    return [
      {
        source: '/image/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // HostヘッダでのリダイレクトはNextのredirectsでは扱えないため、
      // ここではプレースホルダ。実際のリダイレクトはmiddlewareで実装。
    ];
  },
};

module.exports = withPWA(nextConfig);


